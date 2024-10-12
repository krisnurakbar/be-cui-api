const { Pool } = require('pg');  // Import the Pool class from pg

// Create a new pool for managing connections to the PostgreSQL database using the DB_URL
const pool = new Pool({
  connectionString: process.env.DB_URL, // Use DB_URL directly
  ssl: {
    require: true,     // This is for local development only, use SSL in production
    rejectUnauthorized: false, // Allow self-signed certificates; adjust as necessary
  },
});

// Export the pool instance
module.exports = pool;
