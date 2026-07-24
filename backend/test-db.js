const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
});

sequelize.authenticate()
    .then(() => console.log('Connected to Database successfully'))
    .catch(err => console.error('Connection failed:', err));