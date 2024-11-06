const pool = require('../config/database'); // Import the pg connection pool

// Error handling function
const handleError = (res, message, error) => {
  console.error(error); // Log the error for debugging
  res.status(500).json({ message, error: error.message });
};

//create a new project progress
exports.createProjectProgress = async (req, res) => {
  const { project_id, week_no, report_date, plan_progress, actual_progress, plan_cost, actual_cost, spi, cpi, created_by } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO project_progress (project_id, week_no, report_date, plan_progress, actual_progress, plan_cost, actual_cost, spi, cpi, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [project_id, week_no, report_date, plan_progress, actual_progress, plan_cost, actual_cost, spi, cpi, created_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(res, 'Error creating project progress', error);
  }
};

exports.updateProjectProgress = async (req, res) => {
  const { id, project_id, week_no, report_date, plan_progress, actual_progress, plan_cost, actual_cost, spi, cpi, created_by } = req.body;

  // Validate numeric fields
  const validateNumber = (value) => {
    return value !== "" ? parseFloat(value) : null; // Convert empty string to null
  };

  try {
    const result = await pool.query(
      `UPDATE project_progress 
       SET project_id = $1, week_no = $2, report_date = $3, plan_progress = $4, actual_progress = $5, 
       plan_cost = $6, actual_cost = $7, spi = $8, cpi = $9, created_by = $10 
       WHERE id = $11 RETURNING *`,
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
        id
      ]
    );
    res.status(200).json(result.rows[0]);
    console.log(result.rows[0]);
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
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error deleting project progress', error: error.message });
    }
};
