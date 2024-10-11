const Project = require('../models/Project'); // Adjust the path as needed

// Utility function to handle errors
const handleError = (res, message, error) => {
    res.status(500).json({ message, error });
};

// List all projects
exports.listProjects = async (req, res) => {
    try {
        const projects = await Project.findAll();
        res.status(200).json(projects);
    } catch (error) {
        handleError(res, 'Error retrieving projects', error);
    }
};

// Create a new project
exports.createProject = async (req, res) => {
    try {
        const { project_name, cu_project_id, modified_by } = req.body;
        const newProject = await Project.create({ project_name, cu_project_id, modified_by });
        res.status(201).json(newProject);
    } catch (error) {
        handleError(res, 'Error creating project', error);
    }
};

// View a single project by ID
exports.viewProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await Project.findByPk(projectId);
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
    try {
        const projectId = req.params.id;
        const { project_name, cu_project_id, modified_by } = req.body;
        const project = await Project.findByPk(projectId);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only update fields that are provided
        project.project_name = project_name ?? project.project_name;
        project.cu_project_id = cu_project_id ?? project.cu_project_id;
        project.modified_by = modified_by ?? project.modified_by;

        await project.save();
        res.status(200).json(project);
    } catch (error) {
        handleError(res, 'Error updating project', error);
    }
};

// Toggle project status (activate/deactivate)
exports.toggleProjectStatus = async (req, res) => {
    const projectId = req.params.id; // Get project ID from request parameters
    const isActive = req.params.isActive === 'true'; // Convert isActive to boolean based on string comparison

    // Validate input (Note that the conversion already gives you a boolean)
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'Invalid input: isActive must be a boolean' });
    }

    try {
        const [updatedCount, updatedProjects] = await Project.update(
            { status: isActive }, // Update the project's status
            { where: { id: projectId }, returning: true }
        );

        if (updatedCount === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(200).json({ message: 'Project status updated', project: updatedProjects[0] });
    } catch (error) {
        console.error('Error updating project status:', error);
        res.status(500).json({ message: 'Error updating project status', error: error.message });
    }
};



