const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const ghislainController = require('../controllers/ghislain.controller');

const router = express.Router();

router.use(authenticate, allowRoles('admin', 'manager', 'cashier'));

router.get('/summary', asyncHandler(ghislainController.getSummary));
router.get('/cashbook', asyncHandler(ghislainController.listCashbookEntries));
router.post('/cashbook', asyncHandler(ghislainController.createCashbookEntry));
router.put('/cashbook/:id', asyncHandler(ghislainController.updateCashbookEntry));
router.delete('/cashbook/:id', asyncHandler(ghislainController.deleteCashbookEntry));
router.get('/budget', asyncHandler(ghislainController.listBudgetEntries));
router.post('/budget', asyncHandler(ghislainController.createBudgetEntry));
router.put('/budget/:id', asyncHandler(ghislainController.updateBudgetEntry));
router.delete('/budget/:id', asyncHandler(ghislainController.deleteBudgetEntry));

module.exports = router;
