const { sequelize, BusinessShop, BusinessSettings, Employee, EmployeeConfigs, Shifts, Appointment } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { generate8DigitsNumber, formatToMySQLDateTime, convertToIsraelDate, allJewishHolidaysPerMonth, firstAndLastGergDateInHeMonth } = require('../utils/utils');
const moment = require('moment-timezone');

const homePage = async (req, res) => {
    try {
        const businesses = await BusinessShop.findAll({
            raw: true,
            attributes : ['uuid', 'id', 'name'],
            where : {
                id : {[Op.ne] : -1}
            }
        })

        console.log(businesses);
        if (businesses) res.send(businesses);
        else null

    }catch (err) {
        console.log(err);
    }
}

const businessHomePage = async (req, res) => {
    
    const {employeeId, year, month, hebrewDate = false} = req.body;

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

    res.send(allBlockedDate);
}

const dailyAppointmentsPage = async (req, res) => {
    console.log('test')
    const { businessId, date, userRole, currentUserId, canManageOthers = false } = req.body;
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
                            {employeeId: { [Op.ne]: currentUserId },},
                            {[Op.or] : status}
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
        res.send(appoinments);

    } catch (err) {
        console.log(err);
    }
}


module.exports = {
    homePage,
    businessHomePage,
    dailyAppointmentsPage
}
