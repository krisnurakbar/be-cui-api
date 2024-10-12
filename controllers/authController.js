const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
    const { email, password, status } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await User.create({
            email,
            password_hash: hashedPassword,
            status: status !== undefined ? status : true
        });
        res.status(201).send({ message: "User successfully registered" });
    } catch (error) {
        res.status(400).send({ message: "User registration failed", error });
    }
};

// User login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).send('Invalid credentials');
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        res.send({ token });
    } catch (error) {
        res.status(500).send({ message: 'Login failed', error });
    }
};
