const cron = require('node-cron');
const pool = require('../config/database'); // Import the pg connection pool

// Define the cron job (running every minute)
const updateProjectProgressJob = () => {
    cron.schedule('* * * * *', async () => {
        console.log('Running update for project progress...');

        try {
            // Fetch project progress entries with a specific report date
            const result = await pool.query(`SELECT * FROM public.project_progress WHERE report_date <= NOW()`);
            const projectProgressUpdates = result.rows;

            // Get the current date for comparisons
            const currentDate = new Date();

            // Iterate over each project progress entry and perform necessary updates
            for (const entry of projectProgressUpdates) {
                // Check if the entry's report_date matches today's date
                if (entry.report_date.toISOString().split('T')[0] === currentDate.toISOString().split('T')[0]) {
                    const spi = await calculateSPI(entry.project_id); // Pass project id for calculation
                    const cpi = await calculateCPI(entry.project_id); // Pass project id for calculation
                    const actualProgress = await calculateActualProgress(entry.project_id); // Pass project id for calculation

                    // Update the entry in the database
                    await pool.query(
                        `UPDATE public.project_progress 
                         SET spi = $1, cpi = $2, modified_date = NOW(), actual_progress = $3
                         WHERE id = $4`,
                        [spi, cpi, actualProgress, entry.id]
                    );
                }
            }
            console.log('Project progress updated successfully.');
        } catch (error) {
            console.error('Failed to update project progress:', error);
        }
    });
};

// Calculate SPI using the average from tasks table
const calculateSPI = async (projectId) => {
    const result = await pool.query(
        `SELECT AVG(a.spi) as spi 
         FROM tasks a 
         WHERE a.project_id = $1`, 
        [projectId]
    );
    return result.rows[0].spi || 0; // Return average or 0 if null
};

// Calculate CPI using the average from tasks table
const calculateCPI = async (projectId) => {
    const result = await pool.query(
        `SELECT AVG(a.cpi) as cpi 
         FROM tasks a 
         WHERE a.project_id = $1`, 
        [projectId]
    );
    return result.rows[0].cpi || 0; // Return average or 0 if null
};

const calculateActualProgress = async (projectId) => {
    const result = await pool.query(
        `SELECT * FROM project_progress_view ppv 
         WHERE ppv.project_id = $1`, 
        [projectId]
    );
    return result.rows[0].actual_progress || 0; // Return average or 0 if null
};


module.exports = updateProjectProgressJob;
