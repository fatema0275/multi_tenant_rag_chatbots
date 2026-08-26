const { sequelize } = require('../models');

async function main() {
  const results = await sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log('Results sample:', results);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
