const pool = require('../config/database'); // Import the pg connection pool

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
exports.updateProjectProgress = async () => {
    try {
        // Fetch project progress data for today
        const result = await pool.query(`SELECT * FROM public.project_progress WHERE report_date = CURRENT_DATE`);
        const projectProgressUpdates = result.rows;

        // Check if there are updates
        if (projectProgressUpdates.length === 0) {
            console.log('No project progress entries to update for today.');
            return;
        }

        // Prepare promises for calculating metrics from the view
        const metricsPromises = projectProgressUpdates.map((entry) =>
            pool.query('SELECT spi, cpi, actual_progress FROM public.project_progress_view WHERE project_id = $1', [entry.project_id])
        );

        const metricsResults = await Promise.all(metricsPromises);
        const updates = metricsResults.map((res, index) => ({
            id: projectProgressUpdates[index].id,
            spi: res.rows[0]?.spi || 0,
            cpi: res.rows[0]?.cpi || 0,
            actualProgress: res.rows[0]?.actual_progress || 0
        }));

        // Filter out any null updates in case of calculation errors
        const validUpdates = updates.filter(update => update.spi !== null);

        if (validUpdates.length > 0) {
            const updateQueries = validUpdates.map(update =>
                pool.query(
                    `UPDATE public.project_progress 
                     SET spi = $1, cpi = $2, modified_date = NOW(), actual_progress = $3
                     WHERE id = $4`,
                    [update.spi, update.cpi, update.actualProgress, update.id]
                )
            );

            await Promise.all(updateQueries);
            console.log('Project progress updated successfully.');
        } else {
            console.log('No valid updates to process.');
        }
    } catch (error) {
        console.error('Failed to update project progress:', error);
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
