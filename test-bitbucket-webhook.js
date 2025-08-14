const axios = require('axios');

// Bitbucket webhook 페이로드 예제
const testPushWebhook = {
  push: {
    changes: [
      {
        new: {
          type: 'commit',
          target: {
            hash: 'abc123def456789',
            message: 'Test commit for webhook testing'
          }
        }
      }
    ]
  },
  repository: {
    name: 'test-repo',
    workspace: {
      slug: 'gmeremittance'
    }
  },
  actor: {
    display_name: 'Test User'
  }
};

async function sendTestWebhook() {
  try {
    console.log('🚀 Sending test webhook to local server...');
    
    const response = await axios.post(
      'http://localhost:3002/webhook/bitbucket',
      testPushWebhook,
      {
        headers: {
          'x-event-key': 'repo:push',
          'x-hook-uuid': 'test-uuid-12345',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Response:', response.data);
    
    // 로그 확인
    console.log('\n📊 Checking logs...');
    const logs = await axios.get('http://localhost:3002/logs/webhooks?limit=5');
    console.log('Recent webhook logs:', logs.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

sendTestWebhook();