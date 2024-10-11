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

app.use('/auth', authRoutes);  // Import authRoutes from separate file

app.use('/users', userRoutes);  // Import userRoutes from separate file

app.use('/projects', projectRoutes);  // Import userRoutes from separate file

app.use('/tasks', taskRoutes);  // Import userRoutes from separate file

app.use('/api/task', cuProjectRoutes);  // Import userRoutes from separate file

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Database synchronization
const sequelize = require('./config/database');


sequelize.sync({ alter: true })
    .then(() => {
        console.log('Database synced');
    })
    .catch((err) => {
        console.error('Error syncing database', err);
    });
