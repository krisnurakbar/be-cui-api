const pool = require('../config/database'); // Import the pg connection pool

// Error handling function
const handleError = (res, message, error) => {
  console.error(error); // Log the error for debugging
  res.status(500).json({ message, error: error.message });
};

//create a new project progress
exports.createProjectProgress = async (req, res) => {
  const { project_id, week_no, report_date, plan_progress, actual_progress, plan_cost, actual_cost, spi, cpi, created_by, plan_value, actual_value } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO project_progress (project_id, week_no, report_date, plan_progress, actual_progress, plan_cost, actual_cost, spi, cpi, created_by, plan_value, actual_value) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [project_id, week_no, report_date, plan_progress, actual_progress, plan_cost, actual_cost, spi, cpi, created_by, plan_value, actual_value]
    );
    // response for debug
    // res.status(201).json(result.rows[0]);
    // secure response
    res.status(201).json({ message: 'Project progress created successfully' });
  } catch (error) {
    handleError(res, 'Error creating project progress', error);
  }
};

exports.updateProjectProgress = async (req, res) => {
  const { id, project_id, week_no, report_date, plan_progress, actual_progress, plan_cost, actual_cost, spi, cpi, created_by, plan_value, actual_value } = req.body;

  // Validate numeric fields
  const validateNumber = (value) => {
    return value !== "" ? parseFloat(value) : null; // Convert empty string to null
  };

  try {
    const result = await pool.query(
      `UPDATE project_progress 
       SET project_id = $1, week_no = $2, report_date = $3, plan_progress = $4, actual_progress = $5, 
       plan_cost = $6, actual_cost = $7, spi = $8, cpi = $9, created_by = $10, plan_value = $11, actual_value = $12 
       WHERE id = $13 RETURNING *`,
      [
        project_id,
        week_no,
        report_date,
        validateNumber(plan_progress),
        validateNumber(actual_progress),
        validateNumber(plan_cost),
        validateNumber(actual_cost),
        validateNumber(spi),
        validateNumber(cpi),
        created_by,
        validateNumber(plan_value),
        validateNumber(actual_value),
        id
      ]
    );
    // response for debug
    // res.status(200).json(result.rows[0]);
    // console.log(result.rows[0]);
    // secure response
    res.status(200).json({ message: 'Project progress updated successfully' });
  } catch (error) {
    handleError(res, 'Error updating project progress', error);
  }
};

//delete a project progress
exports.deleteProjectProgress = async (req, res) => {
    const { id } = req.body;
    try {
        const result = await pool.query(
            'DELETE FROM project_progress WHERE id = $1 RETURNING *',
            [id]
        );
        // response for debug
        // res.status(200).json(result.rows[0]);
        // secure response
        res.status(200).json({ message: 'Project progress deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting project progress', error: error.message });
    }
};

// get all project progress view
exports.getProjectProgressView = async (req, res) => {
  const { company_id } = req.query;
  if (company_id === undefined) {
    console.log(company_id);
    return res.status(400).json({ message: 'company_id is required' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM project_progress_view WHERE company_id = $1', [company_id]
    );
    if (result.rows.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error getting project progress view', error: error.message });
  }
}

exports.updateProjectProgressByCuProjectId = async (req, res) => {
  const { cu_project_id } = req.params;
  // console.log(`Updating project progress for cu_project_id: ${cu_project_id}`);
  try {
    const result = await pool.query(
      'SELECT id FROM projects WHERE cu_project_id = $1',
      [cu_project_id]
    );
    const projectId = result.rows[0]?.id;

    if (!projectId) {
      return res.status(400).json({ message: 'Project not found', error: 'Project not found' });
    }

    // Fetch project progress entries with a specific report date
    const result2 = await pool.query(
      `SELECT * FROM public.project_progress WHERE report_date = CURRENT_DATE AND project_id = $1`,
      [projectId]
    );
    const projectProgressUpdates = result2.rows;

    // Get the current date for comparisons
    const currentDate = new Date();

    // Iterate over each project progress entry and perform necessary updates
    let isUpdated = false;
    for (const entry of projectProgressUpdates) {
      // Check if the entry's report_date matches today's date
      if (
        entry.report_date.toISOString().split('T')[0] ===
        currentDate.toISOString().split('T')[0]
      ) {
        const spi = await calculateSPI(projectId); // Pass project id for calculation
        const cpi = await calculateCPI(projectId); // Pass project id for calculation
        const actualProgress = await calculateActualProgress(projectId); // Pass project id for calculation

        // Update the entry in the database
        await pool.query(
          `UPDATE public.project_progress 
           SET spi = $1, cpi = $2, modified_date = NOW(), actual_progress = $3
           WHERE id = $4`,
          [spi, cpi, actualProgress, entry.id]
        );
        isUpdated = true;
      }
    }
    if (isUpdated) {
      console.log('Project progress updated successfully.');
      res.status(200).json({ message: 'Project progress updated successfully' });
    } else {
      console.log('No project progress entries to update for today.');
      res.status(200).json({ message: 'No project progress entries to update for today.' });
    }
  } catch (error) {
    console.error('Failed to update project progress:', error);
    res.status(500).json({ message: 'Failed to update project progress', error: error.message });
  }
};

