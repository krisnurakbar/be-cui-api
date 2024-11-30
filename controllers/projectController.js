const pool = require('../config/database'); // Import the pg connection pool
const cuProjectController = require('./api/cuProjectController'); // Import the CU project controller
const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: 'https://top-aardvark-24334.upstash.io',
    token: 'AV8OAAIjcDFlMDY4NDkxNzVlMzE0NTM2ODg2YmVkM2Q3ZDk0NTgxOHAxMA',
  });


// Utility function to handle errors
const handleError = (res, message, error) => {
    console.error(error); // Log the error for debugging
    res.status(500).json({ message, error: error.message });
};

// List all projects
exports.listProjects = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects'); // Fetch all projects
        //debug response
        res.status(200).json(result.rows); // Send the retrieved rows
        
        //secure response
        // res.status(200).json({ message: 'Projects retrieved successfully' });
    } catch (error) {
        handleError(res, 'Error retrieving projects', error);
    }
};

// Create a new project
exports.createProject = async (req, res) => {
    const { project_name, cu_project_id, modified_by, start_date, due_date, created_by, project_type, company_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO projects (project_name, cu_project_id, modified_by, created_at, status, start_date, due_date, project_type, company_id) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8) RETURNING *',
            [project_name, cu_project_id, modified_by, 1, start_date, due_date, project_type, company_id]
        );

        const newProject = result.rows[0];
        // Call createProjectProgress and handle it here
        const progressResult = await exports.createProjectProgress({ 
            body: { 
                project_id: newProject.id,
                start_date: start_date,
                due_date: due_date,
                created_by: created_by, 
                project_type: project_type
            } 
        });

        // Only respond once after both operations complete successfully
        //res.status(201).json({ newProject, progressResult });
        
        // secure response
        res.status(201).json({ message: 'Project created successfully' });
    } catch (error) {
        handleError(res, 'Error creating project', error);
    }
};

