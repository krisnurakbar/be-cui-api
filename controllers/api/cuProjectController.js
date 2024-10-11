const Task = require('../../models/Task'); // Adjust path if needed

class cuProjectController {
    static async insertTask(req, res) {
        const { project_id, cu_task_id } = req.query;

        if (!project_id || !cu_task_id) {
            return res.status(400).json({ message: 'Missing project_id or cu_task_id' });
        }

        try {
            // Insert the data into the 'task' table
            const task = await Task.create({
                project_id: project_id,
                cu_task_id: cu_task_id,
            });

            return res.status(201).json({
                message: 'Data inserted successfully',
                task
            });
        } catch (error) {
            console.error('Error inserting data:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = cuProjectController;
