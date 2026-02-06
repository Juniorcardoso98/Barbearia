const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// List all active barbers with schedules
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const barbers = db.prepare(`
      SELECT id, name, email, phone, avatar_url
      FROM users
      WHERE role = 'barber' AND active = 1
      ORDER BY name
    `).all();

    const scheduleStmt = db.prepare(`
      SELECT day_of_week, start_time, end_time
      FROM barber_schedules
      WHERE barber_id = ? AND active = 1
      ORDER BY day_of_week
    `);

    const barbersWithSchedules = barbers.map(barber => ({
      ...barber,
      schedules: scheduleStmt.all(barber.id)
    }));

    res.json(barbersWithSchedules);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar barbeiros' });
  }
});

// Get available time slots for a barber on a specific date
router.get('/:id/slots', (req, res) => {
  try {
    const { date, duration } = req.query;
    const barberId = req.params.id;

    if (!date) {
      return res.status(400).json({ error: 'Data é obrigatória (formato: YYYY-MM-DD)' });
    }

    const db = getDb();
    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();

    // Get barber's schedule for this day of the week
    const schedule = db.prepare(`
      SELECT start_time, end_time
      FROM barber_schedules
      WHERE barber_id = ? AND day_of_week = ? AND active = 1
    `).get(barberId, dayOfWeek);

    if (!schedule) {
      return res.json({ slots: [], message: 'Barbeiro não trabalha neste dia' });
    }

    // Get existing confirmed appointments for this barber on this date
    const appointments = db.prepare(`
      SELECT start_time, end_time
      FROM appointments
      WHERE barber_id = ? AND appointment_date = ? AND status = 'confirmed'
    `).all(barberId, date);

    const serviceDuration = parseInt(duration) || 30;
    const slots = generateTimeSlots(schedule.start_time, schedule.end_time, serviceDuration, appointments, date);

    res.json({ slots, schedule });
  } catch (error) {
    console.error('Erro ao buscar horários:', error);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
});

function generateTimeSlots(startTime, endTime, duration, appointments, date) {
  const slots = [];
  const now = new Date();

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + duration <= endMinutes) {
    const slotStart = formatTime(currentMinutes);
    const slotEndMin = currentMinutes + duration;
    const slotEnd = formatTime(slotEndMin);

    // Check for conflicts with existing appointments
    const isBooked = appointments.some(apt => {
      const aptStart = timeToMinutes(apt.start_time);
      const aptEnd = timeToMinutes(apt.end_time);
      return currentMinutes < aptEnd && slotEndMin > aptStart;
    });

    // Check if slot is in the past
    const slotDateTime = new Date(`${date}T${slotStart}:00`);
    const isPast = slotDateTime <= now;

    slots.push({
      start_time: slotStart,
      end_time: slotEnd,
      available: !isBooked && !isPast
    });

    currentMinutes += 30; // 30-min increments
  }

  return slots;
}

function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

module.exports = router;
