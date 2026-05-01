const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function listDocuments(req, res) {
  const rows = await query(
    `SELECT cd.*, c.contract_number
     FROM contract_documents cd
     INNER JOIN contracts c ON c.id = cd.contract_id
     WHERE (? IS NULL OR cd.contract_id = ?)
     ORDER BY cd.uploaded_at DESC`,
    [req.query.contractId || null, req.query.contractId || null]
  );

  res.json({ success: true, data: rows });
}

async function createDocument(req, res) {
  const { contractId, documentType, filePath } = req.body;

  if (!contractId || !documentType || !filePath) {
    throw new HttpError(400, 'Contrat, type document et chemin fichier sont obligatoires');
  }

  const result = await query(
    `INSERT INTO contract_documents (contract_id, document_type, file_path, uploaded_by)
     VALUES (?, ?, ?, ?)`,
    [contractId, documentType, filePath, req.user?.id || null]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

module.exports = {
  listDocuments,
  createDocument
};
