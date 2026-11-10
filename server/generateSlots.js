const fs = require('fs');

/**
 * פונקציה לייצור מערך תורים וסלוטים
 * @param {Object} config - אובייקט הגדרות
 */
function generateAppointmentSlots({ date, startTime, endTime, intervalMinutes, employeeId, businessId }) {
  const slots = [];
  
  // הגדרת תאריכי התחלה וסיום לפי שעות
  const current = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);

  while (current <= end) {
    // חילוץ שעות, דקות ושניות בפורמט דו-ספרתי
    const hours = String(current.getHours()).padStart(2, '0');
    const minutes = String(current.getMinutes()).padStart(2, '0');
    const seconds = String(current.getSeconds()).padStart(2, '0');
    
    // יצירת קוד הזמנה רנדומלי בן 8 ספרות
    const bookingCode = Math.floor(10000000 + Math.random() * 90000000);

    slots.push({
      business_id: businessId,
      employee_id: employeeId,
      appointment_date_time: `${date}T${hours}:${minutes}:${seconds}`,
      contact_phone: null,
      name: null,
      booking_phone: null,
      status: "available"
    });

    // קידום הזמן ב-X דקות
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return slots;
}

// === דוגמה לשימוש והרצה ===

const config = {
  date: "2026-05-19",
  startTime: "12:00:00",
  endTime: "20:00:00",
  intervalMinutes: 20,
  employeeId: 4,
  businessId: 1
};

const result = generateAppointmentSlots(config);

// שמירת התוצאה לקובץ JSON במחשב שלך
fs.writeFileSync('appointmentsAll.json', JSON.stringify(result, null, 2), 'utf-8');
console.log(`Successfully generated ${result.length} slots in appointments.json!`);
