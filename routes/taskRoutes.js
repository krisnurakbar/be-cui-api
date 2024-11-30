const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// List all tasks
router.get('/', taskController.listTasks);

// List tasks by project_id
router.get('/:cu_project_id', taskController.listProjectTasks); // New route for getting tasks by project_id

// Create a new task
router.post('/', taskController.createTask);

// View a single task by ID
router.get('/:id', taskController.viewTask);

// Update a task
router.put('/:id', taskController.updateTask);

// Toggle task status (activate/deactivate)
router.patch('/:id/:isActive', taskController.toggleTaskStatus);

module.exports = router;
