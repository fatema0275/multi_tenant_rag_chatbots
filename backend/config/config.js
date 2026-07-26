const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log("DATABASE_URL =", process.env.DATABASE_URL);
module.exports = {
    development: {
        use_env_variable: 'DATABASE_URL',
        dialect: 'postgres',
        dialectOptions: {
            ssl: { require: true, rejectUnauthorized: false }
        }
    },
    test: {
        use_env_variable: 'DATABASE_URL',
        dialect: 'postgres',
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
    },
    production: {
        use_env_variable: 'DATABASE_URL',
        dialect: 'postgres',
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
    }
};