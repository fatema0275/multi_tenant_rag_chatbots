const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function main() {
  try {
    console.log('--- ALL TABLES IN PUBLIC SCHEMA ---');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(tables.map(t => t.table_name));

    console.log('\n--- ALL RLS POLICIES ---');
    const [policies] = await sequelize.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    console.table(policies);

    console.log('\n--- RLS ENABLED TABLES ---');
    const [rlsTables] = await sequelize.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE nspname = 'public' AND relkind = 'r'
      ORDER BY relname;
    `);
    console.table(rlsTables);

    console.log('\n--- ROW COUNTS FOR ALL TABLES ---');
    for (const t of tables) {
      const name = t.table_name;
      try {
        const [res] = await sequelize.query(`SELECT COUNT(*) as cnt FROM "${name}"`);
        console.log(`${name}: ${res[0].cnt}`);
      } catch (err) {
        console.log(`${name}: ERROR (${err.message})`);
      }
    }

    console.log('\n--- COLUMNS FOR KEY TABLES ---');
    const targetTables = ['users', 'websites', 'pages', 'document_chunks', 'crawl_jobs', 'crawl_logs', 'sites'];
    for (const t of targetTables) {
      const [cols] = await sequelize.query(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '${t}'
        ORDER BY ordinal_position;
      `);
      if (cols.length > 0) {
        console.log(`\nColumns for ${t}:`);
        console.table(cols);
      } else {
        console.log(`\nTable ${t} does not exist yet.`);
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

main();
