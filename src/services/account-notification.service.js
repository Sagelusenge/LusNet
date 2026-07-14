const { query } = require('../config/database');
const env = require('../config/env');
const { sendToUser } = require('./web-push.service');
const { sendEmail, escapeHtml } = require('./email.service');

async function createAdminInAppAlert(title, body) {
  const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE");
  if (!admins.length) return [];

  const message = await query(
    "INSERT INTO app_messages (title, body, target_role, created_by) VALUES (?, ?, 'admin', NULL)",
    [title, body]
  );
  await query(
    `INSERT IGNORE INTO app_message_recipients (message_id, user_id)
     VALUES ${admins.map(() => '(?, ?)').join(', ')}`,
    admins.flatMap((admin) => [message.insertId, admin.id])
  );
  return admins;
}

async function notifyAdminsOfRequest(request) {
  const title = 'Nouvelle demande de compte client';
  const body = `${request.fullName} (${request.email}) attend votre validation.`;
  const admins = await createAdminInAppAlert(title, body);

  const deliveries = await Promise.allSettled([
    ...admins.map((admin) => sendToUser(admin.id, {
      title,
      body,
      icon: '/app-icon.svg',
      badge: '/app-icon.svg',
      tag: `account-request-${request.id}`,
      url: '/?section=users',
      urgent: true,
      requireInteraction: true
    })),
    sendEmail({
      to: env.email.adminAddress,
      subject: `[LWASIVA_NET] ${title}`,
      text: `${body}\nTelephone: ${request.phone}\nAdresse: ${request.address}, ${request.city}`,
      html: `<h2>${title}</h2><p>${escapeHtml(body)}</p><p><strong>Telephone :</strong> ${escapeHtml(request.phone)}<br><strong>Adresse :</strong> ${escapeHtml(request.address)}, ${escapeHtml(request.city)}</p><p>Connectez-vous a l'administration pour accepter ou rejeter la demande.</p>`
    })
  ]);
  return deliveries;
}

async function notifyClientDecision(request, approved) {
  const subject = approved
    ? '[LWASIVA_NET] Votre compte client est active'
    : '[LWASIVA_NET] Decision concernant votre demande de compte';
  const decision = approved
    ? 'Votre demande a ete approuvee. Vous pouvez maintenant vous connecter avec votre adresse e-mail et le mot de passe choisi.'
    : `Votre demande n a pas ete approuvee${request.admin_notes ? ` : ${request.admin_notes}` : '.'}`;

  return sendEmail({
    to: request.email,
    subject,
    text: `Bonjour ${request.full_name},\n\n${decision}\n\nLWASIVA_NET`,
    html: `<h2>Bonjour ${escapeHtml(request.full_name)},</h2><p>${escapeHtml(decision)}</p><p>LWASIVA_NET<br>${escapeHtml(env.email.adminAddress)}</p>`
  });
}

async function notifyAdminsOfDecision(request, approved, reviewerName) {
  const title = approved ? 'Compte client approuve' : 'Demande de compte rejetee';
  const body = `${reviewerName || 'Un administrateur'} a ${approved ? 'approuve' : 'rejete'} la demande de ${request.full_name}.`;
  const admins = await createAdminInAppAlert(title, body);
  return Promise.allSettled([
    ...admins.map((admin) => sendToUser(admin.id, {
      title,
      body,
      icon: '/app-icon.svg',
      badge: '/app-icon.svg',
      tag: `account-decision-${request.id}`,
      url: '/?section=users',
      urgent: false
    })),
    sendEmail({
      to: env.email.adminAddress,
      subject: `[LWASIVA_NET] ${title}`,
      text: body,
      html: `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p>`
    })
  ]);
}

module.exports = { notifyAdminsOfRequest, notifyClientDecision, notifyAdminsOfDecision };
