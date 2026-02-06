const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({ error: 'Nome, senha e (email ou telefone) são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const db = getDb();

    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) return res.status(400).json({ error: 'Email já cadastrado' });
    }

    if (phone) {
      const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
      if (existing) return res.status(400).json({ error: 'Telefone já cadastrado' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, 'client')
    `).run(name, email || null, phone || null, password_hash);

    const user = db.prepare('SELECT id, name, email, phone, role, avatar_url FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password || (!email && !phone)) {
      return res.status(400).json({ error: 'Email/telefone e senha são obrigatórios' });
    }

    const db = getDb();
    let user;

    if (email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    } else {
      user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    }

    if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Conta desativada. Entre em contato com a barbearia.' });
    }

    const token = generateToken(user);
    const { password_hash, ...userData } = user;

    res.json({ user: userData, token });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Google Auth (simplified)
router.post('/google', (req, res) => {
  try {
    const { name, email, google_id, avatar_url } = req.body;

    if (!email || !google_id) {
      return res.status(400).json({ error: 'Dados do Google são obrigatórios' });
    }

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(google_id, email);

    if (!user) {
      const result = db.prepare(`
        INSERT INTO users (name, email, google_id, avatar_url, role)
        VALUES (?, ?, ?, ?, 'client')
      `).run(name, email, google_id, avatar_url || null);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    } else if (!user.google_id) {
      db.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
        .run(google_id, avatar_url, user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    const token = generateToken(user);
    const { password_hash, ...userData } = user;
    res.json({ user: userData, token });
  } catch (error) {
    console.error('Erro na autenticação Google:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, phone, role, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const db = getDb();

    // Check if email is already taken by another user
    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
      if (existing) return res.status(400).json({ error: 'Este email já está em uso por outra conta' });
    }

    // Check if phone is already taken by another user
    if (phone) {
      const existing = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, req.user.id);
      if (existing) return res.status(400).json({ error: 'Este telefone já está em uso por outra conta' });
    }

    db.prepare('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?')
      .run(name || null, email || null, phone || null, req.user.id);
    const user = db.prepare('SELECT id, name, email, phone, role, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// Change password
router.put('/password', authenticateToken, (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Conta vinculada ao Google. Use o Google para fazer login.' });
    }

    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

module.exports = router;
