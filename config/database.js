const { Sequelize } = require('sequelize');

// Use the DB_URL environment variable for the connection string
const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: 'postgres',
  dialectModule: require('pg'),
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

sequelize.authenticate()
  .then(() => console.log('Database connection established successfully.'))
  .catch(err => console.error('Unable to connect to the database:', err));

