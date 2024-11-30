const cron = require('node-cron');
const pool = require('../config/database'); // Import the pg connection pool
const projectController = require('../controllers/projectController');

// Set the timezone to Indonesia (Jakarta)
process.env.TZ = 'Asia/Jakarta';

// Define the cron job to run every day at 5 PM
const syncDataProgressJob = () => {
    cron.schedule('0 17 * * *', async () => {
        console.log('Running update for project progress...');
        try {
            await projectController.syncTasksData();
        } catch (error) {
            console.error(error);
        }
    });
};

module.exports = syncDataProgressJob
