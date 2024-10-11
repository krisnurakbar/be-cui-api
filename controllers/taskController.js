const Task = require('../models/Task'); // Adjust the path as needed

// List all tasks
exports.listTasks = async (req, res) => {
    try {
        const tasks = await Task.findAll();
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving tasks', error });
    }
};

// List all tasks by project_id
exports.listProjectTasks = async (req, res) => {
    try {
        const projectId = req.params.project_id; // Get project_id from route parameters
        
        // Validate project_id
        if (!projectId) {
            return res.status(400).json({ message: 'Missing project_id parameter' });
        }

        const tasks = await Task.findAll({ where: { project_id: projectId } }); // Fetch tasks for the specific project_id
        
        // Check if any tasks were found
        if (tasks.length === 0) {
            return res.status(404).json({ message: 'No tasks found for the given project_id' });
        }

        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving tasks', error });
    }
};


// Create a new task
exports.createTask = async (req, res) => {
    try {
        const { project_id, cu_task_id, task_title, start_date, due_date, actual_start_date, actual_end_date, rate_card, plan_cost, actual_cost, spi, cpi, status } = req.body;
        const newTask = await Task.create({
            project_id,
            cu_task_id,
            task_title,
            start_date,
            due_date,
            actual_start_date,
            actual_end_date,
            rate_card,
            plan_cost,
            actual_cost,
            spi,
            cpi,
            status,
        });
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ message: 'Error creating task', error });
    }
};

// View a single task by ID
exports.viewTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving task', error });
    }
};

// Update a task
exports.updateTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const { project_id, cu_task_id, task_title, start_date, due_date, actual_start_date, actual_end_date, rate_card, plan_cost, actual_cost, spi, cpi, status } = req.body;
        const task = await Task.findByPk(taskId);
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.project_id = project_id || task.project_id;
        task.cu_task_id = cu_task_id || task.cu_task_id;
        task.task_title = task_title || task.task_title;
        task.start_date = start_date || task.start_date;
        task.due_date = due_date || task.due_date;
        task.actual_start_date = actual_start_date || task.actual_start_date;
        task.actual_end_date = actual_end_date || task.actual_end_date;
        task.rate_card = rate_card || task.rate_card;
        task.plan_cost = plan_cost || task.plan_cost;
        task.actual_cost = actual_cost || task.actual_cost;
        task.spi = spi || task.spi;
        task.cpi = cpi || task.cpi;
        task.status = status || task.status;

        await task.save();
        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task', error });
    }
};

// Toggle task status (activate/deactivate)
exports.toggleTaskStatus = async (req, res) => {
    const taskId = req.params.id; // Get task ID from request parameters
    const isActive = req.params.isActive === 'true'; // Convert isActive to boolean based on string comparison

    // Validate input
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'Invalid input: isActive must be a boolean' });
    }

    try {
        const [updatedCount, updatedTasks] = await Task.update(
            { status: isActive }, // Update the task's status
            { where: { id: taskId }, returning: true }
        );

        if (updatedCount === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json({ message: 'Task status updated', task: updatedTasks[0] });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ message: 'Error updating Task status', error: error.message });
    }
};
