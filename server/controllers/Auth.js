const { signUpFunc, loginFunc } = require("../services/authService");
const {getBusinessByUUID } = require("../utils/DBFanctionsIVR");
const jwt = require('jsonwebtoken');


const signUp = async (req, res) => {
    const { uuid } = req.params;
    const { fullName, userName, phoneNumber, password, role } = req.body;

    try {
        const businessId = await getBusinessByUUID(uuid);
        const user = await signUpFunc({ businessId, fullName, userName, phoneNumber, password, role })

        return res.status(200).json({
            message: "נרשמת בהצלחה למערכת",
            data: user
        })

    } catch (err) {
        return res.status(400).json({ error: err.message })
    }
}
     
const login = async (req, res) => {
    const { uuid } = req.params;

    const { identification, password } = req.body;
 
    try {
        const businessId = await getBusinessByUUID(uuid);
        const payload = await loginFunc(businessId, identification, password);

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            {expiresIn: '24h'}
        )

        return res.status(200).json({ message: "התחברת בהצלחה!", token: token, user: payload })

    } catch (err) {
        const statusCode = err.statusCode || 500;

        if (statusCode === 500) {
            console.error('Server Error during login:', err);
        }

        return res.status(statusCode).json({
            error: err.message || 'שגיאת שרת פנימית'
        });
    }
}

module.exports = {
    signUp,
    login
}