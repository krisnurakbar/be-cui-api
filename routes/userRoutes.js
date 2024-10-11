const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// Route to list all users
router.get('/', UserController.listUsers);

// Route to activate or deactivate user account
router.patch('/:userId/:isActive', UserController.toggleUserStatus);

module.exports = router;
