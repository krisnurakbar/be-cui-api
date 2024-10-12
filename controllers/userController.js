const User = require('../models/User'); // Assuming you have a User model

class UserController {
    // Get all users
    async listUsers(req, res) {
        try {
            const users = await User.findAll();
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
            const [updatedCount, updatedUsers] = await User.update(
                { status: isActive }, // Use `status` instead of `isActive`
                { where: { id: userId }, returning: true }
            );

            if (updatedCount === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({ message: 'User status updated', user: updatedUsers[0] });
        } catch (error) {
            res.status(500).json({ message: 'Error updating user status', error: error.message });
        }
    }
}

module.exports = new UserController();