// Update createProjectProgress
exports.createProjectProgress = async (req) => {
    const { project_id, start_date, due_date, created_by } = req.body;

    // Validate input dates
    if (!start_date || !due_date) {
        throw new Error('Start date and due date are required');
    }

    const startDate = new Date(start_date);
    const dueDate = new Date(due_date);

    if (dueDate <= startDate) {
        throw new Error('Due date must be after the start date');
    }

    const duration_weeks = Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24 * 7));

    try {
        const weeks = Array.from({ length: duration_weeks }, (_, i) => i + 1);
        const queries = weeks.map((week_no) => {
            const modified_date = new Date();
            const report_date = new Date(startDate);
            report_date.setDate(report_date.getDate() + (week_no - 1) * 7);

            return pool.query(
                `INSERT INTO public.project_progress (project_id, modified_date, week_no, report_date, created_by) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [project_id, modified_date, week_no, report_date, created_by]
            );
        });

        await Promise.all(queries);
        return { message: 'Project progress created successfully', duration_weeks };

    } catch (error) {
        console.error(error);
        throw new Error('Failed to create project progress');
    }
};



// View a single project by ID
exports.viewProject = async (req, res) => {
    const projectId = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]); // Fetch the project by ID
        const project = result.rows[0];
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json(project);
    } catch (error) {
        handleError(res, 'Error retrieving project', error);
    }
};

// Update a project
exports.updateProject = async (req, res) => {
    const projectId = req.params.id;
    const { project_name, cu_project_id, modified_by, start_date, due_date, status, project_type } = req.body; // Include status and other fields

    try {
        const result = await pool.query(
            `UPDATE projects 
             SET project_name = COALESCE($1, project_name), 
                 cu_project_id = COALESCE($2, cu_project_id), 
                 modified_by = COALESCE($3, modified_by), 
                 start_date = COALESCE($4, start_date), 
                 due_date = COALESCE($5, due_date), 
                 status = COALESCE($6, status),
                 project_type = COALESCE($7, project_type) 
             WHERE id = $7 
             RETURNING *`,
            [project_name, cu_project_id, modified_by, start_date, due_date, status, projectId, project_type] // Pass all variables including new fields
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(200).json(result.rows[0]); // Return the updated project
    } catch (error) {
        handleError(res, 'Error updating project', error);
    }
};


// Toggle project status (activate/deactivate)
exports.toggleProjectStatus = async (req, res) => {
    const projectId = req.params.id; // Get project ID from request parameters
    const isActive = req.params.isActive === 'true'; // Convert isActive to boolean based on string comparison

    // Convert isActive boolean to integer for database storage
    const statusValue = isActive ? 1 : 0;

    try {
        const result = await pool.query(
            'UPDATE projects SET status = $1 WHERE id = $2 RETURNING *',
            [statusValue, projectId] // Update the project status
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(200).json({ message: 'Project status updated'});
    } catch (error) {
        console.error('Error updating project status:', error);
        res.status(500).json({ message: 'Error updating project status', error: error.message });
    }
};

// Define the cron job (running every minute)
exports.updateProjectProgress = async (req, res) => {
    try {
        // Fetch project progress data for today
        const result = await pool.query(`SELECT * FROM public.project_progress WHERE report_date = CURRENT_DATE`);
        const projectProgressUpdates = result.rows;

        // Check if there are updates
        if (projectProgressUpdates.length === 0) {
            console.log('No project progress entries to update for today.');
            return;
        }

        const projectIds = projectProgressUpdates.map(entry => entry.project_id);
        const metricsResult = await pool.query(
            `SELECT project_id, spi, cpi, actual_progress FROM public.project_progress_view WHERE project_id = ANY($1)`,
            [projectIds]
        );

        const updates = metricsResult.rows.map(row => ({
            id: projectProgressUpdates.find(entry => entry.project_id === row.project_id).id,
            spi: row.spi || 0,
            cpi: row.cpi || 0,
            actualProgress: row.actual_progress || 0
        }));

        for (const update of updates) {
            await pool.query(
                `UPDATE public.project_progress 
                 SET spi = $1, cpi = $2, modified_date = NOW(), actual_progress = $3
                 WHERE id = $4`,
                [update.spi, update.cpi, update.actualProgress, update.id]
            );
        }

        console.log('Project progress updated successfully.');
        res.status(200).json({ message: 'Project progress updated successfully.' });
    } catch (error) {
        console.error('Failed to update project progress:', error);
        res.status(500).json({ message: 'Failed to update project progress', error: error.message });
    }
};

// Get project progress by project ID
exports.getProjectProgressById = async (req, res) => {
    const cu_project_id = req.params.cu_project_id; // Get the project ID from the request parameters
    try {
        const result = await pool.query(
            `SELECT 
                pp.id,
                pp.project_id,
                TO_CHAR(pp.modified_date, 'YYYY-MM-DD') AS modified_date,
                pp.week_no,
                TO_CHAR(pp.report_date, 'YYYY-MM-DD') AS report_date,
                TO_CHAR(ROUND(CAST(pp.plan_progress AS NUMERIC), 2), 'FM999990.00') || ' %' AS plan_progress,
                pp.actual_progress || ' %' AS actual_progress,
                pp.plan_cost,
                pp.actual_cost,
                pp.plan_value,
                pp.actual_value,
                pp.spi,
                pp.cpi,
                pp.created_by
            FROM 
                public.project_progress pp
            JOIN projects as p ON pp.project_id = p.id
            WHERE p.cu_project_id = $1 
            order by pp.week_no asc`,
            [cu_project_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'No progress found for this project ID' });
        }

        res.status(200).json(result.rows); // Send the retrieved progress data
    } catch (error) {
        handleError(res, 'Error retrieving project progress', error);
    }
};


exports.syncTasksData = async (req, res) => {
    const moment = require('moment-timezone');
    const currentDate = moment().tz('Asia/Jakarta').format('YYYY/MM/DD');    
    const { rows: projects } = await pool.query(
        `SELECT * FROM public.project_progress WHERE TO_CHAR(report_date, 'YYYY/MM/DD') = $1`, 
        [currentDate]
    );
    console.log(currentDate);

    if (projects.length > 0) {
        const projectIds = projects.map(project => project.project_id);
        const tasks = await pool.query(`SELECT * FROM tasks WHERE project_id = ANY($1)`, [projectIds]);
        const taskList = tasks.rows;

        // Add tasks to the Upstash Redis Queue
        await Promise.all(taskList.map(async (task) => {
            try {
                await redis.rpush('sync-tasks', JSON.stringify(task));
                console.log(`Task ${task.task_title} added to queue.`);
            } catch (error) {
                console.error(`Error adding task ${task.task_title} to queue: ${error.message}`);
            }
        }));

        res.status(200).json({ message: 'Tasks added to queue' });
    } else {
        console.log('No projects found for today. currentDate:', currentDate);
        res.status(404).json({ message: 'No projects found for today.' });
    }
};

exports.calculatePlanProgress = async (req, res) => {
  const project_id = req.params.id; // Get the project ID from the request parameters
  try {
    // 1. Fetch all the progress records for the project
    const progressRecords = await pool.query(`
      SELECT id, project_id, report_date
      FROM project_progress
      WHERE project_id = $1   
    `, [project_id]);

    // Loop through each progress record and update the plan_progress
    for (const progress of progressRecords.rows) {
      const { id, project_id, report_date } = progress;

      // 2. Fetch total tasks for the project up to the report_date
      const totalTasksResult = await pool.query(`
        SELECT COUNT(*)
        FROM tasks
        WHERE project_id = $1
      `, [project_id]);

      const totalTasks = parseInt(totalTasksResult.rows[0].count, 10);

      // 3. Fetch completed tasks for the project up to the report_date
      const completedTasksResult = await pool.query(`
        SELECT COUNT(*)
        FROM tasks
        WHERE project_id = $1
        AND due_date <= $2
        AND status = 1
      `, [project_id, report_date]);

      const completedTasks = parseInt(completedTasksResult.rows[0].count, 10);

      // 4. Calculate the plan progress
      let planProgress = 0;
      if (totalTasks > 0) {
        planProgress = (completedTasks / totalTasks) * 100;
      }

      // 5. Update the plan_progress for the current report_date
      await pool.query(`
        UPDATE project_progress
        SET plan_progress = $1
        WHERE id = $2
      `, [planProgress, id]);

      console.log(`Updated plan progress for report_date ${report_date}: ${planProgress}%`);
    }

    res.status(200).json({ message: 'Plan progress updated successfully' });
  } catch (error) {
    console.error('Error updating plan progress:', error);
    res.status(500).json({ message: 'Error updating plan progress', error: error.message });
  }
};

exports.syncTasksDataManual = async (req, res) => {
    const project_id = req.params.id;
    const tasks = await pool.query(`SELECT * FROM tasks WHERE project_id = $1`, [project_id]);

    const totalTasks = tasks.rows.length;
    let completedTasks = 0;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
    });

    // Send initial progress update
    res.write(`data: ${completedTasks}/${totalTasks}\n\n`);

    // Use Promise.all to execute the tasks in parallel, to lower the execution time
    await Promise.all(tasks.rows.map(async (task) => {
        try {
            await redis.rpush('sync-tasks', JSON.stringify(task));
            completedTasks++;
            // Send progress update
            res.write(`data: ${completedTasks}/${totalTasks}\n\n`);
            console.log(`Task ${task.task_title} added to queue - ${completedTasks}/${totalTasks}`);
        } catch (error) {
            console.error(`Error adding task ${task.id} to queue:`, error);
        }
    }));

    res.end();
};

exports.getProjectById = async (req, res) => {
    const cu_project_id = req.params.cu_project_id;

    try {
        const result = await pool.query(`SELECT * FROM projects WHERE cu_project_id = $1`, [cu_project_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No project found with the given cu_project_id' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        handleError(res, 'Error retrieving project by cu_project_id', error);
    }
};
