const e = require('express');
const { getEmployeesByBusinessId } = require('./DBFanctionsIVR');
const { isJewishHolidayPerDate, checkDistantAppWinPerDate } = require('./utils');
const moment = require('moment-timezone');
const { DateTime } = require('luxon');



function generateSlotsPerDay(date, startTime, endTime, intervalMinutes, employeeId, businessId) {

    const slots = [];

    // הגדרת תאריכי התחלה וסיום לפי שעות
    const current = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    while (current <= end) {
        // חילוץ שעות, דקות ושניות בפורמט דו-ספרתי
        const israelTimeString = current.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Jerusalem',
            hour12: false
        });
        // const hours = String(current.getHours()).padStart(2, '0');
        // const minutes = String(current.getMinutes()).padStart(2, '0');
        // const seconds = String(current.getSeconds()).padStart(2, '0');
        const israelDate = moment.tz(`${date} ${israelTimeString}`, "Asia/Jerusalem");
        const utcTime = israelDate.utc().format();
        slots.push({
            businessId: businessId,
            employeeId: employeeId,
            // appointment_date_time: `${date}T${hours}:${minutes}:${seconds}`,
            appointmentDateTime: utcTime,
            status: "available"
        });

        // קידום הזמן ב-X דקות
        current.setMinutes(current.getMinutes() + intervalMinutes);
    }
    return slots;
}

const newGenerateSlotsPerDay = (date, startTime, endTime, breaks, intervalMinutes, employeeId, businessId) => {
    const slots = [];

    const localStartTime = DateTime.fromISO(`${date}T${startTime}`, {
        zone: 'Asia/Jerusalem'
    });
    let current = localStartTime.toUTC().toJSDate();

    const localEndTime = DateTime.fromISO(`${date}T${endTime}`, {
        zone: 'Asia/Jerusalem'
    });
    const end = localEndTime.toUTC().toJSDate();

    let i = 0;
    while (current <= end) {
        if (current === breaks[i].startTime) {
            current = breaks[i].endTime;
            current.setMinutes(current.getMinutes() + intervalMinutes);
            i++;
            continue;
        }

        slots.push({
            businessId,
            employeeId,
            appointmentDateTime: current,
            status: 'available'
        })
    }

    return slots
}



const generateSlots = async (businessId) => {

    const empolyeesData = await getEmployeesByBusinessId(businessId, 0, true);
    // console.log(empolyeesData[0].shifts)
    const slots = [];


    for (let employee of empolyeesData) {
        const current = new Date(2026, 4, 17);
        const employeeId = employee.id;
        const businessId = employee.business_id;
        const intervalMinutes = employee.appointment_duration;

        const end = checkDistantAppWinPerDate(current, employee.booking_window);
        while (current <= end) {
            if (isJewishHolidayPerDate(current)) {
                current.setDate(current.getDate() + 1);
                continue;
            }
            const shifts = employee.shifts.filter(wh => wh.day_of_week === current.getDay());
            const date = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
            // console.log(date)
            for (let time of shifts) {
                const startTime = time.start_time;
                const endTime = time.end_time;
                const slotsPerDay = generateSlotsPerDay(date, startTime, endTime, intervalMinutes, employeeId, businessId);
                console.log(current.toLocaleDateString(), slotsPerDay);
                slots.push(...slotsPerDay);
            }
            current.setDate(current.getDate() + 1);
        }
    }
    return slots
};

module.exports = {
    generateSlots,
}