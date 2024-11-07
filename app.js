require('dotenv').config();  // Load environment variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const projectProgressRoutes = require('./routes/projectProgressRoutes');
const taskRoutes = require('./routes/taskRoutes');
const cuProjectRoutes = require('./routes/api/cuProjectRoutes');
const pool = require('./config/database'); // Import the connection pool from database.js



// Initialize app
const app = express();

// Middleware
app.use(cors());  // Enable CORS
app.use(bodyParser.json());  // Parse JSON request bodies

// Basic route
app.get('/', (req, res) => {
    res.send('Hiii World!');
});

// Database connection testing route
app.get('/test-db', async (req, res) => {
    try {
        const client = await pool.connect(); // Get a client from the pool
        const result = await client.query('SELECT NOW()'); // Test query
        res.send('Database connection successful: ' + result.rows[0].now);
        client.release(); // Release the client back to the pool
    } catch (error) {
        res.status(500).send('Database connection failed: ' + error.message);
    }
});

// Route Definitions
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/project/progress', projectProgressRoutes);
app.use('/tasks', taskRoutes);
app.use('/api/task', cuProjectRoutes);

// Start the app for local development
if (process.env.NODE_ENV === 'development') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
} else {
    // Export the app for serverless environments like Vercel
    module.exports = app;
}
