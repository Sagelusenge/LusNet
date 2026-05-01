const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const usersController = require('../controllers/users.controller');

const router = express.Router();

router.use(authenticate, allowRoles('admin'));

router.get('/', asyncHandler(usersController.listUsers));
router.post('/', asyncHandler(usersController.createUser));
router.put('/:id', asyncHandler(usersController.updateUser));
router.delete('/:id', asyncHandler(usersController.deleteUser));
router.patch('/:id/status', asyncHandler(usersController.updateUserStatus));

module.exports = router;
