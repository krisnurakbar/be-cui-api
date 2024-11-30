const pool = require('../config/database'); // Import the pg connection pool

// List all companies
exports.listCompany = async (req, res) => {
    try {
        const { rows: companies } = await pool.query('SELECT * FROM companies');
        res.status(200).json(companies);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving companies', error });
    }
};

// Create a new company
exports.createCompany = async (req, res) => {
    const { name, status } = req.body;

    const query = `
        INSERT INTO companies (name, created_at, modified_at, status)
        VALUES ($1, NOW(), NOW(), $2)
        RETURNING *;
    `;

    try {
        const values = [name, status];
        const { rows: newCompany } = await pool.query(query, values);
        res.status(201).json({ message: 'Company created successfully', company: newCompany[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error creating company', error });
    }
};

// View a single company by ID
exports.viewCompany = async (req, res) => {
    const companyId = req.params.id;

    try {
        const { rows: company } = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        if (company.length === 0) {
            return res.status(404).json({ message: 'Company not found' });
        }
        res.status(200).json(company[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving company', error });
    }
};

// Update a company
exports.updateCompany = async (req, res) => {
    const companyId = req.params.id;
    const { name, created_at, modified_at, status } = req.body;

    const query = `
        UPDATE companies
        SET name = COALESCE($1, name), 
            created_at = COALESCE($2, created_at), 
            modified_at = COALESCE($3, modified_at),
            status = COALESCE($4, status)
        WHERE id = $5
        RETURNING *;
    `;

    try {
        const values = [name, created_at, modified_at, status, companyId];
        const { rowCount, rows: updatedCompany } = await pool.query(query, values);

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Company not found' });
        }
        res.status(200).json({ message: 'Company updated successfully', company: updatedCompany[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error updating company', error });
    }
};

// Toggle company status (activate/deactivate)
exports.toggleCompanyStatus = async (req, res) => {
    const companyId = req.params.id; 
    const isActive = req.params.isActive === 'true'; 

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'Invalid input: isActive must be a boolean' });
    }

    try {
        const { rowCount, rows: updatedCompanies } = await pool.query('UPDATE companies SET status = $1 WHERE id = $2 RETURNING *', [isActive ? 1 : 0, companyId]);

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Company not found' });
        }
        res.status(200).json({ message: 'Company status updated', company: updatedCompanies[0] });
    } catch (error) {
        console.error('Error updating company status:', error);
        res.status(500).json({ message: 'Error updating company status', error: error.message });
    }
};


