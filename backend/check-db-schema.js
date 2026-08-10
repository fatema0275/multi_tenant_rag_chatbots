const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  },
  logging: false
});

async function verify() {
  try {
    console.log('=====================================================');
    console.log('VERIFICATION: document_chunks schema & RLS policies');
    console.log('=====================================================\n');

    // 1. Column details (\d document_chunks equivalent)
    const [cols] = await sequelize.query(`
      SELECT 
        c.column_name, 
        c.data_type, 
        c.udt_name,
        c.is_nullable, 
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_name = 'document_chunks'
      ORDER BY c.ordinal_position;
    `);

    console.log('--- \d document_chunks (Columns) ---');
    console.table(cols);

    // 2. RLS Status
    const [rls] = await sequelize.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname = 'document_chunks';
    `);
    console.log('\n--- Row Level Security Status ---');
    console.table(rls);

    // 3. Foreign Keys
    const [fks] = await sequelize.query(`
      SELECT
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'document_chunks';
    `);
    console.log('\n--- Foreign Keys ---');
    console.table(fks);

    // 4. Indexes (including HNSW)
    const [indexes] = await sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'document_chunks';
    `);
    console.log('\n--- Indexes ---');
    console.table(indexes);

    // 5. pg_policies query
    const [policies] = await sequelize.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'document_chunks';
    `);
    console.log('\n--- SELECT * FROM pg_policies WHERE tablename = \'document_chunks\'; ---');
    console.table(policies);

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    await sequelize.close();
  }
}

verify();
