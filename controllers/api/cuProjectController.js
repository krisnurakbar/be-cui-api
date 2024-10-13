const axios = require('axios'); // Import axios for making HTTP requests
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

            // Execute fetchAndStoreTaskData after successful insertion
            const taskDataResponse = await this.fetchAndStoreTaskData(cu_task_id, project_id);

            return res.status(201).json({
                message: 'Data inserted successfully and task data fetched and stored',
                task: task[0], // Return the inserted task
                taskData: taskDataResponse // Include the fetched task data 
            });
        } catch (error) {
            console.error('Error inserting data:', error);
            return res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    static async fetchAndStoreTaskData(cu_task_id, project_id) {
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

            // Store task data in the tasks table (modify as necessary)
            const insertQuery = `
                INSERT INTO tasks (project_id, cu_task_id, task_title, start_date, due_date, actual_start_date, actual_end_date, rate_card, plan_cost, actual_cost, spi, cpi) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                RETURNING *;
            `;

            const values = [
                project_id,
                cu_task_id,
                taskData.task_title,
                taskData.start_date,
                taskData.due_date,
                taskData.actual_start_date,
                taskData.actual_end_date,
                taskData.rate_card,
                taskData.plan_cost,
                taskData.actual_cost,
                taskData.spi,
                taskData.cpi
            ];

            const { rows: insertedTask } = await pool.query(insertQuery, values);

            return insertedTask[0]; // Return the fetched task data
        } catch (error) {
            console.error('Error fetching or storing task data:', error);
            throw new Error('Failed to fetch or store task data');
        }
    }
}

module.exports = cuProjectController;
