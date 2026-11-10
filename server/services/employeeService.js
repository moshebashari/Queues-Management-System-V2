const { Op } = require('sequelize');
const { Shift, Break, EmployeeConfigs, Appointment, User, sequelize } = require('../models');
const { generateSlotsPerDay, isJewishHolidayPerDate, getdifferenceSlots, convertDateAndHourToUtcDate } = require('../utils/utils');
const { DateTime } = require('luxon');


const findEndDate = async (employeeId) => {

    const endDate = await Appointment.findOne({
        where: {
            employeeId,
            // [Op.or]: [
            //     { status: 'available' },
            //     { status: 'pending' }
            // ]
        },
        raw: true,
        attributes: ['appointment_date_time'],
        order: [['appointment_date_time', 'DESC']]
    })

    console.log(endDate)
    return endDate.appointment_date_time
}

const generateSlotsForShiftChanges = async (businessId, employeeId, newShift) => {
    const employeeConfigs = await EmployeeConfigs.findOne({
        where: {
            employeeId
        },
        raw: true
    })

    // const oldShift = await Shift.findOne({
    //     where: {
    //         employeeId,
    //         dayOfWeek: newShift.dayOfWeek
    //     },
    //     raw: true
    // })

    const { effectiveDate } = newShift;

    console.log(employeeConfigs)
    if (!employeeConfigs) {
        throw new Error("employee configs doesn't found");
    }

    const startDate = effectiveDate ? new Date(effectiveDate) : new Date();
    const endDate = await findEndDate(employeeId);
    let current = DateTime.fromJSDate(startDate);
    console.log(current);
    const end = DateTime.fromJSDate(endDate);
    console.log(end)

    const newSlots = [];
    const dates = []
    const dayOfWeek = newShift.dayOfWeek === 0 ? 7 : newShift.dayOfWeek;
    while (current <= end) {
        if (current.setZone("Asia/Jerusalem").weekday !== dayOfWeek || isJewishHolidayPerDate(current.toUTC().toJSDate())) {
            // current.setDate(current.getDate() + 1);
            current = current.plus({ days: 1 })
            continue;
        }

        // const startTime = changeDefinitions && changeDefinitions['shift_start'].effectiveDate < current ? newShift.startTime : oldShift.startTime;
        // const endTime = changeDefinitions && changeDefinitions['shift_end'].effectiveDate < current ? newShift.endTime : oldShift.endTime

        // let breaks = [];
        // if (changeDefinitions){
        //     breaks = newShift.breaks.filter(b => {
        //         const targetDate = changeDefinitions[b.type].effectiveDate;
        //         if (!targetDate) return false;

        //         return targetDate <= current
        //     })
        // }
        const date = current.toISODate();
        dates.push(date);
        const slotsPerDay = generateSlotsPerDay(date, newShift.startTime, newShift.endTime, newShift.breaks, employeeConfigs.appointmentDuration, employeeId, businessId);
        newSlots.push(...slotsPerDay)
        // current.setDate(current.getDate() + 1);
        current = current.plus({ days: 1 })

    }

    const datesConditions = dates.map(date => {
        return {
            appointmentDateTime: {
                [Op.between]: [`${date} 00:00:00`, `${date} 23:59:59`]
            }
        }
    });

    const oldSlots = await Appointment.findAll({
        where: {
            employeeId,
            [Op.or]: datesConditions
        },
        raw: true,
        attributes: ['appointment_date_time', 'status', 'name', 'contact_phone', 'reminder_options'],
        order: [['appointment_date_time', 'ASC']]
    })

    // console.log(oldSlots)
    const { newSlotsDiff, oldSlotsDiff } = getdifferenceSlots(newSlots, oldSlots);
    const conflictsSlots = oldSlotsDiff.filter(slot => slot.status === 'booked');
    const oldSlotsDiffArr = oldSlotsDiff.map(slot => slot.appointment_date_time)


    // console.log("new",newSlotsDiff)
    // console.log("old",oldSlotsDiff)
    // console.log("conflicts", conflictsSlots)
    return { newSlotsDiff, oldSlotsDiffArr, conflictsSlots };
}

const checkShiftAndBreaksChanges = async (employeeId, newShift) => {
    const { dayOfWeek, startTime, endTime, breaks } = newShift;

    const shift = await Shift.findOne({
        where: { employeeId, dayOfWeek },
        include: [{ model: Break, as: 'break' }],
        order: [
            [{ model: Break, as: 'break' }, 'start_time', 'ASC']
        ]
    })

    if (!shift) throw new Error('לוח זמנים לא נמצא');

    // shift.startTime = startTime;
    // shift.endTime = endTime;

    // const isShiftChange = shift.changed('startTime') || shift.changed('endTime');

    const isShiftChange = shift.startTime !== startTime || shift.endTime !== endTime

    if (isShiftChange) return true;

    if (shift.break.length !== newShift.breaks.length) return true;

    const oldBreaksClean = shift.break.map(b => ({ startTime: b.startTime, endTime: b.endTime }));
    const isBreaksChange = JSON.stringify(oldBreaksClean) !== JSON.stringify(breaks);

    if (isBreaksChange) return true;

    // const ranges = [];
    // if (isShiftChange) {
    //     if (shift.startTime < startTime) {
    //         ranges.push({ type: 'shift_start', startTime: shift.startTime, endTime: startTime })
    //     }
    //     if (shift.endTime > endTime) {
    //         ranges.push({ type: 'shift_end', startTime: endTime, endTime: shift.endTime })
    //     }
    // }

    // if (isBreaksChange) {
    //     const modifiedBreaks = breaks.map((b, index) => (
    //         { ...b, type: `break_${index + 1}` }
    //     ))
    //     ranges.push(...modifiedBreaks)
    // }

    return false;

}

