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

const BATCH_SIZE = 100; // Define the size of each batch

exports.updateProjectProgress = async () => {
    try {
        // Fetch project progress entries with today's report date
        const { rows: projectProgressUpdates } = await pool.query(
            `SELECT id, project_id FROM public.project_progress WHERE report_date = CURRENT_DATE`
        );

        if (projectProgressUpdates.length === 0) {
            console.log('No project progress entries to update for today.');
            return;
        }

        // Fetch SPI, CPI, and actual progress for all project_ids
        const projectIds = projectProgressUpdates.map(entry => entry.project_id);
        const metrics = await fetchProjectMetrics(projectIds);

        if (metrics.length === 0) {
            console.log('No valid metrics to update.');
            return;
        }

        // Process in batches
        for (let i = 0; i < projectProgressUpdates.length; i += BATCH_SIZE) {
            const batch = projectProgressUpdates.slice(i, i + BATCH_SIZE);
            const updateQueries = batch.map(entry => {
                const { spi, cpi, actual_progress } = metrics[entry.project_id] || {};
                if (spi !== undefined && cpi !== undefined && actual_progress !== undefined) {
                    return pool.query(
                        `UPDATE public.project_progress 
                        SET spi = $1, cpi = $2, modified_date = NOW(), actual_progress = $3 
                        WHERE id = $4`,
                        [spi, cpi, actual_progress, entry.id]
                    );
                }
                return null;
            }).filter(query => query !== null);

            // Execute the batch of queries
            await Promise.all(updateQueries);
        }

        console.log('Project progress updated successfully.');
    } catch (error) {
        console.error('Failed to update project progress:', error);
    }
};


// Fetch SPI, CPI, and actual progress for all project_ids in one go
const fetchProjectMetrics = async (projectIds) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.project_id, 
                AVG(a.spi) AS spi, 
                AVG(a.cpi) AS cpi, 
                pv.actual_progress 
            FROM tasks a
            JOIN project_progress_view pv ON pv.project_id = a.project_id
            WHERE a.project_id = ANY($1::int[])
            GROUP BY a.project_id, pv.actual_progress
        `, [projectIds]);

        // Map results by project_id for easier access
        return result.rows.reduce((acc, row) => {
            acc[row.project_id] = {
                spi: row.spi || 0,
                cpi: row.cpi || 0,
                actual_progress: row.actual_progress || 0,
            };
            return acc;
        }, {});
    } catch (error) {
        console.error('Error fetching project metrics:', error);
        return [];
    }
};


// Define the cron job (running every minute)
// exports.updateProjectProgress = async () => {
//     try {
//         // Fetch project progress entries with today's report date
//         const result = await pool.query(`SELECT * FROM public.project_progress WHERE report_date = CURRENT_DATE`);
//         const projectProgressUpdates = result.rows;

//         // Check if there are entries to update
//         if (projectProgressUpdates.length === 0) {
//             console.log('No project progress entries to update for today.');
//             return;
//         }

//         // Prepare promises for calculating SPI, CPI, and actual progress for all relevant entries
//         const updates = projectProgressUpdates.map(async (entry) => {
//             try {
//                 const [spi, cpi, actualProgress] = await Promise.all([
//                     calculateSPI(entry.project_id),
//                     calculateCPI(entry.project_id),
//                     calculateActualProgress(entry.project_id)
//                 ]);

//                 return {
//                     id: entry.id,
//                     spi,
//                     cpi,
//                     actualProgress
//                 };
//             } catch (error) {
//                 console.error(`Error calculating metrics for project ID ${entry.project_id}:`, error);
//                 return null; // Return null if there's an error calculating metrics
//             }
//         });

//         // Filter out any null updates in case of calculation errors
//         const validUpdates = (await Promise.all(updates)).filter(update => update !== null);

//         // Update the database for all valid updates in a single operation if possible
//         if (validUpdates.length > 0) {
//             const updateQueries = validUpdates.map((update) => {
//                 return pool.query(
//                     `UPDATE public.project_progress 
//                     SET spi = $1, cpi = $2, modified_date = NOW(), actual_progress = $3
//                     WHERE id = $4`,
//                     [update.spi, update.cpi, update.actualProgress, update.id]
//                 );
//             });

//             try {
//                 // Execute all update queries concurrently
//                 await Promise.all(updateQueries);
//                 console.log('Project progress updated successfully.');
//             } catch (error) {
//                 console.error('Error during project progress updates:', error);
//                 // Adding specific logic based on error type if necessary
//             }
//         } else {
//             console.log('No valid updates to process.');
//         }

//     } catch (error) {
//         console.error('Failed to update project progress:', error);
//     }
// };



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
