const app = require('./index');
const { User, Website, VerificationLog } = require('./models');

let server;

const runTests = async () => {
  const PORT = 5098;
  server = app.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}`);
    const baseUrl = `http://localhost:${PORT}/api`;

    try {
      const timestamp = Date.now();
      const testEmail = `testuser_trustlog_${timestamp}@sitemind.test`;
      const testPassword = 'Password123!';
      const testName = 'Trust Log Suite User';

      // 1. Signup
      console.log('\n--- 1. Testing Signup ---');
      const signupRes = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword, name: testName })
      });
      const signupData = await signupRes.json();
      console.log('Signup Status:', signupRes.status);
      console.log('User ID:', signupData.user.id);
      const token = signupData.token;

      // 2. Add Website (Trust-but-Log)
      console.log('\n--- 2. Testing POST /api/websites (Trust-but-Log) ---');
      const addRes = await fetch(`${baseUrl}/websites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ domain: 'https://trustlog-demo.com/about' })
      });
      const websiteData = await addRes.json();
      console.log('Add Website Status:', addRes.status);
      console.log('Domain Cleaned:', websiteData.domain);
      console.log('Verification Status (Immediate):', websiteData.verification_status);
      console.log('Verification Token Preserved:', !!websiteData.verification_token);

      if (websiteData.verification_status !== 'verified') {
        throw new Error('FAILED: verification_status should be "verified" immediately!');
      }

      const websiteId = websiteData.id;

      // 3. Verify VerificationLog table record created with method self_attested
      console.log('\n--- 3. Testing VerificationLog Audit Record ---');
      const logRecord = await VerificationLog.findOne({ where: { website_id: websiteId } });
      console.log('VerificationLog Found:', !!logRecord);
      console.log('Method:', logRecord?.method);
      console.log('Verified By User ID:', logRecord?.verified_by_user_id);

      if (logRecord?.method !== 'self_attested') {
        throw new Error('FAILED: verification_logs method should be "self_attested"!');
      }

      // 4. GET /api/websites
      console.log('\n--- 4. Testing GET /api/websites ---');
      const getRes = await fetch(`${baseUrl}/websites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const websitesList = await getRes.json();
      console.log('Websites count:', websitesList.length);
      console.log('Includes verificationLogs association:', !!websitesList[0].verificationLogs);

      // 5. Update Website
      console.log('\n--- 5. Testing PUT /api/websites/:id ---');
      const updateRes = await fetch(`${baseUrl}/websites/${websiteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ domain: 'updated-trustlog-demo.com' })
      });
      const updateData = await updateRes.json();
      console.log('Update Status:', updateRes.status);
      console.log('Updated Domain:', updateData.domain);

      // 6. Delete Website
      console.log('\n--- 6. Testing DELETE /api/websites/:id ---');
      const deleteRes = await fetch(`${baseUrl}/websites/${websiteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const deleteData = await deleteRes.json();
      console.log('Delete Status:', deleteRes.status);

      // Cleanup
      await VerificationLog.destroy({ where: { verified_by_user_id: signupData.user.id } });
      await Website.destroy({ where: { user_id: signupData.user.id } });
      await User.destroy({ where: { id: signupData.user.id } });
      console.log('\n--- Trust-but-Log Test Suite Completed Successfully ---');

    } catch (err) {
      console.error('Test Suite Failed:', err);
    } finally {
      server.close(() => {
        console.log('Test server closed.');
        process.exit(0);
      });
    }
  });
};

runTests();
