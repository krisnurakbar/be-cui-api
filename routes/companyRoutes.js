
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// List all tasks
router.get('/', companyController.listCompany);

// Create a new task
router.post('/create/', companyController.createCompany);

// View a single task by ID
router.get('/:id', companyController.viewCompany);

// Update a task
router.put('/:id', companyController.updateCompany);

// Toggle task status (activate/deactivate)
router.patch('/:id/:isActive', companyController.toggleCompanyStatus);

module.exports = router;

