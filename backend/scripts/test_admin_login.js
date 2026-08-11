'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const authService = require('../services/authService');

async function testLogin() {
  try {
    console.log('Testing admin login authentication...');
    const res = await authService.login({ email: 'admin@sitemind.com', password: 'admin@123' });
    console.log('✓ Login verification SUCCESS!');
    console.log('User ID:', res.user.id);
    console.log('Email:', res.user.email);
    console.log('Role:', res.user.role);
    console.log('Token length:', res.token?.length);
  } catch (e) {
    console.error('❌ Login failed:', e.message);
  }
}

testLogin();
