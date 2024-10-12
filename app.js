require('dotenv').config();  // Load environment variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const cuProjectRoutes = require('./routes/api/cuProjectRoutes');

// Initialize app
const app = express();

// Middleware
app.use(cors());  // Enable CORS
app.use(bodyParser.json());  // Parse JSON request bodies

// Basic route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/test-db', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.send('Database connection successful!');
    } catch (error) {
        res.status(500).send('Database connection failed: ' + error.message);
    }
});


app.use('/auth', authRoutes);  // Import authRoutes from separate file
app.use('/users', userRoutes);  // Import userRoutes from separate file
app.use('/projects', projectRoutes);  // Import projectRoutes from separate file
app.use('/tasks', taskRoutes);  // Import taskRoutes from separate file
app.use('/api/task', cuProjectRoutes);  // Import cuProjectRoutes from separate file

// Database synchronization
const sequelize = require('./config/database');

sequelize.sync({ alter: true })
    .then(() => {
        console.log('Database synced');
    })
    .catch((err) => {
        console.error('Error syncing database', err);
    });

// Export the app for use in serverless function
module.exports = (req, res) => {
    // Use express's handle function to handle requests
    app(req, res);
};
