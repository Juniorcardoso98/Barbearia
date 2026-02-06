const express = require('express');
const { getDb } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all public settings (no auth needed)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM site_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Get gallery images (public)
router.get('/gallery', (req, res) => {
  try {
    const db = getDb();
    const images = db.prepare('SELECT * FROM gallery WHERE active = 1 ORDER BY sort_order ASC, id DESC').all();
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar galeria' });
  }
});

// Update settings (admin only)
router.put('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const settings = req.body;

    const allowedKeys = [
      'site_name', 'site_logo', 'hero_title', 'hero_subtitle',
      'hero_cta', 'footer_text', 'whatsapp_number', 'instagram_url', 'address'
    ];

    for (const [key, value] of Object.entries(settings)) {
      if (allowedKeys.includes(key)) {
        const existing = db.prepare('SELECT key FROM site_settings WHERE key = ?').get(key);
        if (existing) {
          db.prepare('UPDATE site_settings SET value = ? WHERE key = ?').run(String(value), key);
        } else {
          db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)').run(key, String(value));
        }
      }
    }

    // Return updated settings
    const rows = db.prepare('SELECT key, value FROM site_settings').all();
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// Add gallery image (admin only)
router.post('/gallery', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { image_url, title, description, sort_order } = req.body;
    if (!image_url) {
      return res.status(400).json({ error: 'URL da imagem é obrigatória' });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO gallery (image_url, title, description, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(image_url, title || '', description || '', sort_order || 0);

    const image = db.prepare('SELECT * FROM gallery WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(image);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar imagem' });
  }
});

// Update gallery image (admin only)
router.put('/gallery/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { image_url, title, description, sort_order } = req.body;
    const db = getDb();
    db.prepare(`
      UPDATE gallery SET
        image_url = COALESCE(?, image_url),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(image_url, title, description, sort_order, req.params.id);

    const image = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
    res.json(image);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar imagem' });
  }
});

// Delete gallery image (admin only)
router.delete('/gallery/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
    res.json({ message: 'Imagem removida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover imagem' });
  }
});

module.exports = router;
