const { bookAppointment, cancelAppointment, updateDateAndEmployee, updateExtensions, lockAppointment, blockAppointments } = require('../services/appointmentService')

const lockApp = async (req, res) => {
    const { uuid } = req.params;
    try {
        const appoinment = await lockAppointment({ uuid });
        return res.status(200).json({
            message: "התור נקבע בהצלחה.",
            data: appoinment
        })
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
}

const bookApp = async (req, res) => {
    console.log('test')
    const { uuid } = req.params;
    const { name = null, bookingPhone, reminderOptions = null } = req.body;
    const token = req.query.access_token;

    const updateData = { name, bookingPhone, contactPhone: bookingPhone, reminderOptions }

    try {
        const appoinment = await bookAppointment(updateData, { uuid, token });
        return res.status(200).json({
            message: "התור נקבע בהצלחה.",
            data: appoinment
        })
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({ error: err.message || "שגיאת שרת פנימית" });
    }

}

const cancelApp = async (req, res) => {
    const { uuid } = req.params;
    const token = req.query.access_token;

    try {
        const appoinment = await cancelAppointment(uuid, token);
        return res.status(200).json({
            message: "התור בוטל בהצלחה.",
            data: appoinment
        })
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({ error: err.message || "שגיאת שרת פנימית" });
    }
}

const updateApp = async (req, res) => {
    const { uuid } = req.params;
    const { newUuid } = req.body;
    const token = req.query.access_token;

    if (!token) {
        return res.status(401).json({ error: 'חסר מפתח גישה (Token)' });
    }

    try {
        const updatedAppointment = await updateDateAndEmployee(uuid, token, { uuid: newUuid });
        return res.status(200).json({
            message: "התור עודכן בהצלחה.",
            data: updatedAppointment
        })
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({ error: err.message || "שגיאת שרת פנימית" });
    }
}

const updateExten = async (req, res) => {
    const { uuid } = req.params;
    const token = req.query.access_token;
    const { contactPhone = null, reminderOptions = null, name = null } = req.body;
    const updateData = {};
    if (contactPhone) updateData.contactPhone = contactPhone;
    if (reminderOptions) updateData.reminderOptions = reminderOptions;
    if (name) updateData.name = name;

    try {
        const updatedAppointment = await updateExtensions(uuid, token, updateData);
        return res.status(200).json({
            message: "השינויים עודכנו בהצלחה.",
            data: updatedAppointment
        })
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({ error: err.message || "שגיאת שרת פנימית" });
    }
}

const blockApp = async (req, res) => {
    const { employeeId } = req.query;
    const { data, reason } = req.body;

    try {
        const blockedApps = await blockAppointments(employeeId, reason, data)

        return res.status(200).json({ message: `${blockedApps[0]} תורים נחסמו בהצלחה` });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }


}


module.exports = {
    lockApp,
    bookApp,
    cancelApp,
    updateApp,
    updateExten,
    blockApp
}
