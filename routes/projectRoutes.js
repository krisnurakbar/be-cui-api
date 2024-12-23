const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// Error handling middleware
const errorHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// List all projects
router.get('/', errorHandler(projectController.listProjects));

// Create a new project
router.post('/', errorHandler(projectController.createProject));

// View a single project by ID
router.get('/:id', errorHandler(projectController.viewProject));

// Update a project
router.put('/:id', errorHandler(projectController.updateProject));

// Update the status of a project
router.patch('/:id/:isActive', (req, res, next) => {
    console.log(`PATCH request received for ID: ${req.params.id}, isActive: ${req.params.isActive}`);
    next();
}, errorHandler(projectController.toggleProjectStatus));

router.post('/update_progress', errorHandler(projectController.updateProjectProgress))
router.post('/sync_tasks', errorHandler(projectController.syncTasksData))

// Get progress by project ID
router.get('/:cu_project_id/progress', errorHandler(projectController.getProjectProgressById));

// Get plan progress by project ID
router.get('/:id/plan-progress', errorHandler(projectController.calculatePlanProgress));

// Sync tasks by project ID Manually
router.get('/:id/sync-tasks-manual', errorHandler(projectController.syncTasksDataManual));

// Get project by cu_project_id
router.get('/info/:cu_project_id', errorHandler(projectController.getProjectById));

module.exports = router;
