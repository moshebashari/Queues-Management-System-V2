const axios = require('axios');
const { template } = require('lodash');
const { HDate, HebrewCalendar, Location, flags } = require('@hebcal/core');
const path = require('path'); // מודול מובנה לניהול נתיבים
const player = require('node-wav-player');
const audioFolderPath = path.join(__dirname, '../..', 'audio_files');
let currentIndex = 0;
let isPlaying = false;
let resolvePlaylistPromise = null;

const processSomeInputs = (input, session, socket, selectEmp, wrong_choice, actionProcessInput) => {
    if (input === '7') {
        session.step = 'ENTER_HOUR';
        actionProcessInput(socket, session);
        return;
    }
    else if (input === '8') {
        session.step = 'CHOOSE_TYPE_DAY';
        actionProcessInput(socket, session);
        return;
    }
    else if (input === '9' && selectEmp) {
        session.step = 'CHOOSE_EMP_OR_ALL_EMP';
        actionProcessInput(socket, session);
        return;
    }
    else if (input) {
        messageReturnMenu(socket, session, wrong_choice, actionProcessInput)
        return;
    }
}

function formatToMySQLDateTime(dateInput) {
    const d = new Date(dateInput);
    return d.toISOString().slice(0, 19).replace('T', ' ');
}

function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        if (arr[mid] === target) {
            return mid; // האיבר נמצא, מחזיר את האינדקס
        }

        if (arr[mid] < target) {
            left = mid + 1; // מחפש בחצי הימני
        } else {
            right = mid - 1; // מחפש בחצי השמאלי
        }
    }

    return left; // האיבר לא נמצא במערך
}

const playPlaylist = async (files) => {
    if (isPlaying) return;
    isPlaying = true;
    for (let file of files) {
        if (!isPlaying) break;
        if (file === 'minute_00.wav') continue;
        try {
            const filePath = path.join(audioFolderPath, file);
            await player.play({ path: filePath, sync: true })
            .then()
            .catch((error) => { console.error(`שגיאה בנגינת הקובץ ${filePath}:`, error); });
        } catch (err) {
            console.error(`שגיאה בנגינת הקובץ ${file}:`, err);
        }
    }
    isPlaying = false;
}

function stopPlaylist() {
  if (isPlaying) {
    player.stop(); // משתיק את הסאונד במערכת ההפעלה
    isPlaying = false;
  }
}

const messageReturnMenu = (socket, session, msg, callBack, duration = 1000) => {
    socket.emit('play_audio', `${msg}`);
    setTimeout(() => {
        callBack(socket, session)
    }, duration);
}


