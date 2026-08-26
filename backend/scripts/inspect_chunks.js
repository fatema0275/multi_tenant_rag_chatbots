const { sequelize } = require('../models');

async function main() {
  const [cols] = await sequelize.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='document_chunks'"
  );
  console.log('document_chunks columns:', cols);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
