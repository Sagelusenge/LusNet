const { getConnection, query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function listTickets(req, res) {
  const rows = await query(
    `SELECT st.*, cl.full_name AS client_name, cl.phone AS client_phone
     FROM support_tickets st
     INNER JOIN clients cl ON cl.id = st.client_id
     ORDER BY st.opened_at DESC`
  );

  res.json({ success: true, data: rows });
}

async function openTicket(req, res) {
  const { contractId, title, description, priority = 'normale', assignedTo } = req.body;
  const clientId = req.user.role === 'client' ? req.user.clientId : req.body.clientId;

  if (!clientId || !title || !description) {
    throw new HttpError(400, 'Client, titre et description sont obligatoires');
  }

  if (req.user.role === 'client' && contractId) {
    const contracts = await query('SELECT id FROM contracts WHERE id = ? AND client_id = ?', [contractId, clientId]);
    if (contracts.length === 0) {
      throw new HttpError(403, 'Contrat non autorise pour ce client');
    }
  }

  const connection = await getConnection();

  try {
    await connection.execute('SET @ticket_id = NULL');
    await connection.execute('CALL sp_open_support_ticket(?, ?, ?, ?, ?, ?, @ticket_id)', [
      clientId,
      contractId || null,
      title,
      description,
      priority,
      assignedTo || null
    ]);
    const [[result]] = await connection.execute('SELECT @ticket_id AS ticketId');

    res.status(201).json({ success: true, data: result });
  } finally {
    connection.release();
  }
}

async function updateTicketStatus(req, res) {
  const { status } = req.body;
  await query(
    `UPDATE support_tickets
     SET status = ?, resolved_at = CASE WHEN ? = 'resolu' THEN NOW() ELSE resolved_at END
     WHERE id = ?`,
    [status, status, req.params.id]
  );

  res.json({ success: true, message: 'Ticket mis a jour' });
}

module.exports = {
  listTickets,
  openTicket,
  updateTicketStatus
};
