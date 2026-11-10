const express = require('express');
const http = require('http');
// const { Server } = require("channel.io");
const path = require('path'); // מודול מובנה לניהול נתיבים
const { getBusinessDataByPhoneNum, getEmployeesByBusinessId, getAppointments, createNewAppointment, updateAppointment, accessAppointmentByBookingCode, updateAppointmentDateTime, getEmployeesSameAppoinment, updateAppointmentEmployee, getClosestAppointment, bookAppointment, lockAppointment, updateExtensions, cancelAppointment } = require('./utils/DBFanctionsIVR');
const { messageReturnMenu, convertStrDateToDate, checkEmployeesAppointmentWindow, bulidShiftsArr, allAvaliableApponintments, convertNumbersToHour, checkAvaliablesHours, processSomeInputs, allAvaliableApponintments2, checkdistantAppointmentWindow, formatToMySQLDateTime, selectDateTimeByCode, playPlaylist, stopPlaylist, playPlaylistSip, convertDataToAudioFiles, allJewishHolidaysPerMonth, isJewishHolidayPerDate, generateUtcTimesForDayOfWeek } = require('./utils/utils');
// const { emit } = require('cluster');
const moment = require('moment-timezone');
const { sequelize } = require('./utils/database');
// const sound = require('sound-play');
// const player = require('node-wav-player');
// const { cpuUsage } = require('process');
const audioFolderPath = path.join(__dirname, '..', 'audio_files');
// const { use } = require('react');
require('dotenv').config(); // טוען את משתני הסביבה מקובץ .env
const ari = require('ari-client');
const { all } = require('axios');
const { generateSlots } = require('./utils/generateSlots');
const { getNoAvaliablesDaysOfMonth, getDailyAppointments, getAllBusinessUUIDAndNames } = require('./utils/DBFunctionsWeb');
// const { channel } = require('diagnostics_channel');
const HomePageRoutes = require('./routes/Home');
const AppointmentRoutes = require('./routes/Appointment');
const EmployeeRoutes = require('./routes/Employee');
const AuthRoutes = require('./routes/Auth');
const { checkShiftAndBreaksChanges, checkConflictsForShift, generateSlotsForShiftChanges } = require('./services/employeeService');
// const AppPageRoutes = require('./routes/Appointment');


const PORT = 3000;

const app = express();

app.use(express.json());
app.use(HomePageRoutes);
app.use('/api/appointments', AppointmentRoutes);
app.use('/api/employee', EmployeeRoutes)
app.use('/:uuid/api/auth', AuthRoutes);

// app.get('/', async (req, res) => {
//     // const allJewishHolidays = allJewishHolidaysPerMonth(5787, 7, true);
//     // console.log(allJewishHolidays);
//     // console.log(new Date('2026-05-19T10:12:00'));
//     // const date = new Date(2026, 8, 13);
//     // console.log(isJewishHolidayPerDate(date)) 
//     // await getNoAvaliablesDaysOfMonth(0, 2026, 5);
//     // const date = '2026-05-19';
//     // await getDailyAppointments({ businessId: 1, date, userRole: 'admin' });
//     // await getAllBusinessUUIDAndNames();
//     // const ranges = [
//     //     {type: 'shift', startTime: '08:00:00', endTime: '09:00:00'},
//     //     {type:'break', startTime: '12:00:00', endTime: '14:00:00'}
//     // ]
//     const breaks = [{startTime: '12:00:00', endTime: '13:00:00', type: 'break_1'}, {startTime: '14:00:00', endTime: '15:00:00', type: "break_2"}];
//     const changeDefinitions = {
//         shift_start: {effectiveDate: new Date(2026, 11, 24)},
//         shift_end: {effectiveDate: new Date(2026, 11, 17)},
//         break_1: {effectiveDate: new Date(2026, 11, 31)},
//         break_2: {effectiveDate: new Date(2026, 11, 24)}
//     }
//     const newShift = {dayOfWeek: 4, startTime: '09:00:00', endTime: '16:00:00', breaks, effectiveDate:  new Date('2026-05-17T03:00:00Z') }
//     const startDate = new Date('2026-05-17T03:00:00Z');
//     const endDate = new Date('2026-05-31T23:59:59Z');
//     const slots = await generateSlotsForShiftChanges(1, 2, newShift)
//     // console.log(slots);
//     // const ranges = await checkShiftAndBreaksChanges(2, newShift);
//     // // console.log(ranges);
//     // const utcRanges = generateUtcTimesForDayOfWeek('2026-05-31', 0, ranges, changeDefinitions);
//     // console.log(utcRanges);
//     // await checkConflictsForShift(2, utcRanges);
//     // res.send('success')
//     res.json({result: slots})
// })


app.listen(PORT, '0.0.0.0', async function () {
    console.log('Server is running!');
    try {
        await sequelize.authenticate();
        // await sessionStore.sync();
        console.log('connection has been established successfully');
    }
    catch (error) {
        console.error('Unable to connect to the database:', error);
    }
})
// const server = http.createServer(app);
// const io = new Server(server);
const TRANSITON = 1000;
const daysOfWeek = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
// 1. הגדרת נתיב אבסולוטי לתיקיית הטלפון (רמה אחת למעלה ואז לתוך phone)
// const phoneDirectoryPath = path.join(__dirname, '..', 'WebPhone');
// let isPlaying = false;

// 2. הגשת כל הקבצים הסטטיים (כמו phone.js) מתוך תיקיית phone
// app.use(express.static(phoneDirectoryPath));

// 3. הגשת קובץ ה-HTML הראשי כשנכנסים לכתובת הבית
// app.get('/', (req, res) => {
//     res.sendFile(path.join(phoneDirectoryPath, 'index.html'));
// });



//                                      שייך למערכת טלפוני 
// const url = process.env.ARI_URL;
// const username = process.env.ARI_USERNAME;
// const password = process.env.ARI_PASSWORD;
// let sessionStore = {};

// ari.connect(url, username, password)
//     .then((client) => {
//         let count = 1;
//         console.log('The connection to Asterisk Api is working');
//         client.start('call-manager');
//         let isChannelActive = true;

