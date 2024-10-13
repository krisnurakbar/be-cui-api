const express = require('express');
const router = express.Router();
const cuProjectController = require('../../controllers/api/cuProjectController');

// Error handling middleware
const errorHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Route to handle insertion of a task using query parameters
router.post('/webhook', errorHandler(cuProjectController.insertTask));

router.get('/fetch-task-data', errorHandler(cuProjectController.fetchAndStoreTaskData));

module.exports = router;
