const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate } = require('../middleware/auth');
const invoicesController = require('../controllers/invoices.controller');

const router = express.Router();

router.get('/', asyncHandler(invoicesController.listInvoices));
router.get('/unpaid', asyncHandler(invoicesController.listUnpaidInvoices));
router.post('/monthly', authenticate, asyncHandler(invoicesController.createMonthlyInvoice));
router.post('/mark-late', authenticate, asyncHandler(invoicesController.markLateInvoices));

module.exports = router;
