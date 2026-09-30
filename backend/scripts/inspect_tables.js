const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const s = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function main() {
  const [cols] = await s.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('query_logs', 'chatbot_configs', 'sync_logs', 'messages', 'chat_sessions') 
    ORDER BY table_name, ordinal_position;
  `);
  console.table(cols);

  // Sample row from query_logs
  const [samples] = await s.query(`SELECT * FROM query_logs LIMIT 1;`);
  console.log('Sample query_log:', samples[0]);

  // Sample row from chatbot_configs
  const [configs] = await s.query(`SELECT * FROM chatbot_configs LIMIT 1;`);
  console.log('Sample chatbot_config:', configs[0]);

  await s.close();
}

main().catch(console.error);
