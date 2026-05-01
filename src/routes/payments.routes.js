const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate } = require('../middleware/auth');
const paymentsController = require('../controllers/payments.controller');

const router = express.Router();

router.get('/', asyncHandler(paymentsController.listPayments));
router.post('/', authenticate, asyncHandler(paymentsController.registerPayment));

module.exports = router;
