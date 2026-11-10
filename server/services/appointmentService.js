const { sequelize, Appointment, EmployeeBlockage } = require('../models');
const { Op } = require('sequelize');
const { generate8DigitsNumber, generateSecureToken, mergeContinuousSlots } = require('../utils/utils');


const getAuthorizedAppointment = async ({ uuid, token, transaction, useLock = false, status = 'booked' }) => {
    if (!token) {
        const error = new Error('חסר מפתח גישה (Token)');
        error.statusCode = 401;
        throw error;
    }
    const queryOptions = {
        where: {
            uuid,
            accessToken: token,
            status
        },
        transaction
    }

    if (useLock && transaction) {
        queryOptions.lock = transaction.LOCK.UPDATE;
    }

    const appointment = await Appointment.findOne(queryOptions);

    if (!appointment) {
        const error = new Error('תור לא נמצא או שאינך מורשה לבצע שינויים');
        error.statusCode = 403;
        throw error;
    }

    return appointment;
}

const lockAppointment = async (bookingPhone = null, whereData) => {
    const whereDataAdd = {
        ...whereData,
        [Op.or]: [
            { status: "available" },
            {
                [Op.and]: [
                    { status: 'pending' },
                    sequelize.literal("DATE_ADD(updated_at, INTERVAL 5 MINUTE) <= NOW()")
                ]
            }]
    }

    updateData = { status: 'pending' };
    if (bookingPhone) {
        updateData.bookingPhone;
    }

    const t = await sequelize.transaction();
    try {
        const appointment = await Appointment.findOne({
            where: whereDataAdd,
            transaction: t,
            lock: t.LOCK.UPDATE
        })
        if (!appointment) {
            throw new Error('התור אינו זמין יותר');
        }

        let accessToken;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!isUnique && attempts < maxAttempts) {
            attempts++;
            accessToken = generateSecureToken();

            const existing = await Appointment.findOne({
                where: { accessToken: accessToken },
                transaction: t
            });

            if (!existing) {
                isUnique = true;
            }
        }

        if (!isUnique) {
            throw new Error('לא ניתן היה לחולל קוד ייחודי, נסה שוב');
        }
        const appointmentUpdate = await appointment.update({
            ...updateData,
            accessToken: accessToken,
        }, { transaction: t });

        await t.commit();
        return appointmentUpdate.toJSON()
    } catch (err) {
        await t.rollback();
        throw new Error(err.message);
    }

}

const bookAppointment = async (updateData, whereData) => {

    const t = await sequelize.transaction();
    try {
        // const options = { uuid: whereData.uuid, token: whereData.token, transaction: t, useLock: true, status: 'pending' }
        // const appointment = await getAuthorizedAppointment(options)
        const appointment = await Appointment.findOne({
            where: whereData,
            transaction: t,
            lock: t.LOCK.UPDATE
        })
        if (!appointment) {
            throw new Error('התור אינו זמין יותר');
        }

        let bookingCode;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!isUnique && attempts < maxAttempts) {
            attempts++;
            bookingCode = generate8DigitsNumber();

            const existing = await Appointment.findOne({
                where: {
                    businessId: appointment.businessId,
                    bookingCode: bookingCode,
                },
                transaction: t
            });

            if (!existing) {
                isUnique = true;
            }
        }

        if (!isUnique) {
            throw new Error('לא ניתן היה לחולל קוד ייחודי, נסה שוב');
        }
        const appointmentUpdate = await appointment.update({
            ...updateData,
            status: 'booked',
            bookingCode: bookingCode,
        }, { transaction: t });

        await t.commit();
        return appointmentUpdate.toJSON()
    } catch (err) {
        await t.rollback();
        throw new Error(err.message);
    }
}

const cancelAppointment = async (uuid, token) => {
    const t = await sequelize.transaction();

    try {
        const appointment = await getAuthorizedAppointment({ uuid, token, t })
        // const appointment = await Appointment.findOne({
        //     where: whereData,
        //     transaction: t,
        //     lock: t.LOCK.UPDATE
        // })
        appointmentUpdate = await appointment.update({ status: 'cancelled', accessToken: null }, { transaction: t });
        if (!appointmentUpdate) {
            throw new Error("There wasn't any row to cancel");
        }

        const newApp = {
            businessId: appointmentUpdate.businessId,
            employeeId: appointmentUpdate.employeeId,
            appointmentDateTime: appointmentUpdate.appointmentDateTime
        };

        const result = await createNewAppointment(newApp, t);
        await t.commit();
        return result;

    } catch (err) {
        await t.rollback();
        throw new Error(err.message);
    }


}

