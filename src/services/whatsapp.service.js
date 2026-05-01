const env = require('../config/env');

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('243')) return digits;
  if (digits.startsWith('0')) return `243${digits.slice(1)}`;

  return digits;
}

async function sendWhatsAppText({ to, message }) {
  const normalizedTo = normalizePhone(to);

  if (!normalizedTo) {
    throw new Error('Numero WhatsApp client invalide');
  }

  if (!env.whatsapp.enabled) {
    return {
      id: `simulated-${Date.now()}`,
      simulated: true,
      to: normalizedTo,
      from: env.whatsapp.fromNumber
    };
  }

  if (!env.whatsapp.accessToken || !env.whatsapp.phoneNumberId) {
    throw new Error('Configuration WhatsApp incomplete');
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${env.whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'text',
      text: {
        preview_url: false,
        body: message
      }
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message || 'Echec envoi WhatsApp');
  }

  return {
    id: payload.messages?.[0]?.id || null,
    simulated: false,
    to: normalizedTo,
    from: env.whatsapp.fromNumber
  };
}

module.exports = {
  normalizePhone,
  sendWhatsAppText
};
