const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database'); // Import the pool from your PG config

// Handler for user registration
exports.create = async (req, res) => {
    const { email, password, role } = req.body;

    try {
        // Check if the user already exists
        const existingUserResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUserResult = await pool.query(
            'INSERT INTO users (email, password_hash, role, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [email, hashedPassword, role || 'user', 0] // Set status as 1 (active)
        );

        // Response for debug
        // const newUser = newUserResult.rows[0]; // Get the inserted user
        // res.status(201).json({
        //     id: newUser.id,
        //     email: newUser.email,
        //     role: newUser.role
        // });
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Handler for user login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user is active
        if (user.status !== 1) {
            return res.status(401).json({ message: 'User is not active' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Create JWT token
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1h' // Token expires in 1 hour
        });

        // Response
        res.status(200).json({
            id: user.id,
            email: user.email,
            role: user.role,
            token: token
        });
        // res.status(200).json({ message: 'Logged in successfully', token: token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



