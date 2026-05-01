const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate } = require('../middleware/auth');
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
router.post('/:id/suspend', authenticate, asyncHandler(contractsController.suspendContract));
router.post('/:id/restore', authenticate, asyncHandler(contractsController.restoreContract));

module.exports = router;
