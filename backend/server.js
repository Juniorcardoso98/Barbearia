require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const { initDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const barbersRoutes = require('./routes/barbers');
const appointmentsRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const { checkAndSendReminders } = require('./utils/whatsapp');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Start server after database initialization
async function start() {
  await initDatabase();

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/barbers', barbersRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/settings', settingsRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Serve frontend in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
  }

  // Cron job - check every 15 minutes for WhatsApp reminders (2h before appointment)
  cron.schedule('*/15 * * * *', () => {
    console.log('[CRON] Verificando agendamentos para envio de lembretes WhatsApp...');
    checkAndSendReminders();
  });

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📋 API disponível em http://localhost:${PORT}/api`);
  });
}

start().catch(err => {
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});
