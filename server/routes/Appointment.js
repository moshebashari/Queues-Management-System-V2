const express = require('express');
const router = express.Router();
const AppointmentController = require('../controllers/Appointment');
const { checkAppointmentAccess, requirePermission } = require('../middlewares/authMiddleware');

router.patch('/:uuid/lock', AppointmentController.lockApp);

router.patch('/:uuid/book', checkAppointmentAccess(null, true), AppointmentController.bookApp);

router.patch('/:uuid/cancel', checkAppointmentAccess('canCancelOthers'), AppointmentController.cancelApp);

router.patch('/:uuid/update-app', checkAppointmentAccess('canUpdateOthers'), AppointmentController.updateApp);

router.patch('/:uuid/update-exten', checkAppointmentAccess('canUpdateOthers'), AppointmentController.updateExten);

router.patch('/block', requirePermission('canBlockOthers'), AppointmentController.blockApp);

module.exports = router
