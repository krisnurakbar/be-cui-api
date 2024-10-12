const pool = require('../../config/database'); // Import the pg connection pool

class cuProjectController {
    static async insertTask(req, res) {
        const { project_id, cu_task_id } = req.query;

        if (!project_id || !cu_task_id) {
            return res.status(400).json({ message: 'Missing project_id or cu_task_id' });
        }

        const query = `
            INSERT INTO tasks (project_id, cu_task_id) 
            VALUES ($1, $2) 
            RETURNING *;
        `;

        try {
            const values = [project_id, cu_task_id];
            const { rows: task } = await pool.query(query, values);

            return res.status(201).json({
                message: 'Data inserted successfully',
                task: task[0], // Return the inserted task
            });
        } catch (error) {
            console.error('Error inserting data:', error);
            return res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }
}

module.exports = cuProjectController;
