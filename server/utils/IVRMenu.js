const { getEmployeesByBusinessId, getAppointments } = require("./DBFanctions");
const { convertStrDateToDate, checkEmployeesAppointmentWindow, bulidWorkingHoursArr, allAvaliableApponintments } = require("./utils");


const processInputGeneral = (socket, session, input) => {
if (session.step === 'WELCOME') {
        session.step = 'CHOOSE_EMP_OR_ALL_EMP';
        // session.steps.push(session.step);
        processInputGeneral(socket, session)
    }
    else if (session.step === 'CHOOSE_EMP_OR_ALL_EMP') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.employee_selection}`);
            return;
        }
        else if (input === '1') {
            session.step = 'CHOOSE_EMPLOYEE';
            // session.steps.push(session.step);
            processInputGeneral(socket, session);
        }
        else if (input === '2') {
            session.step = 'CHOOSE_TYPE_DAY';
            // session.steps.push(session.step);
            session.employeeName = 'all';
            processInputDate(socket, session);
        }
        else if (input) {
            wrongChoiseReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
            return;
        }
        // else {
        //     socket.emit('play_audio', `${ivrMenu.wrong_choice}, ${ivrMenu.employee_selection}`);
        // }
        return;
    }
    else if (session.step === 'CHOOSE_EMPLOYEE') {
        if (!input) {
            let msg = ``;
            const employeesNames = session.businessIdEmpNames.employee;
            for (let i = 0; i < employeesNames.length; i++) {
                msg += `ל${employeesNames[i].name} הקש ${i + 1}. `
            }
            socket.emit('play_audio', `${msg}`);
            return;
        }

        const employeesNames = session.businessIdEmpNames.employee;
        if (Number(input) && input !== 0 && input <= employeesNames.length) {
            console.log(employeesNames[input - 1])
            session.employeeName = employeesNames[input - 1].name;
            session.step = 'CHOOSE_TYPE_DAY';
            // session.steps.push(session.step);
            processInputDate(socket, session);
        }
        else if (input) {
            wrongChoiseReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
            return;
        }
    }
}




const processInputDate = (socket, session, input) => {

    if (session.step === 'CHOOSE_TYPE_DAY') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.type_day_selection}`);
            return;
        }
        if (input === '1') {
            session.step = 'CHOOSE_WEEK_DAY';
            // session.steps.push(session.step);
            processInputDate(socket, session);
            return;
        }
        else if (input === '2') {
            session.step = 'CHOOSE_DATE';
            // session.steps.push(session.step);
            processInputDate(socket, session);
            return;
        }
        else if (input) {
            wrongChoiseReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
            return;
        }
    }
    else if (session.step === 'CHOOSE_WEEK_DAY') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.day_selection}`);
            return;
        }
        if (input >= '1' && input <= '7') {
            const date = convertStrDateToDate(input);
            if (date instanceof Date) {
                session.date = date;
                session.step = 'DATE_CONFIRMATION';
                processInputDate(socket, session);
            }
            else {
                wrongChoiseReturnMenu(socket, session, date, processInput)
            }
            return
        }
        else if (input) {
            wrongChoiseReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
            return;
        }
    }
    else if (session.step === 'CHOOSE_DATE') {
        if (!input) {
            socket.emit('play_audio', `${ivrMenu.date_selection}`, true);
            return;
        }

        if (input !== '#') {
            session.input += input;
        }
        else if (input === '#') {
            const userInput = session.input;
            session.input = '';
            const date = convertStrDateToDate(userInput, true);
            if (date instanceof Date) {
                session.date = date;
                session.step = 'DATE_CONFIRMATION';
                processInputDate(socket, session);
            }
            else {
                wrongChoiseReturnMenu(socket, session, date, processInput)
            }
            return
        }
        else if (input) {
            wrongChoiseReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
            return;
        }

    }
    else if (session.step === 'DATE_CONFIRMATION') {
        if (!input) {
            const date = session.date;
            socket.emit('play_audio', `${ivrMenu.your_date} ${daysOfWeek[date.getDay()]} ${date.toLocaleDateString()}
            ${ivrMenu.confirmation} ${ivrMenu.another_date}`);
            return;
        }

        if (input === '1') {
            const employeesData = await getEmployeesByBusinessId(session.businessIdEmpNames.id, session.employeeName, session.date);
            // console.log(employeesData);
            const avaEmp = checkEmployeesAppointmentWindow(session.date, employeesData);
            const employeesWorkingHours = bulidWorkingHoursArr(avaEmp);
            console.log(employeesWorkingHours)
            const employeesId = avaEmp.map(em => em.id);
            const appointments = await getAppointments(session.date, session.businessIdEmpNames.id, employeesId);
            console.log('appointments:', appointments)
            const avaApps = allAvaliableApponintments(employeesWorkingHours, appointments);
            console.log('Avaliable appointments', avaApps);
            console.log('appointments length', avaApps.length);

            session.avaApps = avaApps;
            session.step = avaApps.length > 0 ? 'ENTER_HOUR' : 'NO_APPOINTMENTS_DATE';
            // session.steps.push(session.step);
            session.step === 'NO_APPOINTMENTS_DATE' ? processInputDate(socket, session) : processInputHour(socket, session);
            return;
        }
        else if (input === '2') {
            session.step = 'CHOOSE_TYPE_DAY';
            session.date = null;
            processInputDate(socket, session);
        }
        else if (input) {
            wrongChoiseReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
            return;
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
            processInputDate(socket, session);
            return;
        }
        else if (selectEmp && input === '9') {
            session.step = 'CHOOSE_EMP_OR_ALL_EMP';
            processInputGeneral(socket, session);
            return;
        }
        else if (input) {
            wrongChoiseReturnMenu(socket, session, ivrMenu.wrong_choice, processInput)
            return;
        }

    }
}


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
        wrongChoiseReturnMenu(socket, session, wrong_choice, actionProcessInput)
        return;
    }
}

const wrongChoiseReturnMenu = (socket, session, msg, callBack) => {
    socket.emit('play_audio', `${msg}`);
    setTimeout(() => {
        callBack(socket, session)
    }, 1000);
}


module.exports = {
    processInputGeneral
}