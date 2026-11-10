const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/Home');

router.get('/', HomeController.homePage);

router.post('/:uuid', HomeController.businessHomePage)

router.post('/:uuid/appointments', HomeController.dailyAppointmentsPage)

module.exports = router;  
