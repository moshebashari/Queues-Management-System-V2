const { sequelize, BusinessShop, BusinessSettings, Employee, EmployeeConfigs, Shifts, Appointment } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { generate8DigitsNumber, formatToMySQLDateTime, convertToIsraelDate, allJewishHolidaysPerMonth, firstAndLastGergDateInHeMonth } = require('./utils');
const moment = require('moment-timezone');




const getAllBusinessUUIDAndNames = async () => {
    try {
        const businesses = await BusinessShop.findAll({
            raw: true,
            attributes: ['uuid', 'id', 'name'],
            where: {
                id: { [Op.ne]: -1 }
            }
        })

        console.log(businesses);
        return businesses ? businesses : null

    } catch (err) {
        console.log(err);
    }
}

const getNoAvaliablesDaysOfMonth = async (employeeId, year, month, hebrewDate = false) => {

    const holidayDates = allJewishHolidaysPerMonth(year, month, hebrewDate);
    const holidayDatesArr = holidayDates.map(row => {
        return { ...row, status: 'holiday' };
    })

    let fullDates = null;

    let firstDate = '';
    let lastDate = '';

    if (hebrewDate) {
        const dates = firstAndLastGergDateInHeMonth(year, month);
        firstDate = `${dates.firstDate} 00:00:00`;
        lastDate = `${dates.lastDate} 23:59:59`;
    }
    else {
        const monthStr = `${month}`.padStart(2, '0');
        firstDate = `${year}-${monthStr}-01 00:00:00`;
        lastDate = `${year}-${monthStr}-31 23:59:59`;
    }

    const whereClause = { appointmentDateTime: { [Op.between]: [firstDate, lastDate] } };
    if (employeeId !== 0) {
        whereClause.employeeId = employeeId;
    }

    try {
        fullDates = await Appointment.findAll({
            raw: true,
            attributes: [
                [fn('DATE', col('appointment_date_time')), 'date']
            ],
            where: whereClause,
            group: [fn('DATE', col('appointment_date_time'))],
            having: literal(`COUNT( CASE  WHEN status = 'available' THEN 1 
                                WHEN status = 'pending' AND DATE_ADD(updated_at, INTERVAL 5 MINUTE) <= NOW() THEN 1 END ) = 0 
                            AND COUNT(*) > 0 `),
            order: [[col('date'), 'ASC']]
        })

    } catch (err) {
        console.log(err);
    }

    const fullDatesArr = fullDates.map(row => {
        return { date: row.date, status: 'full' };
    })

    const allBlockedDate = [...holidayDatesArr, ...fullDatesArr].sort((a, b) => a.date.localeCompare(b.date));;

    console.log(allBlockedDate)

}

const getDailyAppointments = async ({ businessId, date, userRole, currentUserId, canManageOthers = false }) => {
    // 1. הגדרת תחילת היום (00:00:00) לפי שעון ישראל והמרה ל-UTC
    const startOfDay = moment.tz(date, 'YYYY-MM-DD', 'Asia/Jerusalem').startOf('day').utc().toDate();
    // 2. הגדרת סוף היום (23:59:59.999) לפי שעון ישראל והמרה ל-UTC
    const endOfDay = moment.tz(date, 'YYYY-MM-DD', 'Asia/Jerusalem').endOf('day').utc().toDate();

    const whereClause = {
        businessId, appointmentDateTime: {
            [Op.between]: [startOfDay, endOfDay]
        },
    }

    const status = [
        { status: "available" },
        {
            [Op.and]: [
                { status: 'pending' },
                sequelize.literal("DATE_ADD(updated_at, INTERVAL 5 MINUTE) <= NOW()")
            ]
        }
    ]


    if (userRole === 'client') {
        whereClause[Op.or] = status;
    }
    else if (userRole === 'employee' && !canManageOthers) {
        whereClause[Op.or] = [
            { employeeId: currentUserId }, // כל התורים שלו (תפוסים + פנויים)
            {
                [Op.and]: [
                    { employeeId: { [Op.ne]: currentUserId }, },
                    { [Op.or]: status }
                ]

            }
        ]
    }

    try {
        const appoinments = await Appointment.findAll({
            raw: true,
            where: whereClause,
            order: [['appointment_date_time', 'ASC']]
        })

        console.log(appoinments.length);
        return appoinments;

    } catch (err) {
        console.log(err);
    }
}

const upadteDateAndEmployee = async (currentAppointment, newAppointment) => {
    const t = await sequelize.transaction();

    try {
        const appointments = await Appointment.findAll({
            raw: true,
            where: {
                [Op.or]: [
                    { uuid: currentAppointment.uuid },
                    {
                        [Op.and]: [
                            { uuid: newAppointment.uuid },
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
        return true;
    } catch (err) {
        await t.rollback();
        console.error(err);
        throw err;
    }

}
module.exports = {
    getAllBusinessUUIDAndNames,
    getNoAvaliablesDaysOfMonth,
    getDailyAppointments
}