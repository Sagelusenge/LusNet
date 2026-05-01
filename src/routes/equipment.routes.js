const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate } = require('../middleware/auth');
const equipmentController = require('../controllers/equipment.controller');

const router = express.Router();

router.get('/kits', asyncHandler(equipmentController.listKits));
router.post('/kits', authenticate, asyncHandler(equipmentController.createKit));
router.post('/assignments', authenticate, asyncHandler(equipmentController.assignEquipment));
router.get('/installments', asyncHandler(equipmentController.listInstallments));
router.post('/installments', authenticate, asyncHandler(equipmentController.createInstallment));
router.patch('/installments/:id/pay', authenticate, asyncHandler(equipmentController.markInstallmentPaid));

module.exports = router;
