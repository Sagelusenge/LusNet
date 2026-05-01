const express = require('express');
const asyncHandler = require('../utils/async-handler');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', require('../middleware/auth').authenticate, asyncHandler(authController.me));

module.exports = router;