const updateDateAndEmployee = async (currentUuid, token, newAppWhereData) => {
    const t = await sequelize.transaction();

    try {

        const currentApp = await getAuthorizedAppointment({ uuid: currentUuid, token, transaction: t, useLock: true });
        const newApp = await Appointment.findOne({
            raw: true,
            where: {
                [Op.and]: [
                    newAppWhereData,
                    {
                        [Op.or]: [
                            { status: "available" },
                            {
                                [Op.and]: [
                                    { status: 'pending' },
                                    sequelize.literal("DATE_ADD(updated_at, INTERVAL 5 MINUTE) <= NOW()")
                                ]
                            }
                        ]
                    }
                ]
            },
            transaction: t,
            lock: t.LOCK.UPDATE
        })
        // const appointments = await Appointment.findAll({
        //     raw: true,
        //     where: {
        //         [Op.or]: [
        //             { uuid: currentUuid },
        //             {
        //                 [Op.and]: [
        //                     newAppWhereData,
        //                     {
        //                         [Op.or]: [
        //                             { status: "available" },
        //                             {
        //                                 [Op.and]: [
        //                                     { status: 'pending' },
        //                                     sequelize.literal("DATE_ADD(updated_at, INTERVAL 5 MINUTE) <= NOW()")
        //                                 ]
        //                             }
        //                         ]
        //                     }
        //                 ]
        //             }
        //         ]
        //     },
        //     transaction: t,
        //     lock: t.LOCK.UPDATE
        // })

        // if (appointments.length !== 2) {
        //     throw new Error("one of the appoinment or both didn't found");
        // }
        if (!newApp) {
            throw new Error("לא נמצא התור לעדכון");
        }

        const app1 = currentApp;
        const app2 = newApp;

        const date1str = app1.appointmentDateTime;
        const date2str = app2.appointmentDateTime;

        const emp1 = app1.employeeId;
        const emp2 = app2.employeeId;

        const tempFakeDate = new Date('3000-01-01T00:00:00.000Z');
        const tempFakeEmp = -1;

        await Appointment.update(
            { appointmentDateTime: tempFakeDate, employeeId: tempFakeEmp },
            { where: { uuid: app1.uuid }, transaction: t }
        );

        await Appointment.update(
            { appointmentDateTime: date1str, employeeId: emp1 },
            { where: { uuid: app2.uuid }, transaction: t }
        );

        await Appointment.update(
            { appointmentDateTime: date2str, employeeId: emp2 },
            { where: { uuid: app1.uuid }, transaction: t }
        );

        await t.commit();
        console.log('Appointment updated successfully');
        const newAppointment = await Appointment.findOne({
            where: { uuid: currentUuid },
            raw: true
        })

        return newAppointment ? newAppointment : null;
    } catch (err) {
        await t.rollback();
        console.error(err);
        throw err;
    }

}

const updateExtensions = async (uuid, token, updateData) => {
    const t = await sequelize.transaction();
    try {
        const appointment = await getAuthorizedAppointment({ uuid, token, transaction: t })
        await appointment.update(updateData, { transaction: t });

        await t.commit();
        return appointment;
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

const createNewAppointment = async (appointmentData, transaction) => {

    try {

        await Appointment.create({
            ...appointmentData,

        }, { transaction });

        console.log('Appointment created successfully')
        return true;
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            const failedIndex = err.errors[0]?.path;
            if (failedIndex === 'idx_employee_date_active') {
                console.error('The employee already booked on this date time');
                throw new Error('The employee already booked on this date time');
            }
            else {
                console.error('The employee already booked on this date time');
                throw new Error('The employee already booked on this date time');
            }
        } else {
            throw err;
        }
    }
}

const blockAppointments = async (employeeId, reason, data) => {

    const mergedSlots = mergeContinuousSlots(data);

    // console.log(mergedSlots)
    let blockagesToInsert = mergedSlots.map(slot => (
        {
            userId: employeeId,
            startTime: new Date(slot.startTime),
            endTime: new Date(slot.endTime),
            reason
        }
    ))

    const t = await sequelize.transaction();

    try {
        await EmployeeBlockage.bulkCreate(blockagesToInsert, { transaction: t })

        const whereConditions = blockagesToInsert.map(block => ({
            appointmentDateTime: {
                [Op.gte]: block.startTime, // גדול או שווה לזמן תחילת החסימה
                [Op.lt]: block.endTime     // קטן מזמן סיום החסימה
            }
        }));

        const blockedApp = await Appointment.update(
            { status: 'blocked' },
            {
                where: {
                    employeeId,
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { status: 'available' },
                                { status: 'pending' }
                            ]
                        },
                        {
                            [Op.or]: whereConditions
                        }
                    ]
                },
                transaction: t
            }
        );

        await t.commit();
        return blockedApp;
    } catch (err) {
        await t.rollback();
        throw new Error(err.message);
    }

    // const whereClause = {
    //     employeeId,
    //     [Op.or]: [
    //         { status: "available" },
    //         { status: 'pending' }
    //     ]
    // }
    // if (method === 'fromTo') {
    //     whereClause.appointmentDateTime = {
    //         [Op.between]: appointments
    //     }
    // }
    // else if (method === 'selected') {
    //     whereClause.appointmentDateTime = {
    //         [Op.in]: appointments
    //     }
    // }
    // else {
    //     throw new Error("method has to be 'fromTo' or 'selected.");
    // }

    // try {
    //     const blockedApp = await Appointment.update(
    //         { status: 'blocked' },
    //         {
    //             where: whereClause,
    //         }
    //     )

    //     return blockedApp;
    // } catch (err) {
    //     throw new Error('שגיאת שרת פנימית');
    // }
}

module.exports = {
    lockAppointment,
    bookAppointment,
    cancelAppointment,
    updateDateAndEmployee,
    updateExtensions,
    blockAppointments
}