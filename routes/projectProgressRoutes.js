const express = require('express');
const router = express.Router();
const projectProgressController = require('../controllers/projectProgressController');

//route created
router.post('/create', projectProgressController.createProjectProgress);

//route progres update by id
router.put('/update/:project_id', projectProgressController.updateProjectProgress);

//route progres update by cu_project_id
router.put('/updateByParameter/:cu_project_id', projectProgressController.updateProjectProgressByCuProjectId);

//route progres delete by id
router.delete('/delete/:id', projectProgressController.deleteProjectProgress);

//route progress project view
router.get('/view', projectProgressController.getProjectProgressView);

module.exports = router;