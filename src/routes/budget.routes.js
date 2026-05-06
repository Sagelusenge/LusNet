const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const budgetController = require('../controllers/budget.controller');

const router = express.Router();

router.use(authenticate, allowRoles('admin', 'manager', 'cashier'));

router.get('/categories', asyncHandler(budgetController.listCategories));
router.post('/categories', asyncHandler(budgetController.createCategory));
router.get('/entries', asyncHandler(budgetController.listEntries));
router.post('/entries', asyncHandler(budgetController.createEntry));
router.put('/entries/:id', asyncHandler(budgetController.updateEntry));
router.delete('/entries/:id', asyncHandler(budgetController.deleteEntry));
router.get('/summary', asyncHandler(budgetController.getSummary));

module.exports = router;
