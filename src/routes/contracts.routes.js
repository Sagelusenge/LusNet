const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const contractsController = require('../controllers/contracts.controller');

const router = express.Router();

router.get('/', asyncHandler(contractsController.listContracts));
router.get('/balances', asyncHandler(contractsController.listContractBalances));
router.get('/equipment-status', asyncHandler(contractsController.listEquipmentStatus));
router.get('/:id', asyncHandler(contractsController.getContract));
router.post('/', authenticate, asyncHandler(contractsController.createContract));
router.put('/:id', authenticate, asyncHandler(contractsController.updateContract));
router.delete('/:id', authenticate, asyncHandler(contractsController.deleteContract));
router.patch('/:id/status', authenticate, asyncHandler(contractsController.updateContractStatus));
router.patch('/:id/deadline', authenticate, allowRoles('admin', 'manager'), asyncHandler(async (req, res) => {
  await require('../services/deadline-correction.service').correctDeadline(req.params.id, req.body, req.user.id);
  res.json({ success: true, message: 'Échéance corrigée' });
}));
router.post('/:id/suspend', authenticate, asyncHandler(contractsController.suspendContract));
router.post('/:id/restore', authenticate, asyncHandler(contractsController.restoreContract));

module.exports = router;
