const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  },
  logging: false
});

async function checkRole() {
  try {
    const [cols] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role';
    `);
    console.log('Role column check:', cols);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

checkRole();
