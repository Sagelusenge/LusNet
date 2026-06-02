const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate } = require('../middleware/auth');
const clientSpaceController = require('../controllers/client-space.controller');

const router = express.Router();

router.get('/me', authenticate, asyncHandler(clientSpaceController.getMySpace));
router.put('/me', authenticate, asyncHandler(clientSpaceController.updateMyProfile));

module.exports = router;
