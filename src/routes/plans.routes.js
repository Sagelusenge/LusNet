const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const plansController = require('../controllers/plans.controller');

const router = express.Router();

router.get('/', asyncHandler(plansController.listPlans));
router.post('/', authenticate, allowRoles('admin', 'manager'), asyncHandler(plansController.createPlan));
router.put('/:id', authenticate, allowRoles('admin', 'manager'), asyncHandler(plansController.updatePlan));

module.exports = router;
