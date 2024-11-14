const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const userController = require('../controllers/userController');

// Route to list all users
router.get('/', UserController.listUsers);

// Create a new user
router.post('/create/', userController.create);

// Route to activate or deactivate user account
router.patch('/:userId/:isActive', UserController.toggleUserStatus);

module.exports = router;