const sendMsgBack = async (contact, msg) => {
    if (msg.type !== 'text') {
        return null
    }
    const resposne = await axios({
        url: `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
        method: 'post',
        headers: {
            'Authorization': `Bearer: ${process.env.WA_ACCESS_TOKEN}`,
            "Content-Type": 'application/json'
        },
        data: JSON.stringify({
            messaging_product: 'whatsapp',
            to: `${contact['wa_id']}`,
            type: 'text',
            text: {
                body: `${msg.text.body} ${contact.profile.name}.`
            }
        })
    })
    return resposne
}

function fixHebrew(text) {
    return text.split('').reverse().join('');
}

const allJewishHolidays = () => {
    const options = {
        year: 2026,
        isHebrewYear: false,
        location: Location.lookup('Jerusalem'), // קובע שזה לפי לוח ישראל
        il: true, // מציין שאנחנו בישראל (חשוב מאוד לימי חופשה!)
    };

    const events = HebrewCalendar.calendar(options);
    console.log("ימי שבתון וחגים רשמיים בהם לא עובדים:");
    events.forEach(ev => {
        const mask = ev.getFlags();
        const isChag = mask & flags.CHAG;             // יום טוב (שבתון דתי)
        const isCholHaMoed = mask & flags.CHOL_HAMOED; // חול המועד
        const isModern = mask & flags.MODERN_HOLIDAY;  // חגים לאומיים (עצמאות)

        // סינון: רק יום טוב, חול המועד, או יום העצמאות
        if (isChag || isCholHaMoed || (isModern && ev.getDesc() === "Yom HaAtzma'ut")) {

            // מניעת כפילויות של "ערב חג" (אנחנו רוצים את החג עצמו)
            if (mask & flags.EREV) return;

            const name = ev.render('he');
            const date = ev.getDate().greg().toLocaleDateString('he-IL');
            console.log(`${date} : ${fixHebrew(name)}`);
        }
    });
}


const convertStrDateToDate = (origStrDate, dateInput = false) => {
    let strDate = origStrDate;
    // remove * from the start and the end if exists.
    // if (strDate[0] === '*') strDate = strDate.slice(1);
    // if (strDate[strDate.length - 1] === '*') strDate = strDate.slice(0, -1);

    if (!dateInput) {
        const weekDay = Number(origStrDate);
        if (weekDay < 1 || weekDay > 7) return 'Invalid date format';
        const currentDate = new Date();
        const currentDay = currentDate.getDay() + 1;
        const daysDiff = weekDay >= currentDay ? weekDay - currentDay : 7 - currentDay + weekDay;

        return new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + daysDiff);
    }

    const dateNum = strDate.split('*');
    if (dateInput && dateNum.length === 1) return 'Invalid date format';
    // if entered week day          1     4   
    // if (!dateInput && dateNum.length === 1) {
    //     const weekDay = Number(dateNum[0]);
    //     if (weekDay < 1 || weekDay > 7) return 'Invalid date format';
    //     const currentDate = new Date();
    //     const currentDay = currentDate.getDay() + 1;
    //     const daysDiff = weekDay >= currentDay ? weekDay - currentDay : 7 - currentDay + weekDay;

    //     return new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + daysDiff);
    // }

    // if entered date
    if (dateNum.length !== 2) return 'Invalid date format';
    const day = Number(dateNum[0]);
    const month = Number(dateNum[1]);

    if (month < 1 || month > 12) return 'Invalid month';
    const currentDate = new Date();
    let year = currentDate.getFullYear();
    // appointment to next year
    // if (currentDate.getMonth() + 1 > month) year++;
    const date = new Date(year, month - 1, day);
    // check valid day
    if (date.getDate() !== day) return 'Invalid day';

    return date;
}

const checkEmployeesAppointmentWindow = (date, employees) => {

    const avaliableEmployees = [];

    for (let employee of employees) {
        const appWin = employee.booking_window;
        const currentDate = new Date();

        const year = appWin.unit === 'year' ? currentDate.getFullYear() + appWin.amount : currentDate.getFullYear();
        const month = appWin.unit === 'month' ? currentDate.getMonth() + appWin.amount : currentDate.getMonth();
        const day = appWin.unit === 'day' ? currentDate.getDate() + appWin.amount : currentDate.getDate();

        const appWinDate = new Date(year, month, day);

        if (date <= appWinDate) avaliableEmployees.push(employee);
    }

    return avaliableEmployees;
}

const checkdistantAppointmentWindow = (date, employees) => {
    const currentDate = new Date();
    let distantDate = null;

    for (let employee of employees) {
        const appWin = employee.booking_window;

        const year = appWin.unit === 'year' ? currentDate.getFullYear() + appWin.amount : currentDate.getFullYear();
        const month = appWin.unit === 'month' ? currentDate.getMonth() + appWin.amount : currentDate.getMonth();
        const day = appWin.unit === 'day' ? currentDate.getDate() + appWin.amount : currentDate.getDate();

        const appWinDate = new Date(year, month, day);
        if (date > appWinDate && (distantDate === null || distantDate < appWinDate)) distantDate = appWinDate;
    }

    return distantDate;
}

const checkDateForRestDay = (date) => {
    const hdate = new HDate(date);

    // שבת
    if (hdate.getDay() === 6) return 'shabat';

    const events = HebrewCalendar.calendar({
        start: hdate,
        end: hdate,
        il: true
    });

    for (const ev of events) {
        const mask = ev.getFlags();

        if (mask & flags.CHAG) return 'chag';
        if (mask & flags.CHOL_HAMOED) return 'chol_hamoed';
        // ערב חג
        if (mask & flags.LIGHT_CANDLES) return 'light_candles';
        if (ev.getDesc() === "Yom HaAtzma'ut") return 'yom_haatsmaut';

    }

    return false;
}

const allAvaliableApponintments = (allOptions, appointments) => {
    if (allOptions.length < appointments.length) {
        throw new Error("Something wrong - allOptions array can't be shorter than appointments array.")
    }
    if (appointments.length === 0) return allOptions;
    const appFormated = appointments.map(app => `${app.appointment_date_time}-${app.employee_id}`)
    // console.log(appFormated)
    let i = 0;
    let j = 0;
    const avaApps = [];

    // while (i < allOptions.length) {
    //     if (allOptions[i] === appFormated[j]) j++;
    //     else avaApps.push(allOptions[i]);
    //     i++;
    // }

    let count = 0
    while (i < allOptions.length) {
        if (allOptions[i] === appFormated[j]) j++;
        else {
            const hourData = allOptions[i].split('-');
            if (avaApps[count] && hourData[0] === avaApps[count].hour) {
                avaApps[count].emps.push(hourData[1]);
            }
            else if (avaApps[count] && hourData[0] !== avaApps[count].hour) {
                count++;
                avaApps.push({ hour: hourData[0], emps: [hourData[1]] })
            }
            else {
                avaApps.push({ hour: hourData[0], emps: [hourData[1]] })
            }
        };
        i++;
    }


    // const avaAppsFormated = []
    // let count = 0
    // for (let i = 0; i < avaApps.length; i++) {
    //     const hourData = avaApps[i].split('-');
    //     avaAppsFormated.push({ hour: hourData[0], emps: [hourData[1]] })
    //     i++;
    //     for (i; i < avaApps.length; i++) {
    //         const hourData2 = avaApps[i].split('-');
    //         if (hourData2[0] === hourData[0]) {
    //             avaAppsFormated[count].emps.push(hourData2[1]);
    //         }
    //         else {
    //             count++;
    //             break;
    //         }
    //     }
    // }
    return avaApps;
}

const allAvaliableApponintments2 = (appointments) => {
    // const appFormated = appointments.map(app => `${app.appointment_date_time}-${app.employee_id}`)

    const avaApps = [];
    let i = 0;
    let count = 0;
    while (i < appointments.length) {
        if (avaApps[count] && avaApps[count].hour === appointments[i].appointment_date_time) {
            avaApps[count].emps.push(appointments[i].employee_id);
        }
        else if (avaApps[count] && avaApps[count].hour !== appointments[i].appointment_date_time) {
            count++;
            avaApps.push({ hour: appointments[i].appointment_date_time, emps: [appointments[i].employee_id] });
        }
        else {
            avaApps.push({ hour: appointments[i].appointment_date_time, emps: [appointments[i].employee_id] });
        }
        i++;
    }

    return avaApps;
}

const bulidWorkingHoursArr = (employees) => {
    const workingHoursArr = [];

    for (let employee of employees) {
        workingHoursArr.push(...generateSlotsFromTime(employee));
    }

    return workingHoursArr.sort();
}

const generateSlotsFromTime = (employee) => {
    const slots = [];

    const workingHours = employee.workingHours;
    const appDur = employee.appointment_duration;
    for (let wh of workingHours) {
        const [h, m] = wh.startTime.split(':').map(Number);
        const [endH, endM] = wh.endTime.split(':').map(Number);

        let current = h * 60 + m; // start hour in minutes.
        const end = endH * 60 + m; // end hour in minutes.

        while (current + appDur <= end) {
            const hour = Math.floor(current / 60).toString().padStart(2, '0');
            const min = (current % 60).toString().padStart(2, '0');

            slots.push(`${hour}:${min}:00-${employee.id}`);
            current += appDur;
        }
    }

    return slots;
}

const generate8DigitsNumber = () => {
    return Math.floor(10000000 + Math.random() * 90000000)
}


const checkAvaliablesHours = (avaApps, hour, hoursObj = null, includeMinute = false) => {
    let avaHours = []
    let hasReqHours = true
    let i = 0;
    const specificHour = hour.length === 2 ? false : true;
    if (hoursObj) {
        const avaHoursObj = hoursObj.avaHours;
        for (i; i < avaHoursObj.length; i++) {
            const h = avaHoursObj[i].hour;
            if (h === hour) {
                avaHours.push(avaHoursObj[i]);
                break;
            }
            else if (h > hour) break;
        }
    }
    else {
        for (i; i < avaApps.length; i++) {
            const h = includeMinute ? avaApps[i].hour : avaApps[i].hour.split(':')[0];
            if (h === hour) {
                avaHours.push({ ...avaApps[i], index: i });
            }
            else if (h > hour) break;
        }
    }

    if (avaHours.length === 0) {
        hasReqHours = false;
        // const h = hour.slice(0, 2);
        // console.log(h);
        if (hoursObj) {
            const avaHoursObj = hoursObj.avaHours;
            if (avaHoursObj.length > i) {
                avaHours.push(avaHoursObj[i])
            }
            else {
                const lastIndex = avaHoursObj[i - 1].index;
                if (lastIndex < avaApps.length - 1) {
                    avaHours.push({ ...avaApps[lastIndex + 1], index: lastIndex + 1 })
                }
            }
            if (i !== 0) {
                avaHours.push(avaHoursObj[i - 1])
            }
            else {
                const firstIndex = avaHoursObj[0].index;
                if (firstIndex !== 0) {
                    avaHours.push({ ...avaApps[firstIndex - 1], index: firstIndex - 1 })
                }
            }
        }
        else {
            if (avaApps.length > i) {
                avaHours.push({ ...avaApps[i], index: i })
            }
            if (i !== 0) {
                avaHours.push({ ...avaApps[i - 1], index: i - 1 })
            }
        }
    }

    return { specificHour, hasReqHours, avaHours };
}




const convertNumbersToHour = (input, isHour, isCode = false) => {

    // const isOnlyNumbers = /^\d+$/.test(input);
    // if (!isOnlyNumbers) return 'You must enter only digits'
    console.log(input)
    if (input.length > 5 || input === '') return null;
    let [h, m = ''] = input.split('*');

    if (isHour) {
        h = h.padStart(2, 0);
        if (h.length > 2 || h > '23') return null;
        if (!isCode) return h;
    }

    if (!isHour || isCode) {
        if (!m) return h;
        m = m.padStart(2, 0);
        if (m.length > 2 || m > '59') return null;
        // const h = `${input.slice(0, -2)}`.padStart(2, 0);
        // const m = `${input.slice(-2)}:00`;
        // if (h > '23' || m > '59') return null; 
        return h + ':' + m + ':00';
    }

}
// כל הספרים או ספר מסוים -> בחירת תאריך -> בחירת שעה
const selectDateTimeByCode = (code) => {
    const tempCode = code;
    // const codeParts = code.split('*');
    // if (codeParts.length < 4) return { status: false, msg: 'code must have at least employee id, day, month and hour' };
    const codeParts = [];
    if (tempCode.length < 8) return { status: false, msg: 'code must have at least employee id, day, month and hour' };

    // 9
    for (let i = 0; i < tempCode.length - 1; i += 2) {
        const part = tempCode.slice(i, i + 2);
        codeParts.push(part);
    }
    if (codeParts.length === 4) codeParts.push('');
    console.log(codeParts);
    const codeObj = { employeeId: Number(codeParts[0]) };

    // const keys = ['ivrId', 'day', 'month', 'hour', 'minutes']

    // for (let i = 0; i < codeParts.length; i++){
    //     codeObj[keys[i]] = codeParts[i];
    // }

    const dateStr = `${codeParts[1]}*${codeParts[2]}`;
    const date = convertStrDateToDate(dateStr, true);

    if (date instanceof Date) {
        codeObj.date = date;
    }
    else return { status: false, msg: date };

    const hourStr = `${codeParts[3]}*${codeParts[4]}`;
    const hour = convertNumbersToHour(hourStr, true, true);

    if (hour) {
        codeObj.hour = hour;
    }
    else return { status: false, msg: 'wrong hour' }

    return { status: true, codeObj: codeObj };
}

module.exports = {
    sendMsgBack,
    allJewishHolidays,
    convertStrDateToDate,
    checkEmployeesAppointmentWindow,
    checkdistantAppointmentWindow,
    checkDateForRestDay,
    allAvaliableApponintments,
    allAvaliableApponintments2,
    bulidWorkingHoursArr,
    generateSlotsFromTime,
    generate8DigitsNumber,
    checkAvaliablesHours,
    convertNumbersToHour,
    messageReturnMenu,
    processSomeInputs,
    formatToMySQLDateTime,
    selectDateTimeByCode,
    playPlaylist,
    stopPlaylist
}