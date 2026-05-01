const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const quotesController = require('../controllers/quotes.controller');

const router = express.Router();

router.post('/public', asyncHandler(quotesController.createPublicQuote));
router.get('/', authenticate, allowRoles('admin', 'manager'), asyncHandler(quotesController.listQuotes));
router.put('/:id', authenticate, allowRoles('admin', 'manager'), asyncHandler(quotesController.updateQuote));
router.delete('/:id', authenticate, allowRoles('admin', 'manager'), asyncHandler(quotesController.deleteQuote));
router.patch('/:id/status', authenticate, allowRoles('admin', 'manager'), asyncHandler(quotesController.updateQuoteStatus));
router.post('/:id/convert-client', authenticate, allowRoles('admin', 'manager'), asyncHandler(quotesController.convertQuoteToClient));

module.exports = router;
