const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function check() {
  const [cols] = await s.query(`SELECT column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE table_name = 'messages'`);
  console.log('MESSAGES cols:', cols);
  const [fks] = await s.query(`SELECT tc.table_name, tc.constraint_name, tc.constraint_type FROM information_schema.table_constraints tc WHERE tc.table_name IN ('feedback', 'chat_sessions', 'messages', 'conversations')`);
  console.log('Constraints:', fks);
  const [queryLogsCols] = await s.query(`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'query_logs'`);
  console.log('QUERY_LOGS cols:', queryLogsCols);
  process.exit(0);
}
check();
