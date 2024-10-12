const { Sequelize } = require('sequelize');

// Use the DB_URL environment variable for the connection string
const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: 'postgres',
  dialectModule: require('pg'),
  dialectOptions: {
    ssl: {
      require: true, // This is necessary for SSL connections
      rejectUnauthorized: false, // This helps with self-signed certificates
    },
  },
});

module.exports = sequelize;