//         client.on('StasisStart', async (event, channel) => {
//             isChannelActive = true;
//             const clientNumber = channel.caller.name;
//             console.log(`New call coming. Number dailing: ${clientNumber}`)
//             const dialedNumber = channel.dialplan.exten;
//             console.log('The number they dialed: ', dialedNumber);
//             sessionStore[channel.id] = {
//                 step: 'IDLE', mode: 'set', type: 'normal', input: '', steps: [], bookingPhone: '', employeesNames: null,
//                 businessData: null, employeeName: '', employeeId: 0, date: null, avaApps: null,
//                 hoursObj: null, hoursList: null, inputHour: '', finalHour: null, count: 0, avaAppsAnotherEmps: null, appointment: null,
//                 contactPhone: '', reminderOptions: null, itemsPerList: 0, count: 0, anotherEmployees: null
//             };
//             channel.on('StasisEnd', () => {
//                 console.log(`❌ The call on channel ${channel.id} disconnected.`)
//                 isChannelActive = false
//             })
//             if (isChannelActive) {
//                 const businessData = await getBusinessDataByPhoneNum('0501234567'); // dialedNumber
//                 console.log(businessData)
//                 if (businessData) {
//                     console.log(businessData)
//                     console.log(count++);
//                     let session = sessionStore[channel.id];
//                     session.bookingPhone = clientNumber;
//                     console.log(clientNumber)
//                     session.step = 'WELCOME';
//                     session.input = '';
//                     session.employeesNames = {};
//                     businessData.employee.map(e => session.employeesNames[e.id] = e.name);
//                     session.businessData = businessData;

//                     try {
//                         await channel.answer((err) => {
//                             if (err) console.error('error on the answer', err);
//                             else console.log('The call was successfully answered by the code!')
//                         })

//                         if (!isChannelActive) return;

//                         const files = ['sound:basic/welcome', `sound:basic/business_name_${businessData.id}`, 'sound:basic/return_msg'];
//                         // const combineMedia = files.map(a => `sound:basic/${a}`).join(',');
//                         // await playPlaylistSip(channel, files);
//                         processInput(channel, session);
//                         channel.on('ChannelDtmfReceived', (event) => {
//                             // console.log(`User pressed: ${event.digit}`);
//                             processInput(channel, session, event.digit);
//                         })
//                     } catch (error) {
//                         console.error(`שגיאה בטיפול בערוץ ${channel.id}:`, error.message);
//                     }
//                 }
//                 else {
//                     isChannelActive = false
//                     await channel.hangup({ reason: 'normal' });
//                 }
//             }

//         })
//         client.on('StasisEnd', (event, channel) => {
//             console.log(`❌ The call on channel ${channel.id} disconnected.`);
//             isChannelActive = false
//         });
//     })
//     .catch((err) => {
//         console.error('❌ Critical error connecting to ARI:', err.message);
//     });

