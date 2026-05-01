const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate } = require('../middleware/auth');
const clientsController = require('../controllers/clients.controller');

const router = express.Router();

router.get('/', asyncHandler(clientsController.listClients));
router.get('/:id', asyncHandler(clientsController.getClient));
router.post('/', authenticate, asyncHandler(clientsController.createClient));
router.put('/:id', authenticate, asyncHandler(clientsController.updateClient));
router.delete('/:id', authenticate, asyncHandler(clientsController.deleteClient));

module.exports = router;
