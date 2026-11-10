const { default: chalk } = require("chalk");
const express = require("express");
const path = require('path');
const PORT = 3000;
const { error } = require("console");
const { sequelize } = require('./utils/database');
const { sendMsgBack, allJewishHolidays, checkDateForRestDay, convertStrDateToDate, 
    checkEmployeesAppointmentWindow, generateSlotsFromTime, bulidShiftsArr, 
    allAvaliableApponintments, generate8DigitsNumber, convertNumbersToHour, checkAvaliablesHours } = require("./utils/utils");
const { getBusinessIdByPhoneNum, getEmployeesByBusinessId, getShiftsByDay, getAppointments, createNewEmployee, createNewAppointment, confirmedAppointment } = require("./utils/DBFanctions");
const { DATE } = require("sequelize");
require('dotenv').config();


const app = express();

app.use(express.json());

app.get('/', async (req, res) => {
    res.send("Whatsapp with Node.js and webhooks")
    // allJewishHolidays();
    // console.log(checkDateForRestDay(new Date(2026, 4, 8))); // months start with 0

    const id = await getBusinessIdByPhoneNum('0501234567');
    const date = convertStrDateToDate('19*5');
    if (date instanceof Date) {
        console.log(date.toLocaleDateString())
        console.log('rest day:', checkDateForRestDay(date))
        const employeesData = await getEmployeesByBusinessId(id.id, null, date);
        console.log('all employees: ', employeesData);
        const avaEmp = checkEmployeesAppointmentWindow(date, employeesData);
        const employeesShifts = bulidShiftsArr(avaEmp);
        const employeesId = avaEmp.map(em => em.id);
        const appointments = await getAppointments(date, id, employeesId);
        const avaApps = allAvaliableApponintments(employeesShifts, appointments);
        console.log('Avaliable appointments', avaApps);
        const hour = convertNumbersToHour('720');
        console.log(hour)
        const hours = checkAvaliablesHours(avaApps, hour);
        console.log(hours);
        // const wh = await getShiftsByDay(date, id.id, employeesId);

    }
    else console.log(date);

    // console.log(generateSlotsFromTime('08:00:00', '16:00:00', 20));
    // const employeesData = {name: 'חיים שמש', businessId: 2, employeeNum: 2347, contactPhone: '0548123455'};
    // const employeeConfigs = {};
    // const shifts = [{businessId: 2, dayOfWeek: 0, startTime: '08:00:00', endTime: '16:00:00'},
    //     {businessId: 2, dayOfWeek: 1, startTime: '08:00:00', endTime: '16:00:00'},
    //     {businessId: 2, dayOfWeek: 2, startTime: '08:00:00', endTime: '13:00:00'},
    //     {businessId: 2, dayOfWeek: 3, startTime: '08:00:00', endTime: '16:00:00'},
    //     {businessId: 2, dayOfWeek: 4, startTime: '08:00:00', endTime: '16:00:00'},
    //     {businessId: 2, dayOfWeek: 5, startTime: '08:00:00', endTime: '12:00:00'}
    // ]

    // const allEmployeeData = await createNewEmployee(employeesData, shifts, employeeConfigs);
    // console.log(generate8DigitsNumber());
    // const appointmentData = {businessId: 2, employeeId: 5,
    //      appointmentDateTime: '2026-05-18 12:20:00', contactPhone: '0552346789', bookingPhone: '0552346789'}
    // try {
    //     await createNewAppointment(appointmentData);
    // }catch (err){
    //     console.log(err.message);
    // }

    // const updateData = {contactPhone: '0559998821', status: 'confirmed', hasNotifictions: false};
    // const whereData = {businessId: 1, employeeId: 2, appointmentDateTime: '2026-05-06 12:00:00', status: 'pending'}
    // confirmedAppointment(updateData, whereData);

})

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];
    if (mode && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
})

app.post('/webhook', async (req, res) => {
    console.log(JSON.stringify(req.body, null, 2));
    const { entry } = req.body;
    if (!entry || entry.length === 0) {
        res.status(400).send('Invalid request');
    }
    // console.log(entry[0].changes)
    const { changes } = entry[0];
    if (!changes || changes.length === 0) {
        res.status(400).send('Invalid request');
    }

    const contact = changes[0].value.contacts ? changes[0].value.contacts[0] : null
    const messages = changes[0].value.messages ? changes[0].value.messages[0] : null

    if (contact && messages) {
        const response = await sendMsgBack(contact, messages)
        if (response) {
            res.status(200).send('webhook processed')
        }
    }

    // console.log(contact.profile.name, contact['wa_id']);
})

// app.listen(PORT, async function () {
//     console.log(chalk.blue('Server is running!'));
//     try {
//         await sequelize.authenticate();
//         // await sessionStore.sync();
//         console.log(chalk.green('connection has been established successfully'));
//     }
//     catch {
//         console.error(chalk.red('Unable to connect to the database:', error));
//     }
// })