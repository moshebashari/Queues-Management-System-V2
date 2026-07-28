const { sequelize, BusinessShop, BusinessSettings, Employee, EmployeeConfigs, WorkingHours, Appointment } = require('../models');
const { Op } = require('sequelize');
const { generate8DigitsNumber, formatToMySQLDateTime } = require('./utils');
const { includes, transform } = require('lodash');

const getBusinessDataByPhoneNum = async (phoneNum) => {

    const businessData = await BusinessShop.findAll({
        row: true,
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
                model: Employee, as: 'employee', attributes: ['id', 'name',
                    [sequelize.literal('`employee->employeeConfigs`.`booking_window`'), 'booking_window'],
                ],
                include: [{ model: EmployeeConfigs, as: 'employeeConfigs', attributes: [] }]
            }
        ],
        order: [
            [{ model: Employee, as: 'employee' }, 'id', 'ASC']
        ]
    })
    // console.log(businessData)
    return businessData[0] ? businessData[0].toJSON() : null
}

const getEmployeesByBusinessId = async (businessId, employeeName, date = null) => {
    const whereClause = { businessId: businessId };
    let workingHoursInclude = [{ model: EmployeeConfigs, as: 'employeeConfigs', attributes: [] }]
    if (employeeName !== 'all') {
        whereClause.name = employeeName;
    }

    if (date) {
        workingHoursInclude.push({
            model: WorkingHours,
            as: 'workingHours',
            where: { dayOfWeek: date.getDay() },
            order: [['start_time', 'ASC']]
        });
    }
    let allEmployees = null
    try {
        allEmployees = await Employee.findAll({
            row: true,
            nest: false,
            attributes: ['id', 'name', 'business_id', 'contact_phone',
                [sequelize.col('employeeConfigs.appointment_duration'), 'appointment_duration'],
                [sequelize.col('employeeConfigs.booking_window'), 'booking_window'],
            ],
            where: whereClause,
            include: workingHoursInclude,
            order: [['id', 'ASC']]
        })
    } catch (err) {
        console.log(err.message);
    }
    const employeesData = allEmployees.map(e => e.toJSON());

    // console.log(employeesData)
    return employeesData;
}

const getWorkingHoursByDay = async (date, businessId, employeeId) => {
    try {
        const allWorkingHours = await WorkingHours.findAll({
            row: true,
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

        const workingHoursData = allWorkingHours.map(wh => wh.toJSON())
        return workingHoursData;

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
           { status: "available"},
           {
            [Op.and] : [
                {status: 'pending'},
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

const createNewEmployee = async (employeeData, workingHours, employeeConfigs) => {
    try {
        const result = await sequelize.transaction(async (t) => {

            const employee = await Employee.create(employeeData, { transaction: t });

            employeeConfigs.employeeId = employee.id;
            const configs = await EmployeeConfigs.create(employeeConfigs, { transaction: t });

            workingHours.forEach(element => {
                element.employeeId = employee.id;
            });

            const wh = await WorkingHours.bulkCreate(workingHours, { transaction: t });

            return { employee, configs, wh }

        })

        console.log('Employee create successfully.')
        return result;
    } catch (err) {
        console.log(err);
    }
}

const createNewAppointment = async (appointmentData) => {
    let inserted = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!inserted && attempts < maxAttempts) {
        try {

            // attempts++;
            // const bookingCode = generate8DigitsNumber();

            const appointment = await Appointment.create({
                // bookingCode: bookingCode,
                ...appointmentData,
            });

            inserted = true;
            console.log('Appointment created successfully')
            return appointment.toJSON();
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                const failedIndex = err.errors[0]?.path;
                if (failedIndex === 'unique_code_per_business') {
                    console.warn('BookingCode already exists to this business. run another attmept.');
                }

                else if (failedIndex === 'idx_employee_date_active') {
                    console.error('The employee already booked on this date time');
                    throw new Error('The employee already booked on this date time');
                }
                else {
                    const errMsg = err.errors[0]?.message || '';
                    if (errMsg.includes('booking_code')) {
                        console.warn('BookingCode already exists to this business. run another attmept.');
                    }
                    else {
                        console.error('The employee already booked on this date time');
                        throw new Error('The employee already booked on this date time');
                    }
                }
            } else {
                throw err;
            }
        }
    }
}

const updateAppointment = async (updateData, whereData, mode = 'update', hasBookingCode = true) => {
    try {
        const appointment = await Appointment.findOne({
            where: whereData
        })
        if (appointment) {
            let inserted = false;
            let attempts = 0;
            const maxAttempts = 5;
            let appointmentUpdate = null;
            while (!inserted && attempts < maxAttempts) {
                attempts++;
                if (!hasBookingCode) updateData.bookingCode = generate8DigitsNumber();
                appointmentUpdate = await appointment.update(updateData);
                inserted = true;
            }
            if (appointmentUpdate && mode === 'update') return appointmentUpdate.toJSON();
            else if (appointmentUpdate && mode === 'cancel') {
                const newApp = {
                    businessId: appointmentUpdate.businessId,
                    employeeId: appointmentUpdate.employeeId,
                    appointmentDateTime: appointmentUpdate.appointmentDateTime
                };
                const result = await createNewAppointment(newApp);
                if (result) return 'appointment canceled';
            }
            else return null;
        }
        else {
            console.log("There wasn't any row to upadte");
            return null;
        }

    } catch (err) {
        console.log(err)
    }
}

const updateAppointmentDateTime = async (businessId, employeeId, currentDate, newDate) => {
    const t = await sequelize.transaction();

    try {

        const appointments = await Appointment.findAll({
            where: {
                businessId,
                employeeId,
                appointmentDateTime: { [Op.in]: [currentDate, newDate] }
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

const accessAppointmentByBookingCode = async (businessId, bookingCode) => {
    try {
        const appointment = await Appointment.findOne({
            where: {
                [Op.and]: [
                    { businessId },
                    { bookingCode },
                    { status: 'confirmed' }
                ]
            }
        })

        if (appointment) {
            const appointmentJSON = appointment.toJSON();
            const hour = new Date(appointmentJSON.appointmentDateTime).toLocaleTimeString('en-GB', {
                timeZone: 'Asia/Jerusalem',
                hour12: false
            });
            const date = new Date(appointmentJSON.appointmentDateTime).toLocaleDateString('he-IL');
            return { ...appointmentJSON, date, hour };
        }
        else return null;

    } catch (err) {
        console.log(err);
    }
}


module.exports = {
    getBusinessDataByPhoneNum,
    getEmployeesByBusinessId,
    getWorkingHoursByDay,
    getAppointments,
    createNewEmployee,
    createNewAppointment,
    updateAppointment,
    updateAppointmentDateTime,
    accessAppointmentByBookingCode
}