async function processInput(channel, session, input) {

    if (session.step === 'WELCOME') {
        session.step = 'MAIN_MENU';
        session.steps = [];
        // session.steps.push(session.step);
        processInput(channel, session)
    }
    else if (session.step === 'MAIN_MENU') {
        if (!input) {
            const file = ['sound:basic/main_menu'];
            playPlaylistSip(channel, file, ['1', '2', '3']);
            return;
        }

        if (input === '1') {
            session.mode = 'set';
            session.steps.push(session.step);
            session.step = 'SET_OPTIONS';
            processInput(channel, session);
            return;
        }
        else if (input === '2') {
            session.steps.push(session.step);
            session.step = 'ACCESS_APPOINMENT';
            processInput(channel, session);
            return;
        }
        else if (input === '3') {
            session.steps.push(session.step);
            session.step = 'BUSINESS_INFO';
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'SET_OPTIONS') {
        if (!input) {
            const file = ['sound:basic/set_options'];
            playPlaylistSip(channel, file, ['1', '2', '3', '*']);
            return;
        }

        if (input === '1') {
            session.type = 'normal'
            session.steps.push(session.step);
            session.step = 'CHOOSE_EMP_OR_ALL_EMP';
            processInput(channel, session);
            return;
        }
        else if (input === '2') {
            session.type = 'code'
            session.steps.push(session.step);
            session.step = 'CHOOSE_BY_CODE';
            processInput(channel, session);
            return;
        }
        else if (input === '3') {
            session.type = 'closest';
            session.steps.push(session.step);
            session.step = 'CHOOSE_EMP_OR_ALL_EMP';
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'CHOOSE_BY_CODE') {
        if (!input) {
            session.input = '';
            const file = ['sound:basic/set_by_code', 'sound:basic/to_reset'];
            playPlaylistSip(channel, file, ['#', '*']);
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
                    const employeeId = session.businessData.employee.find(e => e.employee_code === codeObj.employeeCode).id;
                    session.employeeId = employeeId;
                    session.employeeName = session.employeesNames[employeeId];
                    session.avaApps = null;
                    session.type = 'code';
                    session.steps.push(session.step);
                    session.step = 'DATE_CONFIRMATION';
                    processInput(channel, session, '1');
                    return
                }
                else {
                    const file = ['sound:basic/wrong_code'];
                    await playPlaylistSip(channel, file, ['!']);
                    processInput(channel, session);
                    return;
                }
            }
            else {
                console.log('Invalid code format');
                // messageReturnMenu(channel, session, 'Invalid code format', processInput)
                return;
            }
        }
        else if (input === '*') {
            if (session.input === '') {
                session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
            else {
                processInput(channel, session);
                // messageReturnMenu(channel, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'CHOOSE_EMP_OR_ALL_EMP') {
        if (!input) {
            const file = ['sound:basic/employee_selection'];
            playPlaylistSip(channel, file, ['1', '2', '*']);
            return;
        }

        if (input === '1') {
            session.steps.push(session.step);
            session.step = 'EMPLOYEE_CODE_REQ';
            session.count = 0;
            processInput(channel, session);
        }
        else if (input === '2') {
            session.steps.push(session.step);
            session.step = session.type === 'normal' ? 'CHOOSE_TYPE_DAY' : 'CLOSEST_APPOINTMENT';
            session.employeeName = 'all';
            session.employeeId = 0;
            processInput(channel, session);
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'EMPLOYEE_CODE_REQ') {
        if (!input) {
            session.input = '';
            const file = ['sound:basic/employee_code_req', 'sound:basic/to_reset'];
            playPlaylistSip(channel, file, ['*', '#']);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else if (input === '#') {
            if (session.input === '') {
                session.steps.push(session.step);
                session.step = 'CHOOSE_EMPLOYEE';
                session.count = 0;
                processInput(channel, session);
            }
            else {
                if (session.input.length !== 2) {
                    const file = ['sound:basic/wrong_code'];
                    await playPlaylistSip(channel, file, ['!']);
                    processInput(channel, session);
                    return;
                }

                const employeeId = session.businessData.employee.find(e => e.employee_code === session.input);
                if (!employeeId) {
                    const file = ['sound:basic/wrong_code'];
                    await playPlaylistSip(channel, file, ['!']);
                    processInput(channel, session);
                    return;
                }
                console.log(employeeId);
                session.employeeId = employeeId;
                session.employeeName = session.employeesNames[employeeId];
                session.steps.push(session.step);
                session.step = session.type === 'normal' ? session.date ? 'SAME_DATE' : 'CHOOSE_TYPE_DAY' : 'CLOSEST_APPOINTMENT';
                session.avaApps = null;
                processInput(channel, session);
            }
        }
        else if (input === '*') {
            if (session.input === '') {
                session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
            else {
                processInput(channel, session);
                // messageReturnMenu(channel, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'CHOOSE_EMPLOYEE') {
        if (!input) {
            // const file = '';
            session.itemsPerList = 0;
            const files = []
            const employeesNames = session.businessData.employee;
            const allowedDigits = ['*'];
            for (let i = 0; i < 4 && session.count < employeesNames.length; i++) {
                // file += `sound:basic/employee_${employeesNames[i].id},sound:basic/press,sound:basic/0${i + 1}`;
                files.push(`sound:basic/employee_${employeesNames[session.count++].id}`, `sound:basic/press,sound:basic/0${i + 1}`)
                allowedDigits.push(`${i + 1}`);
                session.itemsPerList++;
            }
            if (employeesNames.length > session.count) {
                files.push('sound:basic/next_hours_list');
                allowedDigits.push('5')
            }
            if (session.count > 4) {
                files.push('sound:basic/prev_hours_list');
                allowedDigits.push('6')
            }
            playPlaylistSip(channel, files, allowedDigits);
            return;
        }

        const employeesNames = session.businessData.employee;
        if (input >= '1' && input <= String(session.itemsPerList)) {
            const empIndex = (Math.ceil(session.count / 4) - 1) * 4 + Number(input) - 1;
            console.log(employeesNames[empIndex])
            session.employeeName = employeesNames[empIndex].name;
            session.employeeId = employeesNames[empIndex].id;
            session.steps.push(session.step);
            session.step = session.type === 'normal' ? session.date ? 'SAME_DATE' : 'CHOOSE_TYPE_DAY' : 'CLOSEST_APPOINTMENT';
            session.avaApps = null;
            processInput(channel, session);
            return;
        }
        else if (input === '5' && employeesNames.length > session.count) {
            processInput(channel, session);
        }
        else if (input === '6' && session.count > 4) {
            session.count -= session.itemsPerList + 4;
            processInput(channel, session)
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'CLOSEST_APPOINTMENT') {
        if (!input) {
            const appointment = await getClosestAppointment(session.businessData.id, session.employeeId);
            if (appointment) {
                session.appointment = appointment;
                const files = ['sound:basic/closest_appointment', ...convertDataToAudioFiles(appointment.date, 'date'), 'sound:basic/at_hour',
                    ...convertDataToAudioFiles(appointment.hour, 'hour'), `sound:basic/employee_${appointment.employeeId}`,
                    'sound:basic/closest_appointment_req'];
                playPlaylistSip(channel, files, ['1', '2', '3', '*']);
                return;
            }
        }
        const selectEmp = session.employeeId !== 0;
        if (input === '1') {
            session.date = session.appointment.date;
            session.inputHour = session.appointment.hour;
            session.employeeId = session.appointment.employeeId;
            session.step = 'HOUR_CONFIRMATION';
            processInput(channel, session, '1');
            return;
        }
        else if (input === '2') {
            session.appointment = null;
            session.step = 'SET_OPTIONS';
            processInput(channel, session);
            return;
        }
        else if (input === '3') {
            session.appointment = null;
            session.step = selectEmp ? 'CHOOSE_EMP_OR_ALL_EMP' : 'CHOOSE_EMPLOYEE';
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
    }
    else if (session.step === 'SAME_DATE') {
        if (!input) {
            const file = ['sound:basic/same_date'];
            playPlaylistSip(channel, file, ['*', '1', '2']);
            return;
        }

        if (input === '1') {
            session.steps.push(session.step);
            session.step = 'DATE_CONFIRMATION';
            processInput(channel, session, '1');
            return;
        }
        else if (input === '2') {
            session.steps.push(session.step);
            session.step = 'CHOOSE_TYPE_DAY';
            processInput(channel, session);
            return
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
    }
    else if (session.step === 'SAME_HOUR') {
        if (!input) {
            const file = ['sound:basic/same_hour'];
            playPlaylistSip(channel, file, ['*', '1', '2']);
            return;
        }

        if (input === '1') {
            session.steps.push(session.step);
            session.step = 'ENTER_MINUTES';
            processInput(channel, session, '#');
            return;
        }
        else if (input === '2') {
            session.steps.push(session.step);
            session.step = 'ENTER_HOUR';
            processInput(channel, session);
            return
        }
    }
    else if (session.step === 'CHOOSE_TYPE_DAY') {
        if (!input) {
            session.avaApps = null;
            session.date = null;
            const file = ['sound:basic/type_day_selection'];
            playPlaylistSip(channel, file, ['1', '2', '*']);
            return;
        }

        if (input === '1') {
            session.steps.push(session.step);
            session.step = 'CHOOSE_WEEK_DAY';
            processInput(channel, session);
            return;
        }
        else if (input === '2') {
            session.steps.push(session.step);
            session.step = 'ENTER_DAY';
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'CHOOSE_WEEK_DAY') {
        if (!input) {
            const file = ['sound:basic/week_day_selection'];
            playPlaylistSip(channel, file, ['1', '2', '3', '4', '5', '6', '7', '*']);
            return;
        }

        if (input >= '1' && input <= '7') {
            const date = convertStrDateToDate(input);
            if (date instanceof Date) {
                session.date = date;
                session.steps.push(session.step);
                session.step = 'DATE_CONFIRMATION';
                processInput(channel, session);
            }
            else {
                messageReturnMenu(channel, session, date, processInput)
            }
            return
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'ENTER_DAY') {
        if (!input) {
            session.input = '';
            const file = ['sound:basic/day_selection', 'sound:basic/to_reset'];
            playPlaylistSip(channel, file, ['#', '*']);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else if (input === '#') {
            if (Number(session.input) <= 31) {
                session.input += '*';
                session.steps.push(session.step);
                session.step = 'ENTER_MONTH';
                processInput(channel, session);
            }
            else {
                console.log('Invalid date format');
                processInput(channel, session);
                // messageReturnMenu(channel, session, 'Invalid date format', processInput)
            }
        }
        else if (input === '*') {
            if (session.input === '') {
                session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
            else {
                processInput(channel, session);
                // messageReturnMenu(channel, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'ENTER_MONTH') {
        if (!input) {
            const file = ['sound:basic/month_selection', 'sound:basic/to_reset'];
            playPlaylistSip(channel, file, ['#', '*']);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else if (input === '#') {
            const userInput = session.input;
            // session.input = '';
            const date = convertStrDateToDate(userInput, true);
            if (date instanceof Date) {
                session.date = date;
                session.steps.push(session.step);
                session.step = 'DATE_CONFIRMATION';
                processInput(channel, session);
            }
            else {
                console.log(date);
                // messageReturnMenu(channel, session, date, processInput)
            }
            return
        }
        else if (input === '*') {
            if (session.input.split('*')[1] === '') {
                stopPlaylist();
                session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
            else {
                session.input = session.input.split('*')[0] + '*';
                processInput(channel, session);
                // messageReturnMenu(channel, session, ivrMenu.reset, processInput)
                return;
            }
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'DATE_CONFIRMATION') {
        if (!input) {
            const date = session.date;
            const files = ['sound:basic/your_date', ...convertDataToAudioFiles(date, 'date'), 'sound:basic/confirmation', 'sound:basic/another_date'];
            playPlaylistSip(channel, files, ['1', '2', '*']);
            return;
        }


        if (input === '1') {
            // const employeesData = await getEmployeesByBusinessId(session.businessData.id, session.employeeName, session.date);
            // console.log(employeesData);
            // const avaEmp = checkEmployeesAppointmentWindow(session.date, employeesData);
            if (!session.avaApps) {
                const distantDate = checkdistantAppointmentWindow(session.date, session.businessData.employee);
                if (distantDate) {
                    session.step = 'CHOOSE_TYPE_DAY';
                    const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
                    session.steps.splice(index);
                    const files = ['sound:basic/over_booking_window', `${convertDateToStrAsterisk(distantDate)}`];
                    await playPlaylistSip(channel, files, ['!']);
                    processInput(channel, session);
                    return;
                }
                // const employeesShifts = bulidShiftsArr(avaEmp);
                // console.log(employeesShifts)
                // const employeesId = avaEmp.map(em => em.id);

                const appointments = await getAppointments(session.date, session.businessData.id, session.employeeId);
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
                session.hoursObj = null;
                if (session.inputHour) {
                    if (session.mode === 'set' && session.type === 'normal') {
                        session.step = 'SAME_HOUR';
                        processInput(channel, session);
                        return
                    }
                    else {
                        session.step = 'ENTER_MINUTES';
                        processInput(channel, session, '#');
                        return;
                    }
                }
                else {
                    session.step = 'ENTER_HOUR';
                }
            }
            else {
                session.step = 'NO_APPOINTMENTS_DATE';
            }
            // session.step = session.avaApps && session.avaApps.length > 0 ? session.inputHour ? 'ENTER_MINUTES' : 'ENTER_HOUR' : 'NO_APPOINTMENTS_DATE';
            processInput(channel, session);
            return;
        }
        else if (input === '2') {
            session.step = 'CHOOSE_TYPE_DAY';
            const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
            session.steps.splice(index);
            session.date = null;
            processInput(channel, session);
        }
        else if (input === '*') {
            session.input = session.input.split('*')[0] + '*';
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'NO_APPOINTMENTS_DATE') {
        const selectEmp = session.employeeName != 'all';
        if (!input) {
            const files = ['sound:basic/no_ava_app_date', 'sound:basic/select_another_date'];
            selectEmp ? files.push(',sound:basic/select_another_emp') : null;
            playPlaylistSip(channel, files, ['8', '9', '*']);
            return;
        }

        if (input === '8') {
            session.step = 'CHOOSE_TYPE_DAY';
            const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '9' && selectEmp) {
            session.step = 'CHOOSE_EMP_OR_ALL_EMP';
            const index = session.steps.indexOf('CHOOSE_EMP_OR_ALL_EMP');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            if (session.steps[session.steps.length - 1] === 'CHOOSE_WEEK_DAY') {
                session.step = session.steps.pop();
            }
            else {
                session.step = session.steps.splice(-2)[0];
            }
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }

    }
    else if (session.step === 'ENTER_HOUR') {
        if (!input) {
            session.hoursObj = null;
            session.input = '';
            session.inputHour = '';
            const file = ['sound:basic/hour_selection', 'sound:basic/to_reset'];
            playPlaylistSip(channel, file, ['#', '*']);
            return;

        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else if (input === '#') {
            const userInput = session.input;
            // session.input = '';
            const hour = convertNumbersToHour(userInput, true);
            if (!hour) {
                messageReturnMenu(channel, session, 'wrong format', processInput)
                return;
            }
            session.input = hour;
            const hoursObj = checkAvaliablesHours(session.avaApps, hour);
            session.hoursObj = hoursObj;
            console.log(hoursObj);
            session.steps.push(session.step);
            if (hoursObj.avaHours.length === 0) {
                session.step = 'NO_APPOINTMENTS_HOUR';
                processInput(channel, session);
            }
            else if (hoursObj.hasReqHours && hoursObj.avaHours.length === 1 && hoursObj.avaHours[0].emps.length === 1) {
                const avaHours = hoursObj.avaHours[0];
                session.finalHour = { hour: avaHours.hour, emp: avaHours.emps[0] };
                session.step = 'HOUR_CONFIRMATION';
                processInput(channel, session);
            }
            else if (hoursObj.hasReqHours && hoursObj.avaHours.length === 1) {
                session.finalHour = { hour: hoursObj.avaHours[0].hour };
                session.step = 'CHOOSE_EMPLOYEE_HOUR';
                session.count = 0;
                processInput(channel, session);
                return;
            }
            else if (!hoursObj.specificHour && hoursObj.hasReqHours) {
                session.step = 'ENTER_MINUTES';
                session.input += '*';
                processInput(channel, session);
            }
            else if (!hoursObj.hasReqHours) {
                session.step = 'BEFORE_AFTER_HOURS';
                session.hoursList = hoursObj.avaHours;
                session.inputHour = hour;
                processInput(channel, session);
            }
        }
        else if (input === '*') {
            if (session.input === '') {
                session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
            else {
                processInput(channel, session);
                // messageReturnMenu(channel, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'ENTER_MINUTES') {
        if (!input) {
            const file = ['sound:basic/minutes_selection', 'sound:basic/to_reset'];
            playPlaylistSip(channel, file, ['#', '*']);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }
        else if (input === '#') {
            let hoursObj = session.hoursObj;
            let hour;
            if (hoursObj && session.input.length > 3) {
                const userInput = session.input;
                hour = convertNumbersToHour(userInput, false);
                if (!hour) {
                    session.input = session.input.split('*')[0];
                    messageReturnMenu(channel, session, 'wrong format', processInput)
                    return;
                }
                hoursObj = checkAvaliablesHours(session.avaApps, hour, session.hoursObj);
            }
            else if (!hoursObj) {
                hour = session.inputHour;
                const includeMinute = hour.length === 2 ? false : true;
                hoursObj = checkAvaliablesHours(session.avaApps, hour, null, includeMinute);
            }
            console.log(hour)
            console.log(hoursObj);
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
                session.count = 0;
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
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            stopPlaylist();
            if (session.input.split('*')[1] === '') {
                session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
            else {
                session.input = session.input.split('*')[0] + '*';
                processInput(channel, session)
                // messageReturnMenu(channel, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'NO_APPOINTMENTS_HOUR') {
        if (!input) {
            const selectEmp = session.employeeName != 'all';
            channel.emit('play_audio', `${ivrMenu.no_ava_app_hour} ${ivrMenu.select_another_hour}
                ${ivrMenu.select_another_date} ${selectEmp ? ivrMenu.select_another_emp : ''}`)
            return;
        }
        processSomeInputs(input, session, channel, selectEmp, ivrMenu.wrong_choice, processInput);

        // if (input === '7') {
        //     session.step = 'ENTER_HOUR';
        //     processInput(channel, session);
        //     return;
        // }
        // else if (input === '8') {
        //     session.step = 'CHOOSE_TYPE_DAY';
        //     processInput(channel, session);
        //     return;
        // }
        // else if (input === '9' && selectEmp) {
        //     session.step = 'CHOOSE_EMP_OR_ALL_EMP';
        //     processInput(channel, session);
        //     return;
        // }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
        return;
    }
    else if (session.step === 'CHOOSE_HOUR') {
        const hoursObj = session.hoursList;
        const selectEmp = session.employeeName != 'all';
        if (!input) {
            // let flie = ``;
            const files = [];
            const allowedDigits = ['*', '7', '8']
            session.itemsPerList = 0;
            for (let i = 0; i < 4 && session.count < hoursObj.length; i++) {
                session.itemsPerList += 1;
                files.push('sound:basic/for_hour', ...convertDataToAudioFiles(hoursObj[session.count++].hour, 'hour'),
                    `sound:basic/press`, `sound:basic/0${i + 1}`);
                allowedDigits.push(`${i + 1}`);
            }
            if (hoursObj.length > session.count) {
                files.push('sound:basic/next_hours_list');
                allowedDigits.push('5')
            }
            if (session.count > 4) {
                files.push('sound:basic/prev_hours_list');
                allowedDigits.push('6')

            }
            files.push('sound:basic/select_another_hour', 'sound:basic/select_another_date');
            if (selectEmp) {
                files.push('sound:basic/select_another_emp');
                allowedDigits.push('9');
            }
            playPlaylistSip(channel, files, allowedDigits);
            return;
        }

        if (input >= '1' && input <= String(session.itemsPerList)) {
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
                processInput(channel, session);
                return;
            }
            else {
                session.step = 'CHOOSE_EMPLOYEE_HOUR';
                session.count = 0;
                processInput(channel, session);
                return;
            }
        }
        else if (input === '5' && hoursObj.length > session.count) {
            processInput(channel, session);
        }
        else if (input === '6' && session.count > 4) {
            session.count -= session.itemsPerList + 4;
            processInput(channel, session)
        }
        else if (input === '7') {
            session.step = 'ENTER_HOUR';
            const index = session.steps.indexOf('ENTER_HOUR');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '8') {
            session.step = 'CHOOSE_TYPE_DAY';
            const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '9' && selectEmp) {
            session.step = 'CHOOSE_EMP_OR_ALL_EMP';
            const index = session.steps.indexOf('CHOOSE_EMP_OR_ALL_EMP');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     session.count -= session.itemsPerList;
        //     processInput(channel, session);
        //     // messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'BEFORE_AFTER_HOURS') {
        const hoursObj = session.hoursObj.avaHours;
        const selectEmp = session.employeeName !== 'all';
        const hasBefore = hoursObj[hoursObj.length - 1].index > 0;
        const hasAfter = hoursObj[0].index < session.avaApps.length;
        if (!input) {
            // let file = 'sound:basic/no_ava_app_hour,';
            const files = ['sound:basic/no_ava_app_hour'];
            const allowedDigits = ['*', '7', '8'];
            // let msg = ivrMenu.no_ava_app_hour;
            for (let i = 0; i < hoursObj.length; i++) {
                // const hourData = hoursObj[i].hour.split('-');
                const hour = hoursObj[i].hour.slice(0, 5);
                if (hour > session.inputHour) {
                    files.push('sound:basic/closest_after_hour');
                } else {
                    files.push('sound:basic/closest_before_hour');
                }
                files.push('sound:basic/at_hour', ...convertDataToAudioFiles(hour, 'hour'), 'sound:basic/to_select', `sound:basic/0${i + 1}`);
                allowedDigits.push(`${i + 1}`);
            }
            let avaApps;
            if (selectEmp) {
                avaApps = await getAppointments(session.date, session.businessData.id, 0, session.inputHour);
                if (avaApps.length > 0) {
                    session.avaAppsAnotherEmps = avaApps;
                    files.push('sound:basic/check_another_emp')
                    allowedDigits.push('3');
                    console.log(avaApps);
                }
            }
            files.push('sound:basic/select_another_hour', 'sound:basic/select_another_date');
            if (selectEmp) {
                files.push('sound:basic/select_another_emp');
                allowedDigits.push('9');
            }
            playPlaylistSip(channel, files, allowedDigits);
            return;
        }

        if (input === '1' || input === '2' && hoursObj.length === 2) {
            const hourData = hoursObj[Number(input) - 1];
            console.log(session.inputHour)
            session.finalHour = { hour: hourData.hour };
            session.steps.push(session.step);
            if (hourData.emps.length === 1) {
                session.finalHour.emp = hourData.emps[0];
                console.log(session.finalHour);
                session.step = 'HOUR_CONFIRMATION';
                processInput(channel, session);
                return;
            }
            else {
                session.step = 'CHOOSE_EMPLOYEE_HOUR';
                session.count = 0;
                processInput(channel, session);
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
            processInput(channel, session);
            return;
        }
        // else if (input === '3' && hasAfter) {
        //     session.step = 'HOURS_AFTER_SELECT';
        //     session.count = hoursObj[0].index + 1;
        //     processInput(channel, session);
        // }
        // else if (input === '4' && hasBefore) {
        //     session.step = 'HOURS_BEFORE_SELECT';
        //     session.count = hoursObj[session.length - 1].index - 1;
        //     processInput(channel, session);
        // }
        else if (input === '7') {
            session.step = 'ENTER_HOUR';
            const index = session.steps.indexOf('ENTER_HOUR');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '8') {
            session.step = 'CHOOSE_TYPE_DAY';
            const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '9' && selectEmp) {
            session.step = 'CHOOSE_EMP_OR_ALL_EMP';
            const index = session.steps.indexOf('CHOOSE_EMP_OR_ALL_EMP');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'CHOOSE_EMPLOYEE_HOUR') {
        if (!input) {
            session.anotherEmployees = session.hoursObj.avaHours.find(h => h.hour === session.finalHour.hour).emps;
            const emps = session.anotherEmployees;
            session.itemsPerList = 0;
            const files = [];
            const allowedDigits = ['*', '7', '8', '9'];
            for (let i = 0; i < 4 && session.count < emps.length; i++) {
                files.push(`sound:basic/employee_${emps[session.count++]}`, 'sound:basic/press', `sound:basic/0${i + 1}`);
                allowedDigits.push(`${i + 1}`);
                session.itemsPerList++;
            }
            if (emps.length > session.count) {
                files.push('sound:basic/next_hours_list');
                allowedDigits.push('5')
            }
            if (session.count > 4) {
                files.push('sound:basic/prev_hours_list');
                allowedDigits.push('6')
            }
            files.push('sound:basic/select_another_hour', 'sound:basic/select_another_date', 'sound:basic/select_another_emp');
            playPlaylistSip(channel, files, allowedDigits);
            return;
        }

        const emps = session.anotherEmployees;
        if (input >= '1' && input <= String(session.itemsPerList)) {
            session.steps.push(session.step);
            session.finalHour.emp = emps[Number(input) - 1];
            session.step = 'HOUR_CONFIRMATION';
            processInput(channel, session);
            return;
        }
        else if (input === '5' && emps.length > session.count) {
            processInput(channel, session);
        }
        else if (input === '6' && session.count > 4) {
            session.count -= session.itemsPerList + 4;
            processInput(channel, session)
        }
        else if (input === '7') {
            session.step = 'ENTER_HOUR';
            const index = session.steps.indexOf('ENTER_HOUR');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '8') {
            session.step = 'CHOOSE_TYPE_DAY';
            const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '9') {
            session.step = 'CHOOSE_EMP_OR_ALL_EMP';
            const index = session.steps.indexOf('CHOOSE_EMP_OR_ALL_EMP');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'HOUR_CONFIRMATION') {
        const selectEmp = session.employeeName !== 'all';
        const hourData = session.finalHour;
        // const [h, m, s] = hourData.hour.split(':').map(Number);
        if (!input) {
            const files = [];
            files.push('sound:basic/chosen_hour', ...convertDataToAudioFiles(hourData.hour, 'hour'), `sound:basic/employee_${hourData.emp}`,
                'sound:basic/confirmation', 'sound:basic/select_another_hour');
            playPlaylistSip(channel, files, ['*', '1', '7']);
            return;
        }

        if (input === '1') {
            let fullTimeDate = null;
            let employeeId;
            if (session.type !== 'closest') {
                const dateStr = moment(session.date).tz('Asia/Jerusalem').format('YYYY-MM-DD');
                const fullTimeStr = `${dateStr} ${hourData.hour}`;
                fullTimeDate = moment.tz(fullTimeStr, "YYYY-MM-DD HH:mm:ss", "Asia/Jerusalem").toDate();
                employeeId = hourData.emp;
            }
            else {
                fullTimeDate = session.appointment.appointmentDateTime;
                employeeId = session.employeeId;
            }
            // const appData = {
            //     businessId: session.usinessData.id, employeeId: Number(hourData.emp),
            //     appointmentDateTime: fullTimeDate, bookingPhone: session.bookingPhone
            // }
            if (session.mode === 'set') {
                // const appData = { bookingPhone: session.bookingPhone, status: 'pending' }
                const whereData = {
                    businessId: session.businessData.id, employeeId,
                    appointmentDateTime: fullTimeDate,
                }
                try {
                    // const appointment = await createNewAppointment(appData);
                    const appointment = await lockAppointment(session.bookingPhone, whereData);
                    session.appointment = appointment;
                    console.log(appointment);
                    session.step = 'CHANGE_CONTACT_PHONE_REQ';
                    processInput(channel, session);
                } catch (err) {
                    console.log(err.message);
                }
            }
            else {
                try {
                    const result = updateAppointmentDateTime(session.appointment, fullTimeDate);
                    if (result) {
                        session.appointment.appointmentDateTime = fullTimeDate;
                        const file = ['sound:basic/update_successfully'];
                        session.step = 'UPDATE_OPTIONS';
                        const index = session.steps.indexOf('UPDATE_OPTIONS');
                        session.steps.splice(index);
                        await playPlaylistSip(channel, file, ['!']);
                        processInput(channel, session);
                        return;
                    }
                } catch (err) {
                    console.log(err.message);
                }
            }
        }
        else if (input === '7') {
            session.step = 'ENTER_HOUR';
            const index = session.steps.indexOf('ENTER_HOUR');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '8') {
            session.step = 'CHOOSE_TYPE_DAY';
            const index = session.steps.indexOf('CHOOSE_TYPE_DAY');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '9' && selectEmp) {
            session.step = 'CHOOSE_EMP_OR_ALL_EMP';
            const index = session.steps.indexOf('CHOOSE_EMP_OR_ALL_EMP');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
    }
    else if (session.step === 'CHANGE_CONTACT_PHONE_REQ') {
        if (!input) {
            const files = ['sound:basic/save_dailed_number', 'sound:basic/change_contact_phone_req'];
            playPlaylistSip(channel, files, ['*', '1', '2']);
            return;
        }

        if (input === '1') {
            session.steps.push(session.step);
            session.contactPhone = session.appointment.bookingPhone;
            const reminderTime = session.businessData.reminderTime;
            if (reminderTime === 'none') session.step = 'APPOINTMENT_CONFIRMATION';
            else if (reminderTime === 'customer_choice') session.step = 'REMINDER_REQ';
            else session.businessData.notifictionChannel.length > 1 ? 'REMINDER_CHANNEL' : 'APPOINTMENT_CONFIRMATION';
            processInput(channel, session);
            return
        }
        else if (input === '2') {
            session.steps.push(session.step);
            session.step = 'CHANGE_CONTACT_PHONE';
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'CHANGE_CONTACT_PHONE') {
        if (!input) {
            session.input = '';
            const file = ['sound:basic/change_contact_phone', 'sound:basic/to_reset'];
            playPlaylistSip(channel, file, ['*', '#']);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }

        else if (input === '#') {
            if (session.input.length < 9 || session.input.length > 10) {
                const file = ['sound:basic/wrong_phone_number'];
                await playPlaylistSip(channel, file, ['!']);
                processInput(channel, session);
                // messageReturnMenu(channel, session, ivrMenu.wrong_phone_number, processInput);
                return;
            }
            session.steps.push(session.step);
            session.step = 'PHONE_CONFIRMATION';
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            if (session.input === '') {
                session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
            else {
                processInput(channel, session)
                // messageReturnMenu(channel, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'PHONE_CONFIRMATION') {
        if (!input) {
            const files = ['sound:basic/phone_confirmation', ...convertDataToAudioFiles(session.input, 'phone'),
                'sound:basic/confirmation', 'sound:basic/another_phone'];
            playPlaylistSip(channel, files, ['*', '1', '2']);
            return;
        }

        if (input === '1') {
            session.contactPhone = session.input;
            if (session.mode === 'update') {
                session.step = 'APPOINTMENT_CONFIRMATION';
                processInput(channel, session);
                return;
            }
            session.reminderOptions = {};

            const reminderTime = session.businessData.reminderTime;
            if (reminderTime === 'none') session.step = 'APPOINTMENT_CONFIRMATION';
            else session.step = 'REMINDER_REQ';
            processInput(channel, session);
        }
        else if (input === '2') {
            session.step = session.steps.splice(-2)[0];
            // session.step = 'CHANGE_CONTACT_PHONE_REQ';
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput);
        //     return;
        // }
    }
    else if (session.step === 'REMINDER_REQ') {
        if (!input) {
            const file = ['sound:basic/reminder_req'];
            playPlaylistSip(channel, file, ['*', '1', '2']);
            return;
        }

        if (input === '1') {
            session.steps.push(session.step);
            session.reminderOptions = {};
            const reminderTime = session.businessData.reminderTime;
            if (reminderTime === 'customer_choice') session.step = 'REMINDER_TIME';
            else {
                session.reminderOptions.time = reminderTime;
                const notifictionChannel = session.businessData.notifictionChannel;
                if (notifictionChannel.length > 1) {
                    session.step = 'REMINDER_CHANNEL';
                }
                else {
                    session.reminderOptions.channel = notifictionChannel[0];
                    session.step = 'APPOINTMENT_CONFIRMATION';
                }
            }
            processInput(channel, session);
            return;
        }
        else if (input === '2') {
            session.steps.push(session.step);
            session.step = 'APPOINTMENT_CONFIRMATION';
            processInput(channel, session);
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'REMINDER_TIME') {
        if (!input) {
            const file = ['sound:basic/reminder_time'];
            playPlaylistSip(channel, file, ['*', '1', '2', '3']);
            return;
        }

        if (input >= '1' && input <= '3') {
            if (input === '1') session.reminderOptions.time = '24h';
            else if (input === '2') session.reminderOptions.time = 'evening';
            else session.reminderOptions.time = 'morning';
            session.steps.push(session.step);
            const notifictionChannel = session.businessData.notifictionChannel;
            if (notifictionChannel.length > 1) {
                session.step = 'REMINDER_CHANNEL';
            }
            else {
                session.reminderOptions.channel = notifictionChannel[0];
                session.step = 'APPOINTMENT_CONFIRMATION';
            }
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'REMINDER_CHANNEL') {
        const notifictionChannel = session.businessData.notifictionChannel;
        if (!input) {
            const files = [];
            const allowedDigits = ['*'];
            for (let i = 0; i < notifictionChannel.length; i++) {
                files.push(`sound:basic/${notifictionChannel[i]}`, 'sound:basic/press', `sound:basic/0${i + 1}`);
                allowedDigits.push(`${i + 1}`);
            }
            playPlaylistSip(channel, files, allowedDigits);
            return;
        }

        if (input >= '1' && input <= notifictionChannel.length.toString()) {
            session.reminderOptions.channel = notifictionChannel[Number(input) - 1];
            session.steps.push(session.step);
            session.step = 'APPOINTMENT_CONFIRMATION';
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'APPOINTMENT_CONFIRMATION') {
        if (!input) {
            let extentionData = {};
            if (session.mode === 'set') {
                const app = session.appointment;
                extentionData = { contactPhone: session.contactPhone, reminderOptions: session.reminderOptions };
                whereData = { uuid: app.uuid, token: app.accessToken };
                try {
                    const bookedApp = await bookAppointment(extentionData, whereData);
                    session.appointment = bookedApp;
                } catch (err) {
                    console.log(err.message);
                }
            }
            else if (session.mode === 'update') {
                if (session.reminderOptions) {
                    extentionData.reminderOptions = session.reminderOptions;
                }
                if (session.contactPhone) {
                    extentionData.contactPhone = session.contactPhone
                }
                const app = session.appointment;
                try {
                    const updateApp = await updateExtensions(app.uuid, app.token, extentionData);
                    session.appointment = updateApp
                } catch (err) {
                    console.log(err.message);
                }
            }
            session.contactPhone = '';
            session.reminderOptions = null;
            const files = [];
            let resetStep = '';
            if (session.mode === 'set') {
                files.push('sound:basic/success_schedule', ...convertDataToAudioFiles(update.bookingCode, 'bookingCode'),
                    'sound:basic/booking_code_info')
                resetStep = 'CHOOSE_EMP_OR_ALL_EMP';
                session.step = 'APPOINTMENT_OPTIONS';
            }
            else {
                files.push('sound:basic/update_successfully');
                resetStep = 'UPDATE_OPTIONS';
                session.step = 'UPDATE_OPTIONS';
            }
            const index = session.steps.indexOf(resetStep);
            session.steps.splice(index);
            await playPlaylistSip(channel, files, ['!']);
            processInput(channel, session);
            // messageReturnMenu(channel, session, msg, processInput, dur);
            return;
        }
        else {
            // messageReturnMenu(channel, session, ivrMenu.error);
            return;
        }
    }
    else if (session.step === 'ACCESS_APPOINMENT') {
        if (!input) {
            session.input = '';
            session.count = 0;
            const file = ['sound:basic/access_appointmet_req', 'sound:basic/to_reset'];
            playPlaylistSip(channel, file, ['*', '#']);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }

        if (input === '#') {
            // if (session.input.length !== 8) {
            //     const file = ['sound:basic/wrong_code'];
            //     await playPlaylistSip(channel, file, ['!']);
            //     processInput(channel, session);
            //     return;
            // }
            const userInput = Number(session.input);
            session.input = '';

            const appointment = await accessAppointmentByBookingCode(session.businessData.id, 65910283);
            if (appointment) {
                session.appointment = appointment;
                if (appointment.contactPhone === session.bookingCode) {
                    session.step = 'APPOINTMENT_OPTIONS';
                }
                else {
                    session.count = 0;
                    session.steps.push(session.step);
                    session.step = 'SECURITY_CHECK';
                }
                processInput(channel, session)
                return
            }
            else {
                const file = ['sound:basic/wrong_code'];
                await playPlaylistSip(channel, file, ['!']);
                processInput(channel, session);
                return;
            }
        }
        else if (input === '*') {
            if (session.input === '') {
                session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
            else {
                processInput(channel, session);
                return;
            }
        }
    }
    else if (session.step === 'SECURITY_CHECK') {
        if (!input) {
            session.count++;
            session.input = '';
            const file = ['sound:basic/security_check', 'sound:basic/to_reset'];
            playPlaylistSip(channel, file, ['*', '#']);
            return;
        }

        if (input >= '0' && input <= '9') {
            session.input += input;
            return;
        }

        if (input === '#') {
            // if (session.input.length !== 4) {
            //     messageReturnMenu(channel, session, ivrMenu.booking_code_length, processInput);
            //     return;
            // }
            const userInput = session.input;
            if (session.appointment.contactPhone.slice(-4) === '6150') {
                session.step = 'APPOINTMENT_OPTIONS';
                console.log(session.appointment)
                processInput(channel, session);
                return;
            }
            else {
                const file = ['sound:basic/wrong_security_check'];
                await playPlaylistSip(channel, file, ['!']);
                if (session.count === 4) session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
        }
        else if (input === '*') {
            if (session.input === '') {
                session.step = session.steps.pop();
                processInput(channel, session);
                return;
            }
            else {
                processInput(channel, session)
                // messageReturnMenu(channel, session, ivrMenu.reset, processInput)
                return;
            }
        }
    }
    else if (session.step === 'APPOINTMENT_OPTIONS') {
        if (!input) {
            const file = ['sound:basic/appointment_options'];
            playPlaylistSip(channel, file, ['*', '1', '2', '3', '4']);
            return;
        }

        if (input === '1') {
            const appointment = session.appointment;
            const date = appointment.date;
            const files = [...convertDataToAudioFiles(date, 'date'), 'sound:basic/at_hour',
            ...convertDataToAudioFiles(appointment.hour, 'hour'), `sound:basic/employee_${appointment.employeeId}`];
            await playPlaylistSip(channel, files, ['*']);
            processInput(channel, session);
            return;
        }
        else if (input === '2') {
            session.steps.push(session.step);
            session.step = 'UPDATE_OPTIONS';
            processInput(channel, session);
            return;
        }
        else if (input === '3') {
            session.steps.push(session.step);
            session.step = 'CANCEL_CONFIRMATION';
            processInput(channel, session);
            return;
        }
        else if (input === '4') {
            const files = convertDataToAudioFiles(session.appointment.bookingCode, 'bookingCode');
            await playPlaylistSip(channel, files, ['*']);
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = 'MAIN_MENU';
            const index = session.steps.indexOf('MAIN_MENU');
            session.steps.splice(index);
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'UPDATE_OPTIONS') {
        const reminderTime = session.businessData.reminderTime;
        if (!input) {
            session.mode = 'update';
            const allowedDigits = ['*', '1', '2'];
            const files = ['sound:basic/update_options'];
            if (reminderTime !== 'none') {
                files.push('sound:basic/update_reminder');
                allowedDigits.push('3');
            }
            playPlaylistSip(channel, files, allowedDigits);
            return
        }

        if (input === '1') {
            session.steps.push(session.step);
            session.step = 'UPDATE_DETAILS_OPTIONS';
            processInput(channel, session);
            return;
        }
        else if (input === '2') {
            session.steps.push(session.step);
            session.step = 'CHANGE_CONTACT_PHONE';
            processInput(channel, session);
            return;
        }
        else if (input === '3' && reminderTime !== 'none') {
            session.reminderOptions = {};
            session.steps.push(session.step);
            session.step = 'REMINDER_REQ';
            processInput(channel, session);
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'UPDATE_DETAILS_OPTIONS') {
        if (!input) {
            session.anotherEmployees = null;
            const file = ['sound:basic/update_time_options'];
            const anotherEmps = await getEmployeesSameAppoinment(session.businessData.id, session.appointment.appointmentDateTime);
            console.log(anotherEmps)
            if (anotherEmps && anotherEmps.length > 0) {
                file.push('sound:basic/update_employee');
                session.anotherEmployees = anotherEmps;
            }
            playPlaylistSip(channel, file, ['*', '1', '2']);
            return;
        }

        if (input === '1') {
            session.date = session.appointment.date;
            session.employeeId = session.appointment.employeeId;
            session.employeeName = session.employeesNames[session.employeeId];
            session.steps.push(session.step);
            session.step = 'DATE_CONFIRMATION';
            processInput(channel, session, '1');
            return;
        }
        else if (input === '2') {
            session.inputHour = session.appointment.hour;
            session.employeeId = session.appointment.employeeId;
            session.employeeName = session.employeesNames[session.employeeId];
            session.steps.push(session.step);
            session.step = 'CHOOSE_TYPE_DAY';
            processInput(channel, session);
            return;
        }
        else if (input === '3') {
            session.date = session.appointment.date;
            session.inputHour = session.appointment.hour;
            session.step = 'UPADTE_EMPLOYEE';
            processInput(channel, session);
            return;
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'UPADTE_EMPLOYEE') {
        if (!input) {
            const emps = session.anotherEmployees;
            session.itemsPerList = 0;
            const files = [];
            const allowedDigits = ['*'];
            for (let i = 0; i < 4 && session.count < emps.length; i++) {
                files.push(`sound:basic/employee_${emps[session.count++]}`, 'sound:basic/press', `sound:basic/0${i + 1}`);
                allowedDigits.push(`${i + 1}`);
                session.itemsPerList++;
            }
            if (emps.length > session.count) {
                files.push('sound:basic/next_hours_list');
                allowedDigits.push('5')
            }
            if (session.count > 4) {
                files.push('sound:basic/prev_hours_list');
                allowedDigits.push('6')
            }
            files.push('sound:basic/select_another_hour', 'sound:basic/select_another_date', 'sound:basic/select_another_emp');
            playPlaylistSip(channel, files, allowedDigits);
            return;
        }

        const emps = session.anotherEmployees;
        if (input >= '1' && input <= String(session.itemsPerList)) {
            const newEmp = emps[Number(input - 1)];
            const app = session.appointment;
            const result = await updateAppointmentEmployee(app, newEmp);
            if (result) {
                app.employeeId = newEmp;
            }

            resetStep = 'UPDATE_OPTIONS';
            session.step = 'UPDATE_OPTIONS';
            const index = session.steps.indexOf(resetStep);
            session.steps.splice(index);
            const file = ['sound:basic/update_successfully'];
            await playPlaylistSip(channel, file, ['!']);
            processInput(channel, session);
            return;
        }
        else if (input === '5' && emps.length > session.count) {
            processInput(channel, session);
        }
        else if (input === '6' && session.count > 4) {
            session.count -= session.itemsPerList + 4;
            processInput(channel, session)
        }
        else if (input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
        // else if (input) {
        //     messageReturnMenu(channel, session, ivrMenu.wrong_choice, processInput)
        //     return;
        // }
    }
    else if (session.step === 'CANCEL_CONFIRMATION') {
        if (!input) {
            const file = ['sound:basic/cancel_confirmation'];
            playPlaylistSip(channel, file, ['*', '1', '2']);
            return;
        }

        if (input === '1') {
            const app = session.appointment;
            try {
                await cancelAppointment(app.uuid, app.accessToken);
                session.step = session.steps.pop();
                const file = ['sound:basic/update_successfully'];
                await playPlaylistSip(channel, file, ['!']);
                processInput(channel, session);
                return;
            } catch (err) {
                console.log(err.message);
                return;
            }
            // const result = await updateAppointment({ status: 'cancelled' }, { bookingCode: session.appointment.bookingCode }, 'cancel');
            // if (result) {
            //     session.step = session.steps.pop();
            //     const file = ['sound:basic/update_successfully'];
            //     await playPlaylistSip(channel, file, ['!']);
            //     processInput(channel, session);
            //     return;
            // }
            // return;
        }
        else if (input === '2' || input === '*') {
            session.step = session.steps.pop();
            processInput(channel, session);
            return;
        }
    }
}

// server.listen(3000, () => {
//     console.log('🚀 השרת רץ בכתובת: http://localhost:3000');
// });
