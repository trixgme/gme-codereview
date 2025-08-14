const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testLogEndpoints() {
  console.log('🧪 Testing log endpoints...\n');
  
  try {
    // Test log statistics
    console.log('📊 Getting log statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/logs/stats`);
    console.log('Log Statistics:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');
    
    // Test webhook logs
    console.log('🔔 Getting webhook logs...');
    const webhookResponse = await axios.get(`${BASE_URL}/logs/webhooks?limit=5`);
    console.log(`Found ${webhookResponse.data.count} webhook logs`);
    if (webhookResponse.data.logs.length > 0) {
      console.log('Recent webhook events:');
      webhookResponse.data.logs.forEach(log => {
        console.log(`  - ${log.timestamp}: ${log.message}`);
      });
    }
    console.log('');
    
    // Test error logs
    console.log('❌ Getting error logs...');
    const errorResponse = await axios.get(`${BASE_URL}/logs/errors?limit=5`);
    console.log(`Found ${errorResponse.data.count} error logs`);
    if (errorResponse.data.logs.length > 0) {
      console.log('Recent errors:');
      errorResponse.data.logs.forEach(log => {
        console.log(`  - ${log.timestamp}: ${log.message}`);
      });
    }
    console.log('');
    
    // Test general logs
    console.log('📝 Getting recent logs...');
    const logsResponse = await axios.get(`${BASE_URL}/logs?limit=10`);
    console.log(`Found ${logsResponse.data.count} logs for today`);
    console.log('');
    
    console.log('✅ All log endpoints working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing log endpoints:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Check if server is running
axios.get(`${BASE_URL}/health`)
  .then(() => {
    console.log('Server is running, starting tests...\n');
    testLogEndpoints();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start the server first with: npm run dev');
  });