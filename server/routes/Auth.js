const express = require('express');
const router = express.Router({ mergeParams: true });
const AuthContorller = require('../controllers/Auth');

router.post('/sign-up', AuthContorller.signUp);

router.post('/login', AuthContorller.login);

module.exports = router
