const express = require('express');
const router = express.Router();
const EmployeeController = require('../controllers/Employee');
const { requirePermission } = require('../middlewares/authMiddleware');


router.patch('/check-change-shift-hours', requirePermission('canUpdateOthers'), EmployeeController.checkConflicts);
router.patch('/change-shift-hours', requirePermission('canUpdateOthers'), EmployeeController.changeShiftHours);


module.exports = router