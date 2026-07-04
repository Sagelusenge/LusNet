const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const equipmentController = require('../controllers/equipment.controller');

const router = express.Router();
const staffOnly = allowRoles('admin', 'manager', 'technician');

router.get('/kits', asyncHandler(equipmentController.listKits));
router.post('/kits', authenticate, staffOnly, asyncHandler(equipmentController.createKit));
router.get('/assignments', authenticate, staffOnly, asyncHandler(equipmentController.listAssignments));
router.post('/assignments', authenticate, staffOnly, asyncHandler(equipmentController.assignEquipment));
router.put('/assignments/:id', authenticate, staffOnly, asyncHandler(equipmentController.updateAssignment));
router.delete('/assignments/:id', authenticate, staffOnly, asyncHandler(equipmentController.deleteAssignment));
router.get('/installments', authenticate, staffOnly, asyncHandler(equipmentController.listInstallments));
router.post('/installments', authenticate, staffOnly, asyncHandler(equipmentController.createInstallment));
router.patch('/installments/:id/pay', authenticate, staffOnly, asyncHandler(equipmentController.markInstallmentPaid));

module.exports = router;
