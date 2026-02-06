const { getDb } = require('../database');

/**
 * Sistema de notificação WhatsApp
 * 
 * Verifica agendamentos que estão a 2 horas de acontecer e envia
 * lembretes via WhatsApp para confirmação de presença.
 * 
 * Para produção, integrar com uma das seguintes APIs:
 * - Twilio WhatsApp API (https://www.twilio.com/whatsapp)
 * - Z-API (https://z-api.io)
 * - Evolution API (https://evolution-api.com)
 * - ChatPro (https://chatpro.com.br)
 * - Baileys (WhatsApp Web API open source)
 */

function checkAndSendReminders() {
  try {
    const db = getDb();
    const now = new Date();

    // Looking for appointments 2 hours from now (with a 15-min window)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const windowEnd = new Date(twoHoursFromNow.getTime() + 15 * 60 * 1000);

    const targetDate = twoHoursFromNow.toISOString().split('T')[0];
    const targetTimeStart = formatTime(twoHoursFromNow);
    const targetTimeEnd = formatTime(windowEnd);

    const appointments = db.prepare(`
      SELECT a.*,
        c.name as client_name, c.phone as client_phone,
        b.name as barber_name,
        s.name as service_name
      FROM appointments a
      JOIN users c ON a.client_id = c.id
      JOIN users b ON a.barber_id = b.id
      JOIN services s ON a.service_id = s.id
      WHERE a.appointment_date = ?
      AND a.start_time >= ?
      AND a.start_time < ?
      AND a.status = 'confirmed'
      AND a.whatsapp_notified = 0
    `).all(targetDate, targetTimeStart, targetTimeEnd);

    for (const appointment of appointments) {
      if (appointment.client_phone) {
        sendWhatsAppReminder(appointment);
      }

      db.prepare('UPDATE appointments SET whatsapp_notified = 1 WHERE id = ?')
        .run(appointment.id);
    }

    if (appointments.length > 0) {
      console.log(`📱 ${appointments.length} lembrete(s) WhatsApp enviado(s)`);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar lembretes:', error);
  }
}

function sendWhatsAppReminder(appointment) {
  const message = `🔔 *Lembrete de Agendamento - Barbearia*\n\n` +
    `Olá, *${appointment.client_name}*!\n` +
    `Você tem um agendamento em *2 horas*:\n\n` +
    `📅 Data: ${formatDateBR(appointment.appointment_date)}\n` +
    `🕐 Horário: ${appointment.start_time}\n` +
    `✂️ Serviço: ${appointment.service_name}\n` +
    `💈 Barbeiro: ${appointment.barber_name}\n\n` +
    `Para cancelar, acesse o sistema com pelo menos 2h de antecedência.\n\n` +
    `Esperamos você! 😊`;

  console.log(`\n📱 [WhatsApp] Notificação para ${appointment.client_phone}:`);
  console.log(message);

  // ============================================
  // INTEGRAÇÃO COM API DO WHATSAPP
  // ============================================
  // 
  // Exemplo com Z-API:
  // const response = await fetch('https://api.z-api.io/instances/SEU_INSTANCE/token/SEU_TOKEN/send-text', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     phone: `55${appointment.client_phone}`,
  //     message: message
  //   })
  // });
  //
  // Exemplo com Twilio:
  // const client = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);
  // client.messages.create({
  //   from: 'whatsapp:+14155238886',
  //   to: `whatsapp:+55${appointment.client_phone}`,
  //   body: message
  // });
  //
  // Exemplo com Evolution API:
  // const response = await fetch('http://localhost:8080/message/sendText/INSTANCE_NAME', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'apikey': 'YOUR_API_KEY' },
  //   body: JSON.stringify({
  //     number: `55${appointment.client_phone}@s.whatsapp.net`,
  //     textMessage: { text: message }
  //   })
  // });
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDateBR(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

module.exports = { checkAndSendReminders, sendWhatsAppReminder };
