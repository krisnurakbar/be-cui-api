const pool = require('../config/database'); // Import the pg connection pool

class UserController {
    // Get all users
    async listUsers(req, res) {
        try {
            const { rows: users } = await pool.query('SELECT * FROM users'); // Adjust this to your actual users table name
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving users', error: error.message });
        }
    }

    // Activate or deactivate user account
    async toggleUserStatus(req, res) {
        const { userId } = req.params; // Get user ID from request parameters
        const isActive = req.params.isActive === 'true'; // Convert isActive to boolean based on string comparison

        // Validate input
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: 'Invalid input: isActive must be a boolean' });
        }

        try {
            const { rowCount, rows: updatedUsers } = await pool.query(
                'UPDATE users SET status = $1 WHERE id = $2 RETURNING *', // Adjust this query as needed
                [isActive, userId]
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
