const express = require('express');
const asyncHandler = require('../utils/async-handler');
const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/summary', asyncHandler(dashboardController.getSummary));

module.exports = router;
