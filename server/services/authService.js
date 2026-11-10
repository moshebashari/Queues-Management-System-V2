const { User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');


const signUpFunc = async ({ businessId, fullName, userName, phoneNumber, password, role }) => {
    try {
        const user = await User.create({
            businessId,
            fullName,
            userName,
            phoneNumber,
            password,
            role
        })
        return user;
    } catch (err) {
        throw new Error(err.message);
    }
}

const loginFunc = async (businessId, identification, password) => {


    const user = await User.scope('withPassword').findOne({
        raw: true,
        where: {
            businessId,
            [Op.or]: [
                { userName: identification },
                { phoneNumber: identification }
            ]
        }
    })

    if (!user) {
        const error = new Error("שם משתמש או סיסמה שגויים")
        error.statusCode = 401;
        throw error
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = new Error("שם משתמש או סיסמה שגויים")
        error.statusCode = 401;
        throw error
    }

    return { id: user.id, userName: user.userName, fullName: user.fullName, role: user.role };
}


module.exports = {
    signUpFunc,
    loginFunc
}
