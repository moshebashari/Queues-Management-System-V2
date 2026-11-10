const { checkShiftAndBreaksChanges, findEndDate, checkConflictsForShift, changeShiftHoursAndAddOrRemoveApps } = require("../services/employeeService");
const { getBusinessByEmployeeId } = require("../utils/DBFanctionsIVR");
const { generateUtcTimesForDayOfWeek, validateAndSortDates } = require("../utils/utils");


const checkConflicts = async (req, res) => {
    let { employeeId } = req.query;
    const newShift = req.body;
    employeeId = Number(employeeId);
    try {
        if (newShift.breaks > 2) {
            newShift.breaks = validateAndSortDates(newShift.breaks);
        }

        const ranges = await checkShiftAndBreaksChanges(employeeId, newShift);
        if (!ranges) {
            return res.status(200).json({ message: "אין שום שינויים בשעות" });
        }

        const businessId = await getBusinessByEmployeeId(employeeId);
        if (!businessId) {
            return res.status(404).json({ message: "העובד לא נמצא" });
        }
        console.log("test")
        const results = await changeShiftHoursAndAddOrRemoveApps(businessId, employeeId, newShift);

        return res.status(200).json({ results })
        // const endDate = findEndDate(employeeId);
        // const utcRanges = generateUtcTimesForDayOfWeek(endDate, newShift.dayOfWeek, ranges);

        // const conflicts = checkConflictsForShift(employeeId, utcRanges);
        // if (conflicts.length > 0) {
        //     return res.status(200).json({ conflicts: conflicts })
        // }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

const changeShiftHours = async (req, res) => {
    // const { uuid } = req.params;
    let { employeeId } = req.query;
    const newShift = req.body;
    employeeId = Number(employeeId);

    if (newShift.breaks > 2) {
        newShift.breaks = validateAndSortDates(newShift.breaks);
    }

    try {
        const businessId = await getBusinessByEmployeeId(employeeId);
        if (!businessId) {
            return res.status(404).json({ message: "העובד לא נמצא" });
        }
        const modifiedShift = await changeShiftHoursAndAddOrRemoveApps(businessId, employeeId, newShift, false);
        return res.status(200).json({ modifiedShift })

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
    // const changeDefinitions = newShift.changeDefinitions;

    // const endDate = findEndDate(employeeId);
    // const ranges = await checkShiftAndBreaksChanges(employeeId, newShift);
    // const utcRanges = generateUtcTimesForDayOfWeek(endDate, newShift.dayOfWeek, ranges, changeDefinitions);

}

module.exports = {
    checkConflicts,
    changeShiftHours
}