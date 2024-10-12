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
    const { project_name, cu_project_id, modified_by } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO projects (project_name, cu_project_id, modified_by, created_at, status) VALUES ($1, $2, $3, NOW(), $4) RETURNING *',
            [project_name, cu_project_id, modified_by, 1] // Defaulting status to 1 (active)
        );
        res.status(201).json(result.rows[0]); // Return the newly created project
    } catch (error) {
        handleError(res, 'Error creating project', error);
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
    const { project_name, cu_project_id, modified_by } = req.body;
    try {
        const result = await pool.query(
            'UPDATE projects SET project_name = COALESCE($1, project_name), cu_project_id = COALESCE($2, cu_project_id), modified_by = COALESCE($3, modified_by) WHERE id = $4 RETURNING *',
            [project_name, cu_project_id, modified_by, projectId]
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
