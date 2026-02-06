const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin'));

// List all users
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT id, name, email, phone, role, active, avatar_url, created_at
      FROM users ORDER BY role, name
    `).all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Create barber
router.post('/barbers', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'Nome e senha são obrigatórios' });
    }

    const db = getDb();
    const password_hash = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, 'barber')
    `).run(name, email || null, phone || null, password_hash);

    const user = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (error) {
    console.error('Erro ao criar barbeiro:', error);
    res.status(500).json({ error: 'Erro ao criar barbeiro' });
  }
});

// Update user role
router.put('/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    if (!['client', 'barber', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Papel inválido' });
    }

    const db = getDb();
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    const user = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar papel' });
  }
});

// Toggle user active
router.put('/users/:id/toggle', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE users SET active = NOT active WHERE id = ?').run(req.params.id);
    const user = db.prepare('SELECT id, name, email, phone, role, active FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Update barber info
router.put('/barbers/:id', (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const db = getDb();
    
    const barber = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(req.params.id, 'barber');
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    db.prepare(`
      UPDATE users SET 
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone)
      WHERE id = ?
    `).run(name || null, email || null, phone || null, req.params.id);

    const updated = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar barbeiro:', error);
    res.status(500).json({ error: 'Erro ao atualizar barbeiro' });
  }
});

// Set barber schedule
router.post('/barbers/:id/schedule', (req, res) => {
  try {
    const { schedules } = req.body;
    const barberId = req.params.id;

    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({ error: 'Horários são obrigatórios' });
    }

    const db = getDb();
    db.prepare('DELETE FROM barber_schedules WHERE barber_id = ?').run(barberId);

    const insert = db.prepare(`
      INSERT INTO barber_schedules (barber_id, day_of_week, start_time, end_time, active)
      VALUES (?, ?, ?, ?, 1)
    `);

    const insertMany = db.transaction((items) => {
      for (const s of items) {
        insert.run(barberId, s.day_of_week, s.start_time, s.end_time);
      }
    });

    insertMany(schedules);

    const updatedSchedules = db.prepare('SELECT * FROM barber_schedules WHERE barber_id = ?').all(barberId);
    res.json(updatedSchedules);
  } catch (error) {
    console.error('Erro ao definir horários:', error);
    res.status(500).json({ error: 'Erro ao definir horários' });
  }
});

// Dashboard stats
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const monthPrefix = today.substring(0, 7) + '%';

    const totalClients = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'client'").get().count;
    const totalBarbers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'barber' AND active = 1").get().count;
    const todayAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status = 'confirmed'").get(today).count;
    const totalAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status != 'cancelled'").get().count;

    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(s.price), 0) as total
      FROM appointments a JOIN services s ON a.service_id = s.id
      WHERE a.appointment_date = ? AND a.status IN ('confirmed', 'completed')
    `).get(today).total;

    const monthRevenue = db.prepare(`
      SELECT COALESCE(SUM(s.price), 0) as total
      FROM appointments a JOIN services s ON a.service_id = s.id
      WHERE a.appointment_date LIKE ? AND a.status IN ('confirmed', 'completed')
    `).get(monthPrefix).total;

    const popularServices = db.prepare(`
      SELECT s.name, s.icon, COUNT(*) as count
      FROM appointments a JOIN services s ON a.service_id = s.id
      WHERE a.status != 'cancelled'
      GROUP BY s.id ORDER BY count DESC LIMIT 5
    `).all();

    // Today's schedule
    const todaySchedule = db.prepare(`
      SELECT a.*, 
        u.name as barber_name,
        s.name as service_name, s.icon as service_icon, s.price as service_price,
        c.name as client_name, c.phone as client_phone
      FROM appointments a
      JOIN users u ON a.barber_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN users c ON a.client_id = c.id
      WHERE a.appointment_date = ? AND a.status = 'confirmed'
      ORDER BY a.start_time ASC
    `).all(today);

    // Recent appointments (last 10)
    const recentAppointments = db.prepare(`
      SELECT a.*,
        u.name as barber_name,
        s.name as service_name, s.icon as service_icon, s.price as service_price,
        c.name as client_name
      FROM appointments a
      JOIN users u ON a.barber_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN users c ON a.client_id = c.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `).all();

    res.json({ totalClients, totalBarbers, todayAppointments, totalAppointments, todayRevenue, monthRevenue, popularServices, todaySchedule, recentAppointments });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// All appointments (admin view)
router.get('/appointments', (req, res) => {
  try {
    const db = getDb();
    const { date, status } = req.query;

    let query = `
      SELECT a.*,
        u.name as barber_name,
        s.name as service_name, s.price as service_price, s.icon as service_icon,
        c.name as client_name, c.phone as client_phone,
        CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_review
      FROM appointments a
      JOIN users u ON a.barber_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN users c ON a.client_id = c.id
      LEFT JOIN reviews r ON r.appointment_id = a.id
    `;

    const conditions = [];
    const params = [];

    if (date) { conditions.push('a.appointment_date = ?'); params.push(date); }
    if (status) { conditions.push('a.status = ?'); params.push(status); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY a.appointment_date DESC, a.start_time ASC';

    res.json(db.prepare(query).all(...params));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// Reports by date range
router.get('/reports', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Data inicial e final são obrigatórias' });
    }

    const db = getDb();

    // Barber performance report
    const barberReport = db.prepare(`
      SELECT 
        u.id,
        u.name as barber_name,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COALESCE(SUM(CASE WHEN a.status IN ('completed', 'confirmed') THEN s.price ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as total_reviews
      FROM users u
      LEFT JOIN appointments a ON u.id = a.barber_id 
        AND a.appointment_date BETWEEN ? AND ?
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN reviews r ON r.appointment_id = a.id
      WHERE u.role = 'barber' AND u.active = 1
      GROUP BY u.id, u.name
      ORDER BY total_revenue DESC
    `).all(start_date, end_date);

    // Services performance
    const servicesReport = db.prepare(`
      SELECT 
        s.id,
        s.name as service_name,
        s.icon,
        COUNT(a.id) as times_booked,
        COALESCE(SUM(CASE WHEN a.status IN ('completed', 'confirmed') THEN s.price ELSE 0 END), 0) as revenue
      FROM services s
      LEFT JOIN appointments a ON s.id = a.service_id 
        AND a.appointment_date BETWEEN ? AND ?
      WHERE s.active = 1
      GROUP BY s.id, s.name, s.icon
      ORDER BY times_booked DESC
    `).all(start_date, end_date);

    // Overall stats
    const overallStats = db.prepare(`
      SELECT 
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN a.status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(CASE WHEN a.status IN ('completed', 'confirmed') THEN s.price ELSE 0 END), 0) as total_revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.appointment_date BETWEEN ? AND ?
    `).get(start_date, end_date);

    res.json({
      period: { start_date, end_date },
      barbers: barberReport,
      services: servicesReport,
      overall: overallStats
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

module.exports = router;
