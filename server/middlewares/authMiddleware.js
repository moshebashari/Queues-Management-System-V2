const jwt = require('jsonwebtoken');
const { Employee, Permission, Appointment } = require('../models')

const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startWith('bearer ')) {
        return res.status(401).json({ error: "גישה נדחתה: לא סופק טוקן אימות" });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET);

        req.currentUser = {
            id: decode.id,
            userName: decode.userName,
            fullName: decode.fullName,
            role: decode.role
        };

        return next();
    } catch (err) {
        return res.status(401).json({ error: 'טוקן לא תקף או שפג תוקפו' });
    }
}

const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "גישה נדחתה: לא סופק טוקן אימות" });
        }

        const token = authHeader.split(' ')[1];

        let decode;

        try {
            decode = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'טוקן המשתמש אינו תקף' });
        }

        const { role, id: userId } = decode;
        req.currentUser = decode;

        if (!req.currentUser) {
            return res.status(500).json({ error: 'שגיאת שרת: חסר מידע על המשתמש המחובר' });
        }

        if (role === 'admin') {
            return next();
        }

        if (role === 'client') {
            return res.status(403).json({ error: 'פעולה אסורה: אין לך הרשאות ניהול' });
        }

        if (role === 'employee') {
            if (userId === Number(req.query.employeeId)) {
                return next()
            }

            try {
                const permissions = await Permission.findOne({ where: { userId } })
                if (!permissions || !permissions[requiredPermission]) {
                    return res.status(403).json({ error: 'פעולה אסורה: אין לך הרשאה לנהל תורים של עובדים אחרים' });
                }

                return next();
            } catch (err) {
                return res.status(500).json({ error: 'שגיאה בבדיקת הרשאות ותורים של העובד' });
            }

        }

        return res.status(403).json({ error: 'גישה נדחתה' });
    }
}

const checkAppointmentAccess = (requiredPermission, requireAcessToken = false) => {
    return async (req, res, next) => {
        try {
            const { uuid } = req.params;
            if (!uuid) {
                return res.status(400).json({ error: 'חסר מזהה תור (ID)' });
            }
            const appointment = await Appointment.findOne({ where: { uuid } });
            if (!appointment) {
                return res.status(404).json({ error: 'התור המבוקש לא נמצא' });
            }

            const appointmentToken = req.query.token

            if (appointmentToken && appointmentToken === appointment.accessToken) {
                req.accessMethod = 'appointment-token';
                return next();
            }

            if (requireAcessToken) {
                return res.status(403).json({ error: "גישה נדחתה: לא סופק טוקן אימות" });
            }

            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: "גישה נדחתה: לא סופק טוקן אימות" });
            }

            const token = authHeader.split(' ')[1];

            let decode;

            try {
                decode = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(401).json({ error: 'טוקן המשתמש אינו תקף' });
            }

            const { role, id: userId } = decode;
            req.currentUser = decode;

            if (role === 'admin') {
                return next();
            }

            if (role === 'client' && appointment.userId === userId) {
                return next();
            }

            if (role === 'employee') {
                const employeeId = await Employee.findOne({
                    raw: true,
                    where: { userId },
                    attributes: ['id']
                })

                if (!employeeId) {
                    throw new Error('לא נמצא העובד');
                }

                if (appointment.employeeId === employeeId.id) {
                    return next();
                }

                const permissions = await Permission.findOne({ where: { userId } })
                if (permissions && permissions[requiredPermission]) {
                    return next();
                }
            }

            return res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה על תור זה' });

        } catch (err) {
            return res.status(500).json({ error: 'שגיאה פנימית בתהליך אימות הגישה לתור' });
        }
    }
}

module.exports = {
    requireAuth,
    requirePermission,
    checkAppointmentAccess
}