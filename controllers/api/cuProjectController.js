const axios = require('axios'); // Import axios for making HTTP requests
const pool = require('../../config/database'); // Import the pg connection pool

class cuProjectController {
    static async insertTask(req, res) {
        const { project_id, cu_task_id } = req.query;

        if (!project_id || !cu_task_id) {
            return res.status(400).json({ message: 'Missing project_id or cu_task_id' });
        }

        // Check if cu_task_id already exists
        const checkQuery = `
            SELECT * FROM tasks WHERE cu_task_id = $1;
        `;

        try {
            const { rows: existingTasks } = await pool.query(checkQuery, [cu_task_id]);

            let taskDataResponse;

            if (existingTasks.length > 0) {
                // If exists, do not insert but update
                taskDataResponse = await cuProjectController.fetchAndStoreTaskData(cu_task_id, project_id, existingTasks[0].id);

                return res.status(200).json({
                    message: 'Task already exists, data updated successfully',
                    task: existingTasks[0], // Return the existing task
                    taskData: taskDataResponse // Include the updated task data
                });
            } else {
                // If does not exist, insert new record
                const insertQuery = `
                    INSERT INTO tasks (project_id, cu_task_id) 
                    VALUES ($1, $2) 
                    RETURNING *;
                `;
                const values = [project_id, cu_task_id];
                const { rows: task } = await pool.query(insertQuery, values);

                taskDataResponse = await cuProjectController.fetchAndStoreTaskData(cu_task_id, project_id, task[0].id);

                return res.status(201).json({
                    message: 'Data inserted successfully and task data fetched and stored',
                    task: task[0], // Return the inserted task
                    taskData: taskDataResponse // Include the fetched task data 
                });
            }
        } catch (error) {
            console.error('Error checking or inserting data:', error);
            return res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    static async fetchAndStoreTaskData(cu_task_id, project_id, taskId) {
        if (!cu_task_id) {
            throw new Error('Missing cu_task_id');
        }

        const url = `https://api.clickup.com/api/v2/task/${cu_task_id}`;
        const headers = {
            Authorization: "pk_60846077_JQGXG9DFNVM07G7ET0JCGASAWSO8S2YM",
        };

        try {
            const response = await axios.get(url, { headers });
            const data = response.data;

            const taskData = {
                task_title: data.name || null,
                start_date: data.start_date || null,
                due_date: data.due_date || null,
                actual_start_date: data.actual_start_date || null,
                actual_end_date: data.actual_end_date || null,
                rate_card: data.rate_card || null,
                plan_cost: data.plan_cost || null,
                actual_cost: data.actual_cost || null,
                spi: data.spi || null,
                cpi: data.cpi || null,
            };

            // Update task data in the tasks table
            const updateQuery = `
                UPDATE tasks 
                SET task_title = $1, start_date = $2, due_date = $3, actual_start_date = $4, 
                    actual_end_date = $5, rate_card = $6, plan_cost = $7, 
                    actual_cost = $8, spi = $9, cpi = $10 
                WHERE id = $11 
                RETURNING *;
            `;

            const values = [
                taskData.task_title,
                taskData.start_date,
                taskData.due_date,
                taskData.actual_start_date,
                taskData.actual_end_date,
                taskData.rate_card,
                taskData.plan_cost,
                taskData.actual_cost,
                taskData.spi,
                taskData.cpi,
                taskId // Use the existing task's ID for the update
            ];

            const { rows: updatedTask } = await pool.query(updateQuery, values);

            return updatedTask[0]; // Return the updated task data
        } catch (error) {
            console.error('Error fetching or updating task data:', error);
            throw new Error('Failed to fetch or update task data');
        }
    }
}

module.exports = cuProjectController;