// const checkConflictsForShift = async (employeeId, utcRanges, options = {}) => {
//     if (!utcRanges || utcRanges.length === 0) return [];

//     //     let caseExpression = 'CASE ';
//     //   utcRanges.forEach((range) => {
//     //     caseExpression += `
//     //       WHEN appointment_date_time >= '${range.startTime}' AND appointment_date_time < '${range.endTime}' 
//     //       THEN '${range.type}'`;
//     //   });
//     //   caseExpression += ' END';

//     const { transaction } = options

//     const bookedAppointments = await Appointment.findAll({
//         where: {
//             employeeId,
//             status: 'booked',
//             [Op.or]: utcRanges.map(range => ({
//                 appointmentDateTime: {
//                     [Op.gte]: range.startTime,
//                     [Op.lt]: range.endTime
//                 }
//             }))
//         },
//         // כולל את פרטי הלקוח (שם, טלפון וכו') בשביל ה-Client
//         include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone_number'] }],
//         order: [['appointment_date_time', 'ASC']], // מסודר מהקרוב לרחוק
//         // group: [sequelize.literal(caseExpression)],
//         raw: true,
//         transaction
//     });

//     if (bookedAppointments.length === 0) {

//     }
//     //   console.log(bookedAppointments)
//     const appsSortByTypes = {};

//     for (let app of bookedAppointments) {
//         const date = app.appointmentDateTime;
//         const type = utcRanges.find(range => range.startTime <= date && range.endTime >= date).type;

//         if (!Object.hasOwn(appsSortByTypes, type)) {
//             appsSortByTypes[type] = [];
//         }

//         appsSortByTypes[type].push(app)
//     }

//     return appsSortByTypes;
// }

const changeShiftHoursAndAddOrRemoveApps = async (businessId, employeeId, newShift, firstTime = true, forceRemove = false) => {
    const t = await sequelize.transaction();

    try {
        const { newSlotsDiff, oldSlotsDiffArr, conflictsSlots } = await generateSlotsForShiftChanges(businessId, employeeId, newShift)

        console.log(conflictsSlots)

        if (firstTime && conflictsSlots.length > 0) {
            return { returnType: "conflict", message: "נמצאו תורים תפוסים בזמני השינוי", data: conflictsSlots }
        }

        const appointmentsNewSlots = newSlotsDiff.map(slot => ({
            businessId,
            employeeId,
            appointmentDateTime: slot,
            status: 'available'
        }))

        if (!forceRemove && conflictsSlots.length > 0) {
            const msgSuccess = true;

            if (!msgSuccess) {
                throw new Error("msgError");
            }
        }

        if (oldSlotsDiffArr.length > 0) {
            await Appointment.destroy({
                where: {
                    employeeId,
                    appointmentDateTime: {
                        [Op.in]: oldSlotsDiffArr
                    }
                },
                transaction: t
            })
        }

        if (appointmentsNewSlots.length > 0) {
            await Appointment.bulkCreate(appointmentsNewSlots, { transaction: t })
        }

        const effectiveDate = newShift.effectiveDate.split('T')[0];
        const todayDate = new Date().toISOString().split('T')[0];
        if (effectiveDate <= todayDate) {
            await changeShiftHoursOnTable(employeeId, newShift, {transaction: t})
        }

        await t.commit();
        return { returnType: "modifiedShift", message: "השינויים נקלטו בהצלחה", data: newShift }
    } catch (err) {
        await t.rollback()
        console.error('Failed to apply shift changes:', err);
        throw err
    }
}
const changeShiftHoursOnTable = async (employeeId, newShift, options = {}) => {

    const {transaction} = options;
    const shift = await Shift.findOne({
        where: {
            employeeId,
            dayOfWeek: newShift.dayOfWeek
        },
        transaction
    })

    const shiftUpdated = await shift.update({
        startTime: newShift.startTime,
        endTime: newShift.endTime
    }, { transaction })

    modifiedShift = shiftUpdated.toJSON();

    await Break.destroy({
        where: {
            employeeId,
            dayOfWeek: newShift.dayOfWeek,
            shiftId: modifiedShift.id
        },
        transaction
    })

    if (newShift.breaks.length > 0) {
        const breaks = newShift.breaks.map(b => ({
            ...b,
            shiftId: modifiedShift.id,
            employeeId,
            dayOfWeek: newShift.dayOfWeek
        }))

        await Break.bulkCreate(breaks, { transaction })
    }
}

module.exports = {
    checkShiftAndBreaksChanges,
    // checkConflictsForShift,
    findEndDate,
    changeShiftHoursAndAddOrRemoveApps,
    generateSlotsForShiftChanges
}