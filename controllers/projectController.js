const pool = require('../config/database'); // Import the pg connection pool
const cuProjectController = require('./api/cuProjectController'); // Import the CU project controller


// Utility function to handle errors
const handleError = (res, message, error) => {
    console.error(error); // Log the error for debugging
    res.status(500).json({ message, error: error.message });
};

// List all projects
exports.listProjects = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects'); // Fetch all projects
        res.status(200).json(result.rows); // Send the retrieved rows
    } catch (error) {
        handleError(res, 'Error retrieving projects', error);
    }
};

// Create a new project
exports.createProject = async (req, res) => {
    const { project_name, cu_project_id, modified_by, start_date, due_date, created_by } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO projects (project_name, cu_project_id, modified_by, created_at, status, start_date, due_date) VALUES ($1, $2, $3, NOW(), $4, $5, $6) RETURNING *',
            [project_name, cu_project_id, modified_by, 1, start_date, due_date]
        );

        const newProject = result.rows[0];

        // Call createProjectProgress and handle it here
        const progressResult = await exports.createProjectProgress({ 
            body: { 
                project_id: newProject.id,
                start_date: start_date,
                due_date: due_date,
                created_by: created_by 
            } 
        });

        // Only respond once after both operations complete successfully
        res.status(201).json({ newProject, progressResult });

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
    const { project_name, cu_project_id, modified_by, start_date, due_date, status } = req.body; // Include status and other fields

    try {
        const result = await pool.query(
            `UPDATE projects 
             SET project_name = COALESCE($1, project_name), 
                 cu_project_id = COALESCE($2, cu_project_id), 
                 modified_by = COALESCE($3, modified_by), 
                 start_date = COALESCE($4, start_date), 
                 due_date = COALESCE($5, due_date), 
                 status = COALESCE($6, status) 
             WHERE id = $7 
             RETURNING *`,
            [project_name, cu_project_id, modified_by, start_date, due_date, status, projectId] // Pass all variables including new fields
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

        res.status(200).json({ message: 'Project status updated', project: result.rows[0] });
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
    const projectId = req.params.id; // Get the project ID from the request parameters
    try {
        const result = await pool.query(
            `SELECT * FROM public.project_progress WHERE project_id = $1`,
            [projectId]
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
    const timezone = 'Asia/Jakarta'; // Set default timezone to Indonesia (Jakarta)
    const currentDate = new Date().toLocaleString('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const { rows: projects } = await pool.query(`SELECT * FROM public.project_progress WHERE report_date = $1`, [currentDate]);

    if (projects.length > 0) {
        const projectIds = projects.map(project => project.project_id);
        const tasks = await pool.query(`SELECT * FROM tasks WHERE project_id = ANY($1)`, [projectIds]);
        const taskList = tasks.rows;
        const totalTasks = taskList.length;

        const syncTask = async (task) => {
            try {
                await cuProjectController.fetchAndStoreTaskData(task.cu_task_id, task.project_id, task.id);
                console.log(`Task synced: ${task.task_title}`);
            } catch (error) {
                console.error(`Error syncing task ${task.name}: ${error.message}`);
            }
        };

        for (let index = 0; index < totalTasks; index++) {
            await syncTask(taskList[index]);
            console.log(`Task ${index + 1} of ${totalTasks} synced: ${taskList[index].task_title}`);
        }

        console.log('Tasks synced successfully.');

        // Call the updateProjectProgress function
        try {
            const response = await exports.updateProjectProgress(req, res);
            console.log('updateProjectProgress response:', response);
        } catch (error) {
            console.error('Error updating project progress:', error);
        }

        //res.status(200).json({ message: 'Tasks synced successfully.' });

        
    } else {
        console.log('No projects found for today. currentDate:', currentDate);
        error(res, 'No projects found for today.');
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
  
    for (const task of tasks.rows) {
      try {
        await cuProjectController.fetchAndStoreTaskData(task.cu_task_id, task.project_id, task.id);
        completedTasks++;
        // Send progress update
        res.write(`data: ${completedTasks}/${totalTasks}\n\n`);
        console.log(`Task synced: ${task.task_title}-${completedTasks}/${totalTasks}`);
      } catch (error) {
        console.error(`Error syncing task ${task.id}:`, error);
      }
    }
  
    res.end();
  };
// // Calculate SPI using the average from tasks table
// const calculateSPI = async (projectId) => {
//     const result = await pool.query(
//         `SELECT AVG(a.spi) as spi 
//          FROM tasks a 
//          WHERE a.project_id = $1`, 
//         [projectId]
//     );
//     return result.rows[0].spi || 0; // Return average or 0 if null
// };

// // Calculate CPI using the average from tasks table
// const calculateCPI = async (projectId) => {
//     const result = await pool.query(
//         `SELECT AVG(a.cpi) as cpi 
//          FROM tasks a 
//          WHERE a.project_id = $1`, 
//         [projectId]
//     );
//     return result.rows[0].cpi || 0; // Return average or 0 if null
// };

// const calculateActualProgress = async (projectId) => {
//     const result = await pool.query(
//         `SELECT * FROM project_progress_view ppv 
//          WHERE ppv.project_id = $1`, 
//         [projectId]
//     );
//     return result.rows[0].actual_progress || 0; // Return average or 0 if null
// };
