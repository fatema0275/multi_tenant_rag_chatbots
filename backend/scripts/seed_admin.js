'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

async function seedAdmin() {
  try {
    console.log('--- Starting Admin Seeding & Database Schema Sync ---');

    // 1. Ensure 'role' column exists on 'users' table
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(255) DEFAULT 'user';
    `);
    console.log('✓ Ensured "role" column exists in Supabase "users" table.');

    // 2. Set default 'user' for any null values
    await sequelize.query(`
      UPDATE users SET role = 'user' WHERE role IS NULL;
    `);

    // 3. Create or update admin account
    const adminEmail = 'admin@sitemind.com';
    const adminPassword = 'admin@123';

    let adminUser = await User.findOne({ where: { email: adminEmail } });

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    if (!adminUser) {
      adminUser = await User.create({
        email: adminEmail,
        password_hash: passwordHash,
        name: 'SiteMind Admin',
        role: 'admin'
      });
      console.log(`✓ Admin user created successfully: ${adminEmail} (role: admin)`);
    } else {
      adminUser.password_hash = passwordHash;
      adminUser.role = 'admin';
      if (!adminUser.name) adminUser.name = 'SiteMind Admin';
      await adminUser.save();
      console.log(`✓ Admin user existing account updated: ${adminEmail} (role: admin)`);
    }

    const [rows] = await sequelize.query(`
      SELECT id, email, name, role, created_at FROM users WHERE email = '${adminEmail}';
    `);
    console.log('--- Current Admin User Database Record ---');
    console.table(rows);

  } catch (err) {
    console.error('❌ Failed to seed admin user:', err);
  } finally {
    await sequelize.close();
  }
}

seedAdmin();
