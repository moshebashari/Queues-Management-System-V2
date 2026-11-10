const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path'); // מודול מובנה לניהול נתיבים
const ivrMenu = require('./data/ivrMenu.json');
const { getBusinessDataByPhoneNum, getEmployeesByBusinessId, getAppointments, createNewAppointment, updateAppointment, accessAppointmentByBookingCode, updateAppointmentDateTime } = require('./utils/DBFanctions');
const { messageReturnMenu, convertStrDateToDate, checkEmployeesAppointmentWindow, bulidShiftsArr, allAvaliableApponintments, convertNumbersToHour, checkAvaliablesHours, processSomeInputs, allAvaliableApponintments2, checkdistantAppointmentWindow, formatToMySQLDateTime, selectDateTimeByCode, playPlaylist, stopPlaylist } = require('./utils/utils');
const { emit } = require('cluster');
const moment = require('moment-timezone');
// const sound = require('sound-play');
const player = require('node-wav-player');
const audioFolderPath = path.join(__dirname, '..', 'audio_files');
// const { use } = require('react');
require('dotenv').config(); // טוען את משתני הסביבה מקובץ .env

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const TRANSITON = 1000;
const daysOfWeek = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
// 1. הגדרת נתיב אבסולוטי לתיקיית הטלפון (רמה אחת למעלה ואז לתוך phone)
const phoneDirectoryPath = path.join(__dirname, '..', 'WebPhone');
let isPlaying = false;

// 2. הגשת כל הקבצים הסטטיים (כמו phone.js) מתוך תיקיית phone
app.use(express.static(phoneDirectoryPath));

// 3. הגשת קובץ ה-HTML הראשי כשנכנסים לכתובת הבית
app.get('/', (req, res) => {
    res.sendFile(path.join(phoneDirectoryPath, 'index.html'));
});

// לוגיקת ה-IVR (ללא שינוי)
let sessionStore = {};

io.on('connection', (socket) => {
    console.log('📱 לקוח חדש התחבר לסימולטור מהתיקייה הנפרדת');
    let count = 1;

    socket.on('start_call', async (phoneNumber, clientNumber) => {
        sessionStore[socket.id] = {
            step: 'IDLE', mode: 'set', input: '', steps: [], bookingPhone: '', employeesNames: null,
            businessDataEmpNames: null, employeeName: '', employeeId: 0, date: null, avaApps: null,
            hoursObj: null, hoursList: null, inputHour: '', finalHour: null, count: 0, avaAppsAnotherEmps: null, appointment: null,
            contactPhone: '', reminderOptions: null,
        };
        const businessData = await getBusinessDataByPhoneNum('0501234567');
        if (businessData) {
            console.log(businessData)
            console.log(count++);
            let session = sessionStore[socket.id];
            session.bookingPhone = clientNumber;
            console.log(clientNumber)
            session.step = 'WELCOME';
            session.input = '';
            session.employeesNames = {};
            businessData.employee.map(e => session.employeesNames[e.id] = e.name);
            session.businessDataEmpNames = businessData;
            socket.emit('play_audio', `${ivrMenu.welcome} ${businessData.name}. ${ivrMenu.return_msg}`);
            // sound.play(filePath)
            //     .then(() => processInput(socket, session))
            //     .catch(err => console.error("שגיאה:", err));
            const files = ['welcome.wav', `business_name_${businessData.id}.wav`, 'return_msg.wav'];
            // await playPlaylist(files, true);
            processInput(socket, session)
            // const filePath = path.join(audioFolderPath, 'welcome.wav');
            // player.play({ path: filePath, sync: true, loop: false })
            //     .then(() => { processInput(socket, session) })
            //     .catch((error) => { console.error('שגיאה בניגון הקובץ:', error); });
        }
        else {
            socket.emit('hung_up', 'הטלפון שהזנת לא נמצא במערכת. שלום ולהתראות.')
        }
    });

    socket.on('dtmf_digit', (digit) => {
        let session = sessionStore[socket.id];
        if (session.step === 'IDLE') return;
        processInput(socket, session, digit);
    });

    socket.on('stop_playlist', () => {
        stopPlaylist();
    })

    socket.on('disconnect', () => {
        stopPlaylist();
        delete sessionStore[socket.id];
    });
});

