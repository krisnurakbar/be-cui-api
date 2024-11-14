const pool = require('../config/database'); // Import the pg connection pool
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserController {
    async create(req, res) {
        const { email, password, role, company_id, first_name, last_name } = req.body;
    
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
                'INSERT INTO users (email, password_hash, role, company_id, status, created_at, first_name, last_name) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7 ) RETURNING *',
                [email, hashedPassword, role || 'user', company_id, 0, first_name, last_name] // Set status as 1 (active)
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

    // Get all users
    async listUsers(req, res) {
        try {
            const { rows: users } = await pool.query('select u.*, c."name"  from users u join companies c on u.company_id  = c.id'); // Adjust this to your actual users table name
            // ressponse for debug
            res.status(200).json(users);
            
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving users', error: error.message });
        }
    }

    // Activate or deactivate user account
    async toggleUserStatus(req, res) {
        const { userId } = req.params; // Get user ID from request parameters
        const isActive = req.params.isActive === 'true'; // Convert isActive to boolean based on string comparison

        try {
            const statusValue = isActive ? 1 : 0; // Convert boolean to integer for database storage
            const { rowCount, rows: updatedUsers } = await pool.query(
                'UPDATE users SET status = $1 WHERE id = $2 RETURNING *',
                [statusValue, userId]
            );

            if (rowCount === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ message: 'User status updated', user: updatedUsers[0] });
        } catch (error) {
            res.status(500).json({ message: 'Error updating user status', error: error.message });
        }
    }
}

module.exports = new UserController();
