require('dotenv').config();  // Load environment variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const cuProjectRoutes = require('./routes/api/cuProjectRoutes');
const sequelize = require('./config/database'); // Ensure sequelize is imported before route definitions

// Initialize app
const app = express();

// Middleware
app.use(cors());  // Enable CORS
app.use(bodyParser.json());  // Parse JSON request bodies

// Basic route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Database connection testing route
app.get('/test-db', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.send('Database connection successful!');
    } catch (error) {
        res.status(500).send('Database connection failed: ' + error.message);
    }
});

// Route Definitions
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/api/task', cuProjectRoutes);

// Sync database before starting server or exporting
async function startApp() {
    try {
        await sequelize.sync({ alter: true });
        console.log('Database synced');
    } catch (err) {
        console.error('Error syncing database', err);
    }
}

// Start the app for local development
if (process.env.NODE_ENV === 'development') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, async () => {
        await startApp();
        console.log(`Server running on port ${PORT}`);
    });
} else {
    // Export the app for serverless environments like Vercel
    module.exports = async (req, res) => {
        await startApp(); // Ensure database is synced before handling requests
        app(req, res);
    };
}
