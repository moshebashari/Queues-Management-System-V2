const { sequelize, BusinessShop, BusinessSettings, Employee, EmployeeConfigs, Shifts, Appointment, User } = require('../models');
const { Op } = require('sequelize');
const { generate8DigitsNumber, formatToMySQLDateTime, convertToIsraelDate, generateSecureToken } = require('./utils');
const { includes, transform, update } = require('lodash');
const bcrypt = require('bcrypt');



const signUpFunc = async ({ businessId, fullName, userName, phoneNumber, password, role }) => {
    try {
        const user = await User.create({
            businessId,
            fullName,
            userName,
            phoneNumber,
            password,
            role
        })
        return user;
    } catch (err) {
        throw new Error(err.message);
    }
}

const loginFunc = async (businessId, identification, password) => {


    const user = await User.scope('withPassword').findOne({
        raw: true,
        where: {
            businessId,
            [Op.or]: [
                { userName: identification },
                { phoneNumber: identification }
            ]
        }
    })

    if (!user) {
        const error = new Error("שם משתמש או סיסמה שגויים")
        error.statusCode = 401;
        throw error
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = new Error("שם משתמש או סיסמה שגויים")
        error.statusCode = 401;
        throw error
    }

    return { id: user.id, userName: user.userName, fullName: user.fullName, role: user.role };
}

const getBusinessByUUID = async (uuid) => {
    try {
        const businessId = await BusinessShop.findOne({
            raw: true,
            where: { uuid },
            attributes: ['id']
        })
        return businessId.id;
    } catch (err) {
        throw new Error(err.message);
    }
}

const getBusinessByEmployeeId = async (employeeId) => {
    try {
        const businessId = await Employee.findOne({
            raw: true,
            where: { id: employeeId },
            attributes: ['business_id']
        })
        return businessId ? businessId.business_id : null;
    } catch (err) {
        throw new Error(err.message);
    }
}

const getBusinessDataByPhoneNum = async (phoneNum) => {

    const businessData = await BusinessShop.findAll({
        nest: false,
        attributes: ['id', 'name',
            [sequelize.col('businessSettings.reminder_time'), 'reminderTime'],
            [sequelize.col('businessSettings.notifiction_channel'), 'notifictionChannel'],
        ],
        where: {
            [Op.or]: [
                { whatsappPhone: phoneNum },
                { ivrPhone: phoneNum }
            ]
        },
        include: [
            { model: BusinessSettings, as: 'businessSettings', attributes: [] },
            {
                model: Employee, as: 'employee', attributes: ['id', 'name', 'employee_code',
                    [sequelize.literal('`employee->employeeConfigs`.`booking_window`'), 'booking_window'],
                ],
                include: [{ model: EmployeeConfigs, as: 'employeeConfigs', attributes: [] }]
            }
        ],
        order: [
            [{ model: Employee, as: 'employee' }, 'id', 'ASC']
        ]
    })

    if (businessData && businessData[0]) {
        const business = businessData[0].toJSON();

        business.employee = business.employee.map(e => {
            return {
                ...e,
                employee_code: String(e.employee_code).padStart(2, '0')
            }
        })

        return business;
    }
    // console.log(businessData)
    return null
}

const getEmployeesByBusinessId = async (businessId, employeeId, date = null) => {
    const whereClause = { businessId: businessId };
    let shiftsInclude = [{ model: EmployeeConfigs, as: 'employeeConfigs', attributes: [] }]
    if (employeeId !== 0) {
        whereClause.id = employeeId;
    }

    if (date) {
        shiftsInclude.push({
            model: Shifts,
            as: 'shifts',
            attributes: ['day_of_week', 'start_time', 'end_time'],
            order: [['start_time', 'ASC']]
        });
    }
    let allEmployees = null
    try {
        allEmployees = await Employee.findAll({
            // raw: true,
            nest: false,
            attributes: ['id', 'business_id',
                [sequelize.col('employeeConfigs.appointment_duration'), 'appointment_duration'],
                [sequelize.col('employeeConfigs.booking_window'), 'booking_window'],
            ],
            where: whereClause,
            include: shiftsInclude,
            order: [['id', 'ASC']]
        })
    } catch (err) {
        console.log(err.message);
    }
    const employeesData = allEmployees.map(e => {
        const emp = e.toJSON();
        // emp.employeeCode = String(emp.employeeCode).padStart(2, '0');

        return emp;
    });

    // console.log(employeesData)
    return employeesData;
}