async function processInput(socket, session, input) {

    if (session.step === 'WELCOME') {
        session.step = 'MAIN_MENU';
        session.steps = [];
        // session.steps.push(session.step);
        processInput(socket, session)
    }
    else if (session.step === 'MAIN_MENU') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.make_appointment} ${ivrMenu.access_appointment} ${ivrMenu.business_info}`);
            const file = ['main_menu.wav'];
            playPlaylist(file, true);
            return;
        }
        else {
            stopPlaylist();
            if (input === '1') {
                session.mode = 'set';
                session.steps.push(session.step);
                session.step = 'SET_OPTIONS';
                processInput(socket, session);
                return;
            }
            else if (input === '2') {
                session.steps.push(session.step);
                session.step = 'ACCESS_APPOINMENT';
                processInput(socket, session);
                return;
            }
            else if (input === '3') {
                session.steps.push(session.step);
                session.step = 'BUSINESS_INFO';
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'SET_OPTIONS') {
        if (!input) {
            socket.emit('play_audio', ivrMenu.set_options);
            const file = ['set_options.wav'];
            playPlaylist(file);
            return;
        }
        else {
            stopPlaylist();
            if (input === '1') {
                session.steps.push(session.step);
                session.step = 'CHOOSE_EMP_OR_ALL_EMP';
                processInput(socket, session);
                return;
            }
            else if (input === '2') {
                session.steps.push(session.step);
                session.step = 'CHOOSE_BY_CODE';
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'CHOOSE_BY_CODE') {
        if (!input) {
            socket.emit('play_audio', ivrMenu.set_by_code, true);
            const file = ['set_by_code.wav'];
            playPlaylist(file);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else if (input === '#') {
            if (session.input.length <= 7) {
                const result = selectDateTimeByCode('0219051240');
                if (result.status) {
                    const codeObj = result.codeObj;
                    console.log(codeObj);
                    session.date = codeObj.date;
                    session.inputHour = codeObj.hour;
                    session.employeeId = codeObj.employeeId;
                    session.employeeName = session.employeesNames[codeObj.employeeId].name;
                    session.steps.push(session.step);
                    session.step = 'DATE_CONFIRMATION';
                    processInput(socket, session, '1');
                    return
                }
                else {
                    console.log(result.msg);
                    processInput(socket, session);
                    return;
                }
            }
            else {
                messageReturnMenu(socket, session, 'Invalid code format', processInput)
                return;
            }
        }
        else if (input === '*') {
            if (session.input === '') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else {
                messageReturnMenu(socket, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'CHOOSE_EMP_OR_ALL_EMP') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.employee_selection}`);
            const file = ['employee_selection.wav'];
            playPlaylist(file);
            return;
        }
        else {
            stopPlaylist()
            if (input === '1') {
                session.steps.push(session.step);
                session.step = 'CHOOSE_EMPLOYEE';
                processInput(socket, session);
            }
            else if (input === '2') {
                session.steps.push(session.step);
                session.step = 'CHOOSE_TYPE_DAY';
                session.employeeName = 'all';
                session.employeeId = 0;
                processInput(socket, session);
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'CHOOSE_EMPLOYEE') {
        if (!input) {
            let msg = ``;
            const files = [];
            const employeesNames = session.businessDataEmpNames.employee;
            for (let i = 0; i < employeesNames.length; i++) {
                msg += `ל${employeesNames[i].name} ${ivrMenu.press} ${i + 1}. `
                files.push(`employee_${employeesNames[i].id}.wav`, 'press.wav', `0${i + 1}.wav`);
            }

            socket.emit('play_audio', `${msg}`);
            playPlaylist(files);
            return;
        }
        else {
            const employeesNames = session.businessDataEmpNames.employee;
            const inputNum = Number(input);
            stopPlaylist();
            if (inputNum && inputNum !== 0 && inputNum <= employeesNames.length) {
                console.log(employeesNames[inputNum - 1])
                session.employeeName = employeesNames[inputNum - 1].name;
                session.employeeId = employeesNames[inputNum - 1].id;
                session.steps.push(session.step);
                session.step = 'CHOOSE_TYPE_DAY';
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'CHOOSE_TYPE_DAY') {
        if (!input) {
            session.avaApps = null;
            socket.emit('play_audio', `${ivrMenu.type_day_selection}`);
            const file = ['type_day_selection.wav'];
            playPlaylist(file);
            return;
        }
        else {
            stopPlaylist();
            if (input === '1') {
                session.steps.push(session.step);
                session.step = 'CHOOSE_WEEK_DAY';
                processInput(socket, session);
                return;
            }
            else if (input === '2') {
                session.steps.push(session.step);
                session.step = 'ENTER_DAY';
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'CHOOSE_WEEK_DAY') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.week_day_selection}`);
            const file = ['week_day_selection.wav'];
            playPlaylist(file);
            return;
        }
        else {
            stopPlaylist()
            if (input >= '1' && input <= '7') {
                const date = convertStrDateToDate(input);
                if (date instanceof Date) {
                    session.date = date;
                    session.steps.push(session.step);
                    session.step = 'DATE_CONFIRMATION';
                    processInput(socket, session);
                }
                else {
                    messageReturnMenu(socket, session, date, processInput)
                }
                return
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'ENTER_DAY') {
        if (!input) {
            session.input = '';
            socket.emit('play_audio', ivrMenu.day_selection, true);
            const file = ['day_selection.wav'];
            playPlaylist(file);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else if (input === '#') {
            stopPlaylist();
            if (Number(session.input) <= 31) {
                session.input += '*';
                session.steps.push(session.step);
                session.step = 'ENTER_MONTH';
                processInput(socket, session);
            }
            else {
                messageReturnMenu(socket, session, 'Invalid date format', processInput)
            }
        }
        else if (input === '*') {
            stopPlaylist();
            if (session.input === '') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else {
                messageReturnMenu(socket, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'ENTER_MONTH') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.month_selection}`, true);
            const file = ['month_selection.wav'];
            playPlaylist(file);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else if (input === '#') {
            stopPlaylist();
            const userInput = session.input;
            // session.input = '';
            const date = convertStrDateToDate(userInput, true);
            if (date instanceof Date) {
                session.date = date;
                session.steps.push(session.step);
                session.step = 'DATE_CONFIRMATION';
                processInput(socket, session);
            }
            else {
                messageReturnMenu(socket, session, date, processInput)
            }
            return
        }
        else if (input === '*') {
            if (session.input.split('*')[1] === '') {
                stopPlaylist();
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else {
                session.input = session.input.split('*')[0] + '*';
                messageReturnMenu(socket, session, ivrMenu.reset, processInput)
                return;
            }
        }
        else if (input) {
            messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
            return;
        }

    }
    else if (session.step === 'DATE_CONFIRMATION') {
        if (!input) {
            const date = session.date;
            socket.emit('play_audio', `${ivrMenu.your_date} ${daysOfWeek[date.getDay()]} ${date.toLocaleDateString('he-IL')}
            ${ivrMenu.confirmation} ${ivrMenu.another_date}`);
            const files = ['your_date.wav', `weekday_${date.getDay()}.wav`, `day_${date.getDate()}.wav`, `month_${date.getMonth() + 1}.wav`,
                'confirmation.wav', 'another_date.wav'];
            playPlaylist(files);
            return;
        }

        else {
            stopPlaylist();
            if (input === '1') {
                // const employeesData = await getEmployeesByBusinessId(session.businessDataEmpNames.id, session.employeeName, session.date);
                // console.log(employeesData);
                // const avaEmp = checkEmployeesAppointmentWindow(session.date, employeesData);
                if (!session.avaApps) {
                    const distantDate = checkdistantAppointmentWindow(session.date, session.businessDataEmpNames.employee);
                    if (distantDate) {
                        socket.emit('play_audio', `${ivrMenu.over_booking_window} ${distantDate.toLocaleDateString()} ${ivrMenu.press_another_date}`);
                        session.step = 'CHOOSE_TYPE_DAY';
                        const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
                        session.steps.splice(index);
                        setTimeout(() => {
                            processInput(socket, session);
                        }, 2000);
                        return;
                    }
                    // const employeesShifts = bulidShiftsArr(avaEmp);
                    // console.log(employeesShifts)
                    // const employeesId = avaEmp.map(em => em.id);

                    const appointments = await getAppointments(session.date, session.businessDataEmpNames.id, session.employeeId);
                    console.log('appointments:', appointments)
                    console.log('appointments length', appointments.length);
                    // const avaApps = allAvaliableApponintments(employeesShifts, appointments);
                    // const avaApps = allAvaliableApponintments2(appointments);
                    // const avaApps = [];
                    // console.log('Avaliable appointments', avaApps);

                    session.avaApps = appointments;
                    // session.steps.push(session.step);
                    session.steps[session.steps.length - 1] === 'ENTER_MONTH' && session.steps.pop();
                }
                if (session.avaApps && session.avaApps.length > 0) {
                    if (session.inputHour) {
                        session.step = 'ENTER_MINUTES';
                        processInput(socket, session, '#');
                        return;
                    }
                    else {
                        session.step = 'ENTER_HOUR';
                    }
                }
                else {
                    session.step = 'NO_APPOINTMENTS_DATE';
                }
                // session.step = session.avaApps && session.avaApps.length > 0 ? session.inputHour ? 'ENTER_MINUTES' : 'ENTER_HOUR' : 'NO_APPOINTMENTS_DATE';
                processInput(socket, session);
                return;
            }
            else if (input === '2') {
                session.step = 'CHOOSE_TYPE_DAY';
                const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
                session.steps.splice(index);
                session.date = null;
                processInput(socket, session);
            }
            else if (input === '*') {
                session.input = session.input.split('*')[0] + '*';
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'NO_APPOINTMENTS_DATE') {
        const selectEmp = session.employeeName != 'all';
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.no_ava_app_date} ${ivrMenu.select_another_date}
                ${selectEmp ? ivrMenu.select_another_emp : ''}`);
            return;
        }

        if (input === '8') {
            session.step = 'CHOOSE_TYPE_DAY';
            const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
            session.steps.splice(index);
            processInput(socket, session);
            return;
        }
        else if (input === '9' && selectEmp) {
            session.step = 'CHOOSE_EMP_OR_ALL_EMP';
            const index = session.steps.indexOf('CHOOSE_EMP_OR_ALL_EMP');
            session.steps.splice(index);
            processInput(socket, session);
            return;
        }
        else if (input === '*') {
            if (session.steps[session.steps.length - 1] === 'CHOOSE_WEEK_DAY') {
                session.step = session.steps.pop();
            }
            else {
                session.step = session.steps.splice(-2)[0];
            }
            processInput(socket, session);
            return;
        }
        else if (input) {
            messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
            return;
        }

    }
    else if (session.step === 'ENTER_HOUR') {
        if (!input) {
            session.hoursObj = null;
            session.input = '';
            session.inputHour = '';
            socket.emit('play_audio', `${ivrMenu.hour_selection}`, true);
            const file = ['hour_selection.wav'];
            playPlaylist(file);
            return;

        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else {
            stopPlaylist();
            if (input === '#') {
                const userInput = session.input;
                // session.input = '';
                const hour = convertNumbersToHour(userInput, true);
                if (!hour) {
                    messageReturnMenu(socket, session, 'wrong format', processInput)
                    return;
                }
                session.input = hour;
                const hoursObj = checkAvaliablesHours(session.avaApps, hour);
                session.hoursObj = hoursObj;
                console.log(hoursObj);
                session.steps.push(session.step);
                if (hoursObj.avaHours.length === 0) {
                    session.step = 'NO_APPOINTMENTS_HOUR';
                    processInput(socket, session);
                }
                else if (hoursObj.hasReqHours && hoursObj.avaHours.length === 1 && hoursObj.avaHours[0].emps.length === 1) {
                    const avaHours = hoursObj.avaHours[0];
                    session.finalHour = { hour: avaHours.hour, emp: avaHours.emps[0] };
                    session.step = 'HOUR_CONFIRMATION';
                    processInput(socket, session);
                }
                else if (hoursObj.hasReqHours && hoursObj.avaHours.length === 1) {
                    session.finalHour = { hour: hoursObj.avaHours[0].hour };
                    session.step = 'CHOOSE_EMPLOYEE_HOUR';
                    processInput(socket, session);
                    return;
                }
                else if (!hoursObj.specificHour && hoursObj.hasReqHours) {
                    session.step = 'ENTER_MINUTES';
                    session.input += '*';
                    processInput(socket, session);
                }
                else if (!hoursObj.hasReqHours) {
                    session.step = 'BEFORE_AFTER_HOURS';
                    session.hoursList = hoursObj.avaHours;
                    session.inputHour = hour;
                    processInput(socket, session);
                }
            }
            else if (input === '*') {
                if (session.input === '') {
                    session.step = session.steps.pop();
                    processInput(socket, session);
                    return;
                }
                else {
                    messageReturnMenu(socket, session, ivrMenu.reset, processInput)
                    return;
                }
            }
        }
    }
    else if (session.step === 'ENTER_MINUTES') {
        if (!input) {
            socket.emit('play_audio', ivrMenu.minutes_selection, true);
            const file = ['minutes_selection.wav'];
            playPlaylist(file);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else if (input === '#') {
            stopPlaylist();
            let hoursObj = session.hoursObj;
            let hour;
            if (hoursObj && session.input.length > 3) {
                const userInput = session.input;
                hour = convertNumbersToHour(userInput, false);
                console.log(hour)
                if (!hour) {
                    session.input = session.input.split('*')[0];
                    messageReturnMenu(socket, session, 'wrong format', processInput)
                    return;
                }
                hoursObj = checkAvaliablesHours(session.avaApps, hour, session.hoursObj);
                console.log(hoursObj);
            }
            else if (!hoursObj) {
                hour = session.inputHour;
                const includeMinute = hour.length === 2 ? false : true;
                hoursObj = checkAvaliablesHours(session.avaApps, hour, null, includeMinute);
            }
            session.input = '';
            if (hoursObj.specificHour && hoursObj.hasReqHours && hoursObj.avaHours.length === 1 && hoursObj.avaHours[0].emps.length === 1) {
                const avaHours = hoursObj.avaHours[0];
                session.finalHour = { hour: avaHours.hour, emp: avaHours.emps[0] };
                session.steps.push(session.step);
                session.step = 'HOUR_CONFIRMATION';
            }
            else if (hoursObj.specificHour && hoursObj.hasReqHours && hoursObj.avaHours.length === 1) {
                session.finalHour = { hour: hoursObj.avaHours[0].hour };
                session.steps.push(session.step);
                session.step = 'CHOOSE_EMPLOYEE_HOUR';
            }
            else if (!hoursObj.specificHour && hoursObj.hasReqHours) {
                session.step = 'CHOOSE_HOUR';
                session.hoursList = hoursObj.avaHours;
                session.hoursObj = hoursObj;
                session.count = 0;
            }
            else if (!hoursObj.hasReqHours) {
                session.step = 'BEFORE_AFTER_HOURS';
                session.inputHour = hour;
                session.hoursList = hoursObj.avaHours;
                session.hoursObj = hoursObj;
            }
            else {

                return;
            }
            processInput(socket, session);
            return;
        }
        else if (input === '*') {
            stopPlaylist();
            if (session.input.split('*')[1] === '') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else {
                session.input = session.input.split('*')[0] + '*';
                messageReturnMenu(socket, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'NO_APPOINTMENTS_HOUR') {
        if (!input) {
            const selectEmp = session.employeeName != 'all';
            socket.emit('play_audio', `${ivrMenu.no_ava_app_hour} ${ivrMenu.select_another_hour}
                ${ivrMenu.select_another_date} ${selectEmp ? ivrMenu.select_another_emp : ''}`)
            return;
        }
        processSomeInputs(input, session, socket, selectEmp, ivrMenu.wrong_choice, processInput);

        // if (input === '7') {
        //     session.step = 'ENTER_HOUR';
        //     processInput(socket, session);
        //     return;
        // }
        // else if (input === '8') {
        //     session.step = 'CHOOSE_TYPE_DAY';
        //     processInput(socket, session);
        //     return;
        // }
        // else if (input === '9' && selectEmp) {
        //     session.step = 'CHOOSE_EMP_OR_ALL_EMP';
        //     processInput(socket, session);
        //     return;
        // }
        // else if (input) {
        //     messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
        return;
    }
    else if (session.step === 'CHOOSE_HOUR') {
        const listCount = session.count % 4;
        const hoursObj = session.hoursList;
        const selectEmp = session.employeeName != 'all';
        if (!input) {
            const files = []
            let msg = ``;
            for (let i = 0; i < 4 && session.count < hoursObj.length; i++) {
                const [h, m] = hoursObj[session.count++].hour.slice(0, 5).split(':');
                msg += `${ivrMenu.for_hour} ${h}:${m} ${ivrMenu.press} ${i + 1}. `;
                files.push('for_hour.wav', `${h}.wav`, `minute_${m}.wav`, 'press.wav', `0${i + 1}.wav`);
            }
            if (hoursObj.length > session.count) {
                msg += ivrMenu.next_hours_list;
                files.push('next_hours_list.wav');
            }
            if (session.count > 4) {
                msg += ivrMenu.prev_hours_list;
                files.push('prev_hours_list.wav');
            }
            msg += `${ivrMenu.select_another_hour} ${ivrMenu.select_another_date}`;
            files.push('select_another_hour.wav', 'select_another_date.wav');
            if (selectEmp) {
                msg += ivrMenu.select_another_emp;
                files.push('select_another_emp.wav');
            }
            socket.emit('play_audio', msg);
            playPlaylist(files);
            return;
        }
        else {
            stopPlaylist();
            if (input >= '1' && input <= '4' && listCount === 0 || listCount >= Number(input)) {
                const hourIndex = (Math.ceil(session.count / 4) - 1) * 4 + Number(input) - 1;
                console.log(hourIndex)
                console.log(hoursObj);
                const hourData = hoursObj[hourIndex];
                session.finalHour = { hour: hourData.hour };
                session.count = 0;
                session.steps.push(session.step);
                if (hourData.emps.length === 1) {
                    session.finalHour.emp = hourData.emps[0];
                    console.log(session.finalHour);
                    session.step = 'HOUR_CONFIRMATION';
                    processInput(socket, session);
                    return;
                }
                else {
                    session.step = 'CHOOSE_EMPLOYEE_HOUR';
                    processInput(socket, session);
                    return;
                }
            }
            else if (input === '5' && hoursObj.length > session.count) {
                processInput(socket, session);
            }
            else if (input === '6' && session.count > 4) {
                session.count -= listCount === 0 ? 8 : listCount + 4;
                processInput(socket, session)
            }
            else if (input === '7') {
                session.step = 'ENTER_HOUR';
                const index = session.steps.indexOf('ENTER_HOUR');
                session.steps.splice(index);
                processInput(socket, session);
                return;
            }
            else if (input === '8') {
                session.step = 'CHOOSE_TYPE_DAY';
                const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
                session.steps.splice(index);
                processInput(socket, session);
                return;
            }
            else if (input === '9' && selectEmp) {
                session.step = 'CHOOSE_EMP_OR_ALL_EMP';
                const index = session.steps.indexOf('CHOOSE_EMP_OR_ALL_EMP');
                session.steps.splice(index);
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                session.count -= listCount === 0 ? 4 : listCount;
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }

    }
    else if (session.step === 'BEFORE_AFTER_HOURS') {
        const hoursObj = session.hoursObj.avaHours;
        const selectEmp = session.employeeName !== 'all';
        const hasBefore = hoursObj[hoursObj.length - 1].index > 0;
        const hasAfter = hoursObj[0].index < session.avaApps.length;
        if (!input) {
            const files = ['no_ava_app_hour.wav'];
            let msg = ivrMenu.no_ava_app_hour;
            for (let i = 0; i < hoursObj.length; i++) {
                // const hourData = hoursObj[i].hour.split('-');
                const hour = hoursObj[i].hour.slice(0, 5);
                if (hour > session.inputHour) {
                    msg += ivrMenu.closest_after_hour;
                    files.push('closest_after_hour.wav');
                } else {
                    msg += ivrMenu.closest_before_hour;
                    files.push('closest_before_hour.wav');
                }
                msg += `${hour} ${ivrMenu.to_select} ${i + 1}. `;
                files.push('at_hour.wav', `${hour.slice(0, 2)}.wav`, `minute_${hour.slice(3)}.wav`, 'to_select.wav', `0${i + 1}.wav`)
            }
            let avaApps;
            if (selectEmp) {
                avaApps = await getAppointments(session.date, session.businessDataEmpNames.id, 0, session.inputHour);
                if (avaApps.length > 0) {
                    session.avaAppsAnotherEmps = avaApps;
                    msg += ivrMenu.check_another_emp;
                    files.push('check_another_emp.wav')
                    console.log(avaApps);
                }
            }
            socket.emit('play_audio', msg);
            playPlaylist(files);
            // socket.emit('play_audio', `${ivrMenu.no_ava_app_hour} ${msg} 
            //     ${hasAfter ? ivrMenu.another_hours_after : ''} ${hasBefore ? ivrMenu.another_hours_before : ''}`)
            return;
        }
        else {
            stopPlaylist();
            if (input === '1' || input === '2' && hoursObj.length === 2) {
                const hourData = hoursObj[Number(input) - 1];
                console.log(session.inputHour)
                session.finalHour = { hour: hourData.hour };
                session.steps.push(session.step);
                if (hourData.emps.length === 1) {
                    session.finalHour.emp = hourData.emps[0];
                    console.log(session.finalHour);
                    session.step = 'HOUR_CONFIRMATION';
                    processInput(socket, session);
                    return;
                }
                else {
                    session.step = 'CHOOSE_EMPLOYEE_HOUR';
                    processInput(socket, session);
                    return;
                }
            }
            else if (input === '3' && session.avaAppsAnotherEmps) {
                session.steps.push(session.step);
                const avaApps = session.avaAppsAnotherEmps;
                if (avaApps.length === 1 && avaApps.emps.length === 1) {
                    const hourData = session.avaAppsAnotherEmps[0];
                    session.finalHour = { hour: hourData.hour, emp: hourData.emps[0] };
                    session.step = 'HOUR_CONFIRMATION';
                }
                else if (avaApps.length === 1) {
                    session.step = 'CHOOSE_EMPLOYEE_HOUR';
                    session.count = 0;
                }
                else {
                    session.hoursList = session.avaAppsAnotherEmps;
                    session.step = 'CHOOSE_HOUR';
                    session.count = 0;
                }
                processInput(socket, session);
                return;
            }
            // else if (input === '3' && hasAfter) {
            //     session.step = 'HOURS_AFTER_SELECT';
            //     session.count = hoursObj[0].index + 1;
            //     processInput(socket, session);
            // }
            // else if (input === '4' && hasBefore) {
            //     session.step = 'HOURS_BEFORE_SELECT';
            //     session.count = hoursObj[session.length - 1].index - 1;
            //     processInput(socket, session);
            // }
            else if (input === '7') {
                session.step = 'ENTER_HOUR';
                const index = session.steps.indexOf('ENTER_HOUR');
                session.steps.splice(index);
                processInput(socket, session);
                return;
            }
            else if (input === '8') {
                session.step = 'CHOOSE_TYPE_DAY';
                const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
                session.steps.splice(index);
                processInput(socket, session);
                return;
            }
            else if (input === '9' && selectEmp) {
                session.step = 'CHOOSE_EMP_OR_ALL_EMP';
                const index = session.steps.indexOf('CHOOSE_EMP_OR_ALL_EMP');
                session.steps.splice(index);
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    // else if (session.step === 'HOURS_AFTER_SELECT') {
    //     const allEmps = session.employeeName === 'all';
    //     let count = session.count;
    //     const avaAppsLen = session.avaApps.length;
    //     const diff = avaAppsLen - count;
    //     if (!input) {
    //         let msg = '';
    //         for (let i = 0; i < 4 && i < diff; i++) {
    //             const hourData = session.avaApps[count++].split('-');
    //             const hour = hourData[0].slice(0, 5);
    //             msg += `${ivrMenu.for_hour} ${hour} ${allEmps ? session.employeesNames[hourData[1]] : ''}
    //             ${ivrMenu.press} ${i + 1}. `;
    //         }
    //         socket.emit('play_audio', `${msg} ${avaAppsLen > count ? ivrMenu.another_hours : ''}
    //             ${session.count > 0 ? ivrMenu.hours_before : ''} `);
    //         return;
    //     }

    //     if (input >= '1' && input <= '4' && input <= diff.toString()) {
    //         session.finalHour = session.avaApps[session.count + Number(input) - 1];
    //         session.step = 'HOUR_CONFIRMATION';
    //         processInput(socket, session);
    //         return;
    //     }
    //     else if (input === '5' && diff > 4) {
    //         session.count += 4;
    //         processInput(socket, session);
    //         return;
    //     }
    //     else if (input === '7') {
    //         session.step = 'ENTER_HOUR';
    //         processInput(socket, session);
    //         return;
    //     }
    //     else if (input === '8') {
    //         session.step = 'CHOOSE_TYPE_DAY';
    //         processInput(socket, session);
    //         return;
    //     }
    //     else if (input === '9' && !allEmps) {
    //         session.step = 'CHOOSE_EMP_OR_ALL_EMP';
    //         processInput(socket, session);
    //         return;
    //     }
    //     else if (input) {
    //         messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
    //         return;
    //     }
    // }
    else if (session.step === 'CHOOSE_EMPLOYEE_HOUR') {
        const emps = session.hoursObj.avaHours.find(h => h.hour === session.finalHour.hour).emps;
        if (!input) {
            const files = [];
            let msg = `${ivrMenu.available_employees}. `;
            for (let i = 0; i < emps.length; i++) {
                msg += `ל${session.employeesNames[emps[i]]} ${ivrMenu.press} ${i + 1}. `;
                files.push(`employee_${emps[i]}.wav`, 'press.wav', `0${i + 1}.wav`);
            }
            socket.emit('play_audio', msg);
            playPlaylist(files);
            return;
        }
        else {
            stopPlaylist();
            if (input >= '1' && input <= emps.length.toString()) {
                session.steps.push(session.step);
                session.finalHour.emp = emps[Number(input) - 1];
                session.step = 'HOUR_CONFIRMATION';
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'HOUR_CONFIRMATION') {
        const hourData = session.finalHour;
        // const [h, m, s] = hourData.hour.split(':').map(Number);
        if (!input) {
            const files = [];
            const [h, m] = hourData.hour.slice(0, 5).split(':');
            socket.emit('play_audio', `${ivrMenu.chosen_hour} ${h}:${m} ${ivrMenu.at} 
            ${session.employeesNames[hourData.emp]}; ${ivrMenu.confirmation} ${ivrMenu.select_another_hour}`);
            files.push('chosen_hour.wav', `${h}.wav`, `minute_${m}.wav`, `employee_${hourData.emp}.wav`,
                'confirmation.wav', 'select_another_hour.wav');
            playPlaylist(files);
            return;
        }

        else {
            stopPlaylist();
            if (input === '1') {
                const dateStr = moment(session.date).tz('Asia/Jerusalem').format('YYYY-MM-DD');
                const fullTimeStr = `${dateStr} ${hourData.hour}`;
                const fullTimeDate = moment.tz(fullTimeStr, "YYYY-MM-DD HH:mm:ss", "Asia/Jerusalem").toDate();
                // const appData = {
                //     businessId: session.businessDataEmpNames.id, employeeId: Number(hourData.emp),
                //     appointmentDateTime: fullTimeDate, bookingPhone: session.bookingPhone
                // }
                if (session.mode === 'set') {
                    const appData = { bookingPhone: session.bookingPhone, status: 'pending' }
                    const whereData = {
                        businessId: session.businessDataEmpNames.id, employeeId: hourData.emp,
                        appointmentDateTime: fullTimeDate,
                    }
                    try {
                        // const appointment = await createNewAppointment(appData);
                        const appointment = await updateAppointment(appData, whereData);
                        session.appointment = appointment;
                        console.log(appointment);
                        session.step = 'CHANGE_CONTACT_PHONE_REQ';
                        processInput(socket, session);
                    } catch (err) {
                        socket.emit('play_audio', err.message);
                    }
                }
                else {
                    try {
                        const currentDate = session.appointment.appointmentDateTime;
                        const result = updateAppointmentDateTime(session.businessDataEmpNames.id, hourData.emp, currentDate, fullTimeDate);
                        if (result) {
                            session.appointment.appointmentDateTime = fullTimeDate;
                            socket.emit('play_audio', ivrMenu.update_time_successfully);
                            session.step = 'UPDATE_OPTIONS';
                            const index = session.steps.indexOf('UPDATE_OPTIONS');
                            session.steps.splice(index);
                            processInput(socket, session);
                            return;
                        }
                    } catch (err) {
                        socket.emit('play_audio', err.message);

                    }
                }
            }
            else if (input === '7') {
                session.step = 'ENTER_HOUR';
                const index = session.steps.indexOf('ENTER_HOUR');
                session.steps.splice(index);
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
        }
    }
    else if (session.step === 'CHANGE_CONTACT_PHONE_REQ') {
        if (!input) {
            const files = ['save_dailed_number.wav', 'change_contact_phone_req.wav'];
            socket.emit('play_audio', `${ivrMenu.save_dailed_number} ${ivrMenu.change_contact_phone_req}`);
            playPlaylist(files);
            return;
        }

        else {
            stopPlaylist();
            if (input === '1') {
                session.steps.push(session.step);
                session.contactPhone = session.appointment.bookingPhone;
                const reminderTime = session.businessDataEmpNames.reminderTime;
                if (reminderTime === 'none') session.step = 'APPOINTMENT_CONFIRMATION';
                else if (reminderTime === 'customer_choice') session.step = 'REMINDER_REQ';
                else session.businessDataEmpNames.notifictionChannel.length > 1 ? 'REMINDER_CHANNEL' : 'APPOINTMENT_CONFIRMATION';
                processInput(socket, session);
                return
            }
            else if (input === '2') {
                session.steps.push(session.step);
                session.step = 'CHANGE_CONTACT_PHONE';
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'CHANGE_CONTACT_PHONE') {
        if (!input) {
            session.input = '';
            socket.emit('play_audio', `${ivrMenu.change_contact_phone}`, true);
            const file = ['change_contact_phone.wav'];
            playPlaylist(file);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else {
            stopPlaylist();
            if (input === '#') {
                if (session.input.length < 9 || session.input.length > 10) {
                    messageReturnMenu(socket, session, ivrMenu.wrong_phone_number, processInput);
                    return;
                }
                session.steps.push(session.step);
                session.step = 'PHONE_CONFIRMATION';
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                if (session.input === '') {
                    session.step = session.steps.pop();
                    processInput(socket, session);
                    return;
                }
                else {
                    messageReturnMenu(socket, session, ivrMenu.reset, processInput)
                    return;
                }
            }
        }
    }
    else if (session.step === 'PHONE_CONFIRMATION') {
        if (!input) {
            const files = ['phone_confirmation.wav'];
            const allNums = session.input.split('').map(num => `0${num}.wav`);
            console.log(allNums);
            files.push(...allNums, 'confirmation.wav', 'another_phone.wav');

            socket.emit('play_audio', `${ivrMenu.phone_confirmation} ${session.input}.
                 ${ivrMenu.confirmation} ${ivrMenu.cancellaition}`);
            playPlaylist(files);
            return;
        }
        else {
            stopPlaylist();
            if (input === '1') {
                session.contactPhone = session.input;
                if (session.mode === 'update') {
                    session.step = 'APPOINTMENT_CONFIRMATION';
                    processInput(socket, session);
                    return;
                }
                session.reminderOptions = {};

                const reminderTime = session.businessDataEmpNames.reminderTime;
                if (reminderTime === 'none') session.step = 'APPOINTMENT_CONFIRMATION';
                else session.step = 'REMINDER_REQ';
                processInput(socket, session);
            }
            else if (input === '2') {
                session.step = session.steps.splice(-2)[0];
                // session.step = 'CHANGE_CONTACT_PHONE_REQ';
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput);
                return;
            }
        }
    }
    else if (session.step === 'REMINDER_REQ') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.reminder_req} ${ivrMenu.without_reminder}`);
            const file = ['reminder_req.wav'];
            playPlaylist(file);
            return;
        }

        else {
            stopPlaylist();
            if (input === '1') {
                session.steps.push(session.step);
                session.reminderOptions = {};
                const reminderTime = session.businessDataEmpNames.reminderTime;
                if (reminderTime === 'customer_choice') session.step = 'REMINDER_TIME';
                else {
                    session.reminderOptions.time = reminderTime;
                    const notifictionChannel = session.businessDataEmpNames.notifictionChannel;
                    if (notifictionChannel.length > 1) {
                        session.step = 'REMINDER_CHANNEL';
                    }
                    else {
                        session.reminderOptions.channel = notifictionChannel[0];
                        session.step = 'APPOINTMENT_CONFIRMATION';
                    }
                }
                processInput(socket, session);
                return;
            }
            else if (input === '2') {
                session.steps.push(session.step);
                session.step = 'APPOINTMENT_CONFIRMATION';
                processInput(socket, session);
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'REMINDER_TIME') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.reminder_time}`);
            const file = ['reminder_time.wav'];
            playPlaylist(file);
            return;
        }

        else {
            stopPlaylist();
            if (input >= '1' && input <= '3') {
                if (input === '1') session.reminderOptions.time = '24h';
                else if (input === '2') session.reminderOptions.time = 'evening';
                else session.reminderOptions.time = 'morning';
                session.steps.push(session.step);
                const notifictionChannel = session.businessDataEmpNames.notifictionChannel;
                if (notifictionChannel.length > 1) {
                    session.step = 'REMINDER_CHANNEL';
                }
                else {
                    session.reminderOptions.channel = notifictionChannel[0];
                    session.step = 'APPOINTMENT_CONFIRMATION';
                }
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'REMINDER_CHANNEL') {
        const notifictionChannel = session.businessDataEmpNames.notifictionChannel;
        if (!input) {
            const files = []
            let msg = '';
            for (let i = 0; i < notifictionChannel.length; i++) {
                msg += `${ivrMenu[notifictionChannel[i]]} ${i + 1}.`;
                files.push(`${notifictionChannel[i]}.wav`, 'press.wav', `0${i + 1}.wav`);
            }
            socket.emit('play_audio', `${msg}`);
            playPlaylist(files);
            return;
        }
        else {
            stopPlaylist();
            if (input >= '1' && input <= notifictionChannel.length.toString()) {
                session.reminderOptions.channel = notifictionChannel[Number(input) - 1];
                session.steps.push(session.step);
                session.step = 'APPOINTMENT_CONFIRMATION';
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'APPOINTMENT_CONFIRMATION') {
        if (!input) {
            let extentionData = {};
            if (session.mode === 'set') {
                extentionData = { contactPhone: session.contactPhone, reminderOptions: session.reminderOptions, status: 'booked' };
            }
            else if (session.mode = 'update') {
                if (session.reminderOptions) {
                    extentionData.reminderOptions = session.reminderOptions;
                }
                if (session.contactPhone) {
                    extentionData.contactPhone = session.contactPhone
                }
            }
            const appointment = session.appointment;
            const whereData = {
                businessId: appointment.businessId, employeeId: appointment.employeeId,
                bookingCode: appointment.bookingCode
            };

            const update = await updateAppointment(extentionData, whereData);
            if (update) {
                console.log(update)
                session.appointment = update;
                session.contactPhone = '';
                session.reminderOptions = null;
                const files = [];
                let msg = '';
                let resetStep = '';
                let dur = 1000;
                if (session.mode === 'set') {
                    const allNums = [...String(update.bookingCode)].map(num => `0${num}.wav`);
                    msg = `${ivrMenu.successful} ${ivrMenu.booking_code} ${session.appointment.bookingCode} ${ivrMenu.booking_code_explain}.`;
                    files.push('success_schedule.wav', ...allNums, 'booking_code_info.wav')
                    resetStep = 'CHOOSE_EMP_OR_ALL_EMP';
                    session.step = 'APPOINTMENT_OPTIONS';
                    dur = 3000;
                }
                else {
                    msg = ivrMenu.update_successfully;
                    files.push('update_successfully.wav');
                    resetStep = 'UPDATE_OPTIONS';
                    session.step = 'UPDATE_OPTIONS';
                }
                const index = session.steps.indexOf(resetStep);
                session.steps.splice(index);
                socket.emit('play_audio', msg);
                await playPlaylist(files);
                processInput(socket, session);
                // messageReturnMenu(socket, session, msg, processInput, dur);
                return;
            }
            else {
                messageReturnMenu(socket, session, ivrMenu.error);
                return;
            }
        }
    }
    else if (session.step === 'ACCESS_APPOINMENT') {
        if (!input) {
            session.input = '';
            session.count = 0;
            socket.emit('play_audio', ivrMenu.access_appointmet_req, true);
            const file = ['access_appointmet_req.wav'];
            playPlaylist(file);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else {
            stopPlaylist();
            if (input === '#') {
                // if (session.input.length !== 8) {
                //     messageReturnMenu(socket, session, ivrMenu.booking_code_length, processInput);
                //     return;
                // }
                const userInput = Number(session.input);
                session.input = '';

                const appointment = await accessAppointmentByBookingCode(session.businessDataEmpNames.id, 40192837);
                if (appointment) {
                    session.appointment = appointment;
                    if (appointment.contactPhone === session.bookingCode) {
                        session.step = 'APPOINTMENT_OPTIONS';
                    }
                    else {
                        session.steps.push(session.step);
                        session.step = 'SECURITY_CHECK';
                    }
                    processInput(socket, session)
                    return
                }
                else {
                    messageReturnMenu(socket, session, ivrMenu.wrong_booking_code, processInput);
                    return;
                }
            }
            else if (input === '*') {
                if (session.input === '') {
                    session.step = session.steps.pop();
                    processInput(socket, session);
                    return;
                }
                else {
                    messageReturnMenu(socket, session, ivrMenu.reset, processInput)
                    return;
                }
            }
        }
    }
    else if (session.step === 'SECURITY_CHECK') {
        if (!input) {
            session.count = 0;
            session.input = '';
            socket.emit('play_audio', ivrMenu.security_check, true);
            const file = ['security_check.wav'];
            playPlaylist(file);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else {
            stopPlaylist();
            if (input === '#') {
                // if (session.input.length !== 4) {
                //     messageReturnMenu(socket, session, ivrMenu.booking_code_length, processInput);
                //     return;
                // }
                const userInput = session.input;
                if (session.appointment.contactPhone.slice(-4) === '4567') {
                    session.step = 'APPOINTMENT_OPTIONS';
                    console.log(session.appointment)
                    processInput(socket, session);
                    return;
                }
                else {
                    messageReturnMenu(socket, session, ivrMenu.wrong_security_check, processInput);
                    return;
                }
            }
            else if (input === '*') {
                if (session.input === '') {
                    session.step = session.steps.pop();
                    processInput(socket, session);
                    return;
                }
                else {
                    messageReturnMenu(socket, session, ivrMenu.reset, processInput)
                    return;
                }
            }
        }
    }
    else if (session.step === 'APPOINTMENT_OPTIONS') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.to_get_details} ${ivrMenu.to_upadte} ${ivrMenu.to_cancel}
                ${ivrMenu.to_get_booking_code}`);
            const file = ['appointment_options.wav'];
            playPlaylist(file);
            return;
        }

        else {
            stopPlaylist();
            if (input === '1') {
                const appointment = session.appointment;
                const [h, m] = appointment.hour.slice(0, 5).split(':');
                const date = appointment.appointmentDateTime;
                const msg = `${daysOfWeek[date.getDay()]} ${date.toLocaleDateString('he-IL')} ${ivrMenu.at_hour} 
                             ${session.appointment.hour.slice(0, 5)} ${ivrMenu.at} ${session.employeesNames[appointment.employeeId]}`;
                const files = [`weekday_${date.getDay()}.wav`, `day_${date.getDate()}.wav`, `month_${date.getMonth() + 1}.wav`,
                    'at_hour.wav', `${h}.wav`, `minute_${m}.wav`, `employee_${appointment.employeeId}.wav`];
                socket.emit('play_audio', msg);
                await playPlaylist(files);
                processInput(socket, session);
                return;
            }
            else if (input === '2') {
                session.steps.push(session.step);
                session.step = 'UPDATE_OPTIONS';
                processInput(socket, session);
                return;
            }
            else if (input === '3') {
                const result = await updateAppointment({ status: 'cancelled' }, { bookingCode: session.appointment.bookingCode }, 'cancel');
                console.log(result);
                return;
            }
            else if (input === '4') {
                const msg = `${ivrMenu.booking_code} ${session.appointment.bookingCode}`;
                const files = [...String(session.appointment.bookingCode)].map(num => `0${num}.wav`);
                socket.emit('play_audio', msg);
                await playPlaylist(files);
                processInput(socket, session);
                return;
            }
            else if (input === '*') {
                session.step = 'MAIN_MENU';
                const index = session.steps.indexOf('MAIN_MENU');
                session.steps.splice(index);
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'UPDATE_OPTIONS') {
        const reminderTime = session.businessDataEmpNames.reminderTime;
        if (!input) {
            session.mode = 'update';
            socket.emit('play_audio', `${ivrMenu.update_date_and_hour} ${ivrMenu.update_contact_phone} 
                ${reminderTime !== 'none' && ivrMenu.update_reminder}`);
            const files = ['update_options.wav'];
            if (reminderTime !== 'none') files.push('update_reminder.wav');
            playPlaylist(files);
            return
        }

        else {
            stopPlaylist();
            if (input === '1') {
                session.steps.push(session.step);
                session.step = 'UPDATE_DATE_TIME_OPTIONS';
                processInput(socket, session);
                return;
            }
            else if (input === '2') {
                session.steps.push(session.step);
                session.step = 'CHANGE_CONTACT_PHONE';
                processInput(socket, session);
                return;
            }
            else if (input === '3' && reminderTime !== 'none') {
                session.reminderOptions = {};
                session.steps.push(session.step);
                session.step = 'REMINDER_REQ';
                processInput(socket, session);
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
    else if (session.step === 'UPDATE_DATE_TIME_OPTIONS') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.update_hour} ${ivrMenu.update_date}`);
            const file = ['update_time_options.wav'];
            playPlaylist(file);
            return;
        }

        else {
            stopPlaylist();
            if (input === '1') {
                session.date = session.appointment.appointmentDateTime;
                session.employeeId = session.appointment.employeeId;
                session.employeeName = session.employeesNames[session.employeeId];
                session.steps.push(session.step);
                session.step = 'DATE_CONFIRMATION';
                processInput(socket, session, '1');
                return;
            }
            else if (input === '2') {
                session.inputHour = session.appointment.hour;
                session.employeeId = session.appointment.employeeId;
                session.employeeName = session.employeesNames[session.employeeId];
                session.steps.push(session.step);
                session.step = 'CHOOSE_TYPE_DAY';
                processInput(socket, session);
                return;
            }
            else if (input === '3') {
                session.date = session.appointment.appointmentDateTime;
                session.inputHour = session.appointment.hour;
            }
            else if (input === '*') {
                session.step = session.steps.pop();
                processInput(socket, session);
                return;
            }
            else if (input) {
                messageReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
                return;
            }
        }
    }
}

server.listen(3000, () => {
    console.log('🚀 השרת רץ בכתובת: http://localhost:3000');
});
