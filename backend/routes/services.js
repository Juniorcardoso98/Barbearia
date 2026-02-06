const express = require('express');
const { getDb } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// List active services (public)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const services = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY price ASC').all();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
});

// Create service (admin)
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, description, duration_minutes, price, icon } = req.body;
    if (!name || !duration_minutes || !price) {
      return res.status(400).json({ error: 'Nome, duração e preço são obrigatórios' });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO services (name, description, duration_minutes, price, icon)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, description || '', duration_minutes, price, icon || '✂️');

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

// Update service (admin)
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, description, duration_minutes, price, icon, active } = req.body;
    const db = getDb();

    db.prepare(`
      UPDATE services SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        duration_minutes = COALESCE(?, duration_minutes),
        price = COALESCE(?, price),
        icon = COALESCE(?, icon),
        active = COALESCE(?, active)
      WHERE id = ?
    `).run(name, description, duration_minutes, price, icon, active, req.params.id);

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

// Delete service (soft delete)
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE services SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Serviço desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
});

module.exports = router;