const getShiftsByDay = async (date, businessId, employeeId) => {
    try {
        const allShifts = await Shifts.findAll({
            raw: true,
            nest: false,
            where: {
                businessId,
                employeeId,
                dayOfWeek: date.getDay()
            },
            order: [
                ['start_time', 'ASC']
            ]
        })

        const shiftsData = allShifts.map(wh => wh.toJSON())
        return shiftsData;

    } catch (err) {
        console.log(err.message);
    }
}

const getAppointments = async (date, businessId, employeeId, hour = null) => {

    const startOfDay = new Date(date);
    const endOfDay = new Date(date);

    let startHour = 0;
    let endHour = 23;
    let startMinute = 0;
    let endMinute = 59;
    if (hour && hour.length === 2) {
        startHour = hour;
        endHour = hour;
    }
    else if (hour && hour.length > 2) {
        const [h, m, s] = hour.split(':');
        startHour = h;
        endHour = h;
        startMinute = m;
        endMinute = m;
    }
    startOfDay.setHours(startHour, startMinute, 0, 0);
    endOfDay.setHours(endHour, endMinute, 59, 999);

    const whereClause = {
        businessId, appointmentDateTime: {
            [Op.between]: [startOfDay, endOfDay]
        },
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

    employeeId !== 0 ? whereClause.employeeId = employeeId : null;
    try {
        const allAppointments = await Appointment.findAll({
            raw: true,
            attributes: [
                // 'employee_id',
                // [sequelize.fn('TIME', sequelize.col('appointment_date_time')), 'appointment_time']
                // [sequelize.fn('GROUP_CONCAT', sequelize.col('employee_id')), 'emps'],
                'appointment_date_time',
                [sequelize.literal("GROUP_CONCAT(employee_id ORDER BY employee_id ASC)"), 'emps'],
            ],
            where: whereClause,
            group: ['appointment_date_time'],
            order: [['appointment_date_time', 'ASC']]
        })

        const AppointmentData = allAppointments.map(app => {
            const rawDate = app.appointment_date_time;
            const israelTimeString = new Date(rawDate).toLocaleTimeString('en-GB', {
                timeZone: 'Asia/Jerusalem',
                hour12: false
            });
            const arrEmps = app.emps ? app.emps.split(',').map(Number) : []
            return {
                // ...appJson,
                hour: israelTimeString,
                emps: arrEmps
            }
        });
        return AppointmentData;

    } catch (err) {
        console.log(err.message);
    }
}

const getClosestAppointment = async (businessId, employeeId) => {
    const whereClause = {
        businessId, [Op.or]: [
            { status: "available" },
            {
                [Op.and]: [
                    { status: 'pending' },
                    sequelize.literal("DATE_ADD(updated_at, INTERVAL 5 MINUTE) <= NOW()")
                ]
            }
        ]
    };
    if (employeeId != 0) {
        whereClause.employeeId = employeeId;
    }

    try {
        const appointment = await Appointment.findOne({
            where: whereClause,
            order: [['appointment_date_time', 'ASC']]
        })

        if (appointment) {
            const appointmentJSON = appointment.toJSON();
            const hour = new Date(appointmentJSON.appointmentDateTime).toLocaleTimeString('en-GB', {
                timeZone: 'Asia/Jerusalem',
                hour12: false
            });
            // const date = new Date(appointmentJSON.appointmentDateTime).toLocaleDateString('he-IL');
            const date = convertToIsraelDate(appointmentJSON.appointmentDateTime);
            return { ...appointmentJSON, date, hour };
        }
        return null;

    } catch (err) {
        console.log(err);
        return null;
    }
}

const createNewEmployee = async (employeeData, shifts, employeeConfigs) => {
    try {
        const result = await sequelize.transaction(async (t) => {

            const employee = await Employee.create(employeeData, { transaction: t });

            employeeConfigs.employeeId = employee.id;
            const configs = await EmployeeConfigs.create(employeeConfigs, { transaction: t });

            shifts.forEach(element => {
                element.employeeId = employee.id;
            });

            const wh = await Shifts.bulkCreate(shifts, { transaction: t });

            return { employee, configs, wh }

        })

        console.log('Employee create successfully.')
        return result;
    } catch (err) {
        console.log(err);
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
        const options = { uuid: whereData.uuid, token: whereData.token, transaction: t, useLock: true, status: 'pending' }
        const appointment = await getAuthorizedAppointment(options)
        // const appointment = await Appointment.findOne({
        //     where: whereData,
        //     transaction: t,
        //     lock: t.LOCK.UPDATE
        // })
        // if (!appointment) {
        //     throw new Error('התור אינו זמין יותר');
        // }

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

const updateAppointment = async (updateData, whereData, mode = 'update', hasBookingCode = true) => {
    // יש לוודא ש-sequelize מיובא או נגיש (למשל מתוך המודל Appointment.sequelize)
    const sequelizeInstance = Appointment.sequelize;
    const whereDataAdd = {
        ...whereData, [Op.or]: [
            { status: "available" },
            {
                status: 'pending'
                // [Op.and]: [
                //     { status: 'pending' },
                //     sequelize.literal("DATE_ADD(updated_at, INTERVAL 5 MINUTE) <= NOW()")
                // ]
            }]
    }
    const t = await sequelize.transaction();

    let result = null;
    try {
        const appointment = await Appointment.findOne({
            where: whereDataAdd,
            transaction: t,
            lock: t.LOCK.UPDATE
        })
        if (appointment) {
            let inserted = false;
            let attempts = 0;
            const maxAttempts = 5;
            let appointmentUpdate = null;
            while (!inserted && attempts < maxAttempts) {
                attempts++;
                if (!hasBookingCode) updateData.bookingCode = generate8DigitsNumber();
                appointmentUpdate = await appointment.update(updateData, { transaction: t });
                inserted = true;
            }
            if (appointmentUpdate && mode === 'update') result = appointmentUpdate.toJSON();
            else if (appointmentUpdate && mode === 'cancel') {
                const newApp = {
                    businessId: appointmentUpdate.businessId,
                    employeeId: appointmentUpdate.employeeId,
                    appointmentDateTime: appointmentUpdate.appointmentDateTime
                };
                result = await createNewAppointment(newApp);
            }

            await t.commit();
            return result;
        }
        else {
            console.log("There wasn't any row to upadte");
            return null;
        }

    } catch (err) {
        await t.rollback();
        console.log(err)
    }
}

const updateAppointmentDateTime = async (appoinment, newDate) => {
    const t = await sequelize.transaction();

    const businessId = appoinment.businessId;
    const employeeId = appoinment.empolyeeId;
    const uuid = appoinment.uuid;

    try {
        const appointments = await Appointment.findAll({
            where: {
                // appointmentDateTime: { [Op.in]: [currentDate, newDate] },
                [Op.or]: [
                    { uuid },
                    {
                        [Op.and]: [
                            { businessId },
                            { employeeId },
                            { appointmentDateTime: newDate },
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
                    }
                ]
            },
            transaction: t,
            lock: t.LOCK.UPDATE
        })

        if (appointments.length !== 2) {
            throw new Error("one of the appoinment or both didn't found");
        }


        const app1 = appointments[0];
        const app2 = appointments[1];

        const date1str = app1.appointmentDateTime;
        const date2str = app2.appointmentDateTime;

        const tempFakeDate = new Date('3000-01-01T00:00:00.000Z');

        await Appointment.update(
            { appointmentDateTime: tempFakeDate },
            { where: { uuid: app1.uuid }, transaction: t }
        );

        await Appointment.update(
            { appointmentDateTime: date1str },
            { where: { uuid: app2.uuid }, transaction: t }
        );

        await Appointment.update(
            { appointmentDateTime: date2str },
            { where: { uuid: app1.uuid }, transaction: t }
        );

        await t.commit();
        console.log('Appointment updated successfully');
        return true;
    } catch (err) {
        await t.rollback();
        console.error(err);
        throw err;
    }
}

const updateAppointmentEmployee = async (appoinment, newEmployee) => {
    const t = await sequelize.transaction();

    const businessId = appoinment.businessId;
    const appointmentDateTime = appoinment.appointmentDateTime;
    const uuid = appoinment.uuid;
    try {
        const appointments = await Appointment.findAll({
            raw: true,
            where: {
                [Op.or]: [
                    { uuid },
                    {
                        [Op.and]: [
                            { businessId },
                            { appointmentDateTime },
                            { employeeId: newEmployee },
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
                    }
                ],
            },
            transaction: t,
            lock: t.LOCK.UPDATE
        })

        if (appointments.length !== 2) {
            if (appointments.length === 1 && appointments[0].bookingCode !== null) {
                console.log('The appointment was taken by someone else.');
                return false;
            }
            throw new Error("one of the appoinment or both didn't found");
        }


        const app1 = appointments[0];
        const app2 = appointments[1];

        const emp1 = app1.employeeId;
        const emp2 = app2.employeeId;

        const tempFakeEmp = -1;

        await Appointment.update(
            { employeeId: tempFakeEmp },
            { where: { uuid: app1.uuid }, transaction: t }
        );

        await Appointment.update(
            { employeeId: emp1 },
            { where: { uuid: app2.uuid }, transaction: t }
        );

        await Appointment.update(
            { employeeId: emp2 },
            { where: { uuid: app1.uuid }, transaction: t }
        );

        await t.commit();
        console.log('Appointment updated successfully');
        return true;
    } catch (err) {
        await t.rollback();
        console.error(err);
        throw err;
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

const accessAppointmentByBookingCode = async (businessId, bookingCode) => {
    try {
        const appointment = await Appointment.findOne({
            where: {
                [Op.and]: [
                    { businessId },
                    { bookingCode },
                    { status: 'booked' }
                ]
            }
        })

        if (appointment) {
            const appointmentJSON = appointment.toJSON();
            const hour = new Date(appointmentJSON.appointmentDateTime).toLocaleTimeString('en-GB', {
                timeZone: 'Asia/Jerusalem',
                hour12: false
            });
            // const date = new Date(appointmentJSON.appointmentDateTime).toLocaleDateString('he-IL');
            const date = convertToIsraelDate(appointmentJSON.appointmentDateTime);
            // console.log(appointmentDateTime.toISOString())
            return { ...appointmentJSON, date, hour };
        }
        else return null;

    } catch (err) {
        console.log(err);
    }
}

const getEmployeesSameAppoinment = async (businessId, date) => {
    try {
        const employees = await Appointment.findOne({
            raw: true,
            attributes: [[sequelize.literal("GROUP_CONCAT(employee_id ORDER BY employee_id ASC)"), 'emps']],
            where: {
                businessId,
                appointmentDateTime: date,
                status: 'available'
            }
        })

        return employees && employees.emps ? employees.emps.split(',').map(Number) : [];
    } catch (err) {
        console.log(err.message);
        return null;
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


module.exports = {
    signUpFunc,
    loginFunc,
    getBusinessByUUID,
    getBusinessByEmployeeId,
    getBusinessDataByPhoneNum,
    getEmployeesByBusinessId,
    getShiftsByDay,
    getAppointments,
    getClosestAppointment,
    createNewEmployee,
    createNewAppointment,
    lockAppointment,
    bookAppointment,
    cancelAppointment,
    updateAppointment,
    updateAppointmentDateTime,
    updateAppointmentEmployee,
    updateDateAndEmployee,
    updateExtensions,
    accessAppointmentByBookingCode,
    getEmployeesSameAppoinment
}