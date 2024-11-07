const pool = require('../config/database'); // Import the pg connection pool

// List all tasks
exports.listTasks = async (req, res) => {
    try {
        const { rows: tasks } = await pool.query('SELECT * FROM tasks'); // Replace 'tasks' with your actual table name
        // response for debug
        // res.status(200).json(tasks);
        // response for secure
        res.status(200).json({ message: 'Tasks retrieved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving tasks', error });
    }
};

// List all tasks by project_id
exports.listProjectTasks = async (req, res) => {
    const projectId = req.params.project_id;

    if (!projectId) {
        return res.status(400).json({ message: 'Missing project_id parameter' });
    }

    try {
        const { rows: tasks } = await pool.query('SELECT * FROM tasks WHERE project_id = $1', [projectId]); // Adjust 'tasks' to your table name

        if (tasks.length === 0) {
            return res.status(404).json({ message: 'No tasks found for the given project_id' });
        }
        // response for debug
        // res.status(200).json(tasks);
        // response for secure
        res.status(200).json({ message: 'Tasks retrieved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving tasks', error });
    }
};

// Create a new task
exports.createTask = async (req, res) => {
    const { project_id, cu_task_id, task_title, start_date, due_date, actual_start_date, actual_end_date, rate_card, plan_cost, actual_cost, spi, cpi, status } = req.body;

    const query = `
        INSERT INTO tasks (project_id, cu_task_id, task_title, start_date, due_date, actual_start_date, actual_end_date, rate_card, plan_cost, actual_cost, spi, cpi, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
    `;

    try {
        const values = [project_id, cu_task_id, task_title, start_date, due_date, actual_start_date, actual_end_date, rate_card, plan_cost, actual_cost, spi, cpi, status];
        const { rows: newTask } = await pool.query(query, values);
        // response for debug
        // res.status(201).json(newTask[0]);
        // response for secure
        res.status(201).json({ message: 'Task created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating task', error });
    }
};

// View a single task by ID
exports.viewTask = async (req, res) => {
    const taskId = req.params.id;

    try {
        const { rows: task } = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]); // Adjust 'tasks' to your table name
        if (task.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        // response for debug
        // res.status(200).json(task[0]);
        // response for secure
        res.status(200).json({ message: 'Task retrieved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving task', error });
    }
};

// Update a task
exports.updateTask = async (req, res) => {
    const taskId = req.params.id;
    const { project_id, cu_task_id, task_title, start_date, due_date, actual_start_date, actual_end_date, rate_card, plan_cost, actual_cost, spi, cpi, status } = req.body;

    const query = `
        UPDATE tasks
        SET project_id = COALESCE($1, project_id), 
            cu_task_id = COALESCE($2, cu_task_id), 
            task_title = COALESCE($3, task_title),
            start_date = COALESCE($4, start_date),
            due_date = COALESCE($5, due_date),
            actual_start_date = COALESCE($6, actual_start_date),
            actual_end_date = COALESCE($7, actual_end_date),
            rate_card = COALESCE($8, rate_card),
            plan_cost = COALESCE($9, plan_cost),
            actual_cost = COALESCE($10, actual_cost),
            spi = COALESCE($11, spi),
            cpi = COALESCE($12, cpi),
            status = COALESCE($13, status)
        WHERE id = $14
        RETURNING *;
    `;

    try {
        const values = [project_id, cu_task_id, task_title, start_date, due_date, actual_start_date, actual_end_date, rate_card, plan_cost, actual_cost, spi, cpi, status, taskId];
        const { rowCount, rows: updatedTask } = await pool.query(query, values);

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        // response for debug
        // res.status(200).json(updatedTask[0]);
        // response for secure
        res.status(200).json({ message: 'Task updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating task', error });
    }
};

// Toggle task status (activate/deactivate)
exports.toggleTaskStatus = async (req, res) => {
    const taskId = req.params.id; 
    const isActive = req.params.isActive === 'true'; 

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'Invalid input: isActive must be a boolean' });
    }

    try {
        const { rowCount, rows: updatedTasks } = await pool.query('UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *', [isActive, taskId]);

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        // response for debug
        // res.status(200).json({ message: 'Task status updated', task: updatedTasks[0] });
        // response for secure
        res.status(200).json({ message: 'Task status updated' });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ message: 'Error updating Task status', error: error.message });
    }
};
