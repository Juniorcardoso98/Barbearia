const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create appointment
router.post('/', authenticateToken, (req, res) => {
  try {
    let { barber_id, service_id, appointment_date, start_time, notes } = req.body;

    if (!service_id || !appointment_date || !start_time) {
      return res.status(400).json({ error: 'Serviço, data e horário são obrigatórios' });
    }

    const db = getDb();

    // Get service
    const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(service_id);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // If barber is 'random' or not specified, pick a random available one
    if (!barber_id || barber_id === 'random') {
      const dateObj = new Date(appointment_date + 'T12:00:00');
      const dayOfWeek = dateObj.getDay();

      const availableBarbers = db.prepare(`
        SELECT u.id FROM users u
        JOIN barber_schedules bs ON u.id = bs.barber_id
        WHERE u.role = 'barber' AND u.active = 1
        AND bs.day_of_week = ? AND bs.active = 1
        AND bs.start_time <= ? 
        AND u.id NOT IN (
          SELECT a.barber_id FROM appointments a
          WHERE a.appointment_date = ? AND a.status = 'confirmed'
          AND a.start_time = ?
        )
      `).all(dayOfWeek, start_time, appointment_date, start_time);

      if (availableBarbers.length === 0) {
        return res.status(400).json({ error: 'Nenhum barbeiro disponível neste horário' });
      }

      barber_id = availableBarbers[Math.floor(Math.random() * availableBarbers.length)].id;
    }

    // Calculate end time
    const [startH, startM] = start_time.split(':').map(Number);
    const totalMinutes = startH * 60 + startM + service.duration_minutes;
    const end_time = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;

    // Check for time conflicts
    const conflict = db.prepare(`
      SELECT id FROM appointments
      WHERE barber_id = ? AND appointment_date = ? AND status = 'confirmed'
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND start_time < ?)
      )
    `).get(barber_id, appointment_date, end_time, start_time, start_time, end_time);

    if (conflict) {
      return res.status(400).json({ error: 'Este horário já está ocupado. Escolha outro horário.' });
    }

    // Check if same client already has appointment at this time
    const clientConflict = db.prepare(`
      SELECT id FROM appointments
      WHERE client_id = ? AND appointment_date = ? AND status = 'confirmed'
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND start_time < ?)
      )
    `).get(req.user.id, appointment_date, end_time, start_time, start_time, end_time);

    if (clientConflict) {
      return res.status(400).json({ error: 'Você já possui um agendamento neste horário' });
    }

    const result = db.prepare(`
      INSERT INTO appointments (client_id, barber_id, service_id, appointment_date, start_time, end_time, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, barber_id, service_id, appointment_date, start_time, end_time, notes || null);

    const appointment = db.prepare(`
      SELECT a.*,
        u.name as barber_name,
        s.name as service_name, s.price as service_price, s.icon as service_icon,
        c.name as client_name, c.phone as client_phone
      FROM appointments a
      JOIN users u ON a.barber_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN users c ON a.client_id = c.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// Get user's appointments
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { status, date } = req.query;

    let query = `
      SELECT a.*,
        u.name as barber_name, u.phone as barber_phone,
        s.name as service_name, s.price as service_price, s.icon as service_icon, s.duration_minutes,
        c.name as client_name, c.phone as client_phone,
        CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_review,
        r.rating as review_rating
      FROM appointments a
      JOIN users u ON a.barber_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN users c ON a.client_id = c.id
      LEFT JOIN reviews r ON r.appointment_id = a.id
    `;

    const conditions = [];
    const params = [];

    if (req.user.role === 'client') {
      conditions.push('a.client_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'barber') {
      conditions.push('a.barber_id = ?');
      params.push(req.user.id);
    }
    // Admin sees all

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (date) {
      conditions.push('a.appointment_date = ?');
      params.push(date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.appointment_date DESC, a.start_time DESC';

    const appointments = db.prepare(query).all(...params);
    res.json(appointments);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// Cancel appointment (client: 2h before only)
router.put('/:id/cancel', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    if (appointment.client_id !== req.user.id && !['admin', 'barber'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Não autorizado a cancelar este agendamento' });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ error: 'Este agendamento não pode ser cancelado' });
    }

    // Check 2-hour rule for clients
    if (req.user.role === 'client') {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}:00`);
      const now = new Date();
      const hoursUntil = (appointmentDateTime - now) / (1000 * 60 * 60);

      if (hoursUntil < 2) {
        return res.status(400).json({
          error: 'Cancelamento permitido apenas com no mínimo 2 horas de antecedência do horário agendado'
        });
      }
    }

    db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Agendamento cancelado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
});

// Update appointment status (admin/barber)
router.put('/:id/status', authenticateToken, (req, res) => {
  try {
    if (!['admin', 'barber'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    const { status } = req.body;
    if (!['confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const db = getDb();
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);

    const appointment = db.prepare(`
      SELECT a.*, u.name as barber_name, s.name as service_name, s.price as service_price,
        c.name as client_name, c.phone as client_phone
      FROM appointments a
      JOIN users u ON a.barber_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN users c ON a.client_id = c.id
      WHERE a.id = ?
    `).get(req.params.id);

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Add review to completed appointment
router.post('/:id/review', authenticateToken, (req, res) => {
  try {
    const { rating, comment } = req.body;
    const appointmentId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5 estrelas' });
    }

    const db = getDb();
    
    // Check if appointment exists and belongs to user
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    if (appointment.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode avaliar seus próprios agendamentos' });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({ error: 'Apenas agendamentos concluídos podem ser avaliados' });
    }

    // Check if review already exists
    const existingReview = db.prepare('SELECT id FROM reviews WHERE appointment_id = ?').get(appointmentId);
    if (existingReview) {
      return res.status(400).json({ error: 'Este agendamento já foi avaliado' });
    }

    // Insert review
    const result = db.prepare(`
      INSERT INTO reviews (appointment_id, client_id, barber_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(appointmentId, req.user.id, appointment.barber_id, rating, comment || null);

    const review = db.prepare(`
      SELECT r.*, u.name as client_name, b.name as barber_name
      FROM reviews r
      JOIN users u ON r.client_id = u.id
      JOIN users b ON r.barber_id = b.id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(review);
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({ error: 'Erro ao criar avaliação' });
  }
});

// Get appointment review
router.get('/:id/review', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const review = db.prepare(`
      SELECT r.*, u.name as client_name, b.name as barber_name
      FROM reviews r
      JOIN users u ON r.client_id = u.id
      JOIN users b ON r.barber_id = b.id
      WHERE r.appointment_id = ?
    `).get(req.params.id);

    if (!review) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar avaliação' });
  }
});

// Get barber reviews
router.get('/barber/:barberId/reviews', (req, res) => {
  try {
    const db = getDb();
    const reviews = db.prepare(`
      SELECT r.*, u.name as client_name, s.name as service_name
      FROM reviews r
      JOIN users u ON r.client_id = u.id
      JOIN appointments a ON r.appointment_id = a.id
      JOIN services s ON a.service_id = s.id
      WHERE r.barber_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.barberId);

    const avgRating = db.prepare(`
      SELECT AVG(rating) as avg, COUNT(*) as total
      FROM reviews WHERE barber_id = ?
    `).get(req.params.barberId);

    res.json({
      reviews,
      average: avgRating.avg || 0,
      total: avgRating.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar avaliações' });
  }
});

module.exports = router;
