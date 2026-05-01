const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate } = require('../middleware/auth');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();

router.get('/', asyncHandler(documentsController.listDocuments));
router.post('/', authenticate, asyncHandler(documentsController.createDocument));

module.exports = router;
