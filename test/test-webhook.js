const axios = require('axios');
require('dotenv').config();

// Test webhook payload for PR
const testPRWebhook = async () => {
  const payload = {
    pullrequest: {
      id: 1,
      title: "Test PR for Code Review",
      description: "This is a test pull request to verify the code review bot",
      source: {
        branch: { name: "feature/test-branch" }
      },
      destination: {
        branch: { name: "main" }
      }
    },
    repository: {
      name: "test-repo",
      full_name: "workspace/test-repo"
    }
  };

  try {
    const response = await axios.post(
      'http://localhost:3000/webhook/bitbucket',
      payload,
      {
        headers: {
          'x-event-key': 'pullrequest:created',
          'x-hook-uuid': 'test-webhook-uuid',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ PR Webhook test successful:', response.data);
  } catch (error) {
    console.error('❌ PR Webhook test failed:', error.response?.data || error.message);
  }
};

// Test webhook payload for commit
const testCommitWebhook = async () => {
  const payload = {
    push: {
      changes: [
        {
          new: {
            type: 'commit',
            target: {
              hash: 'abc123def456',
              message: 'Test commit for code review'
            }
          }
        }
      ]
    },
    repository: {
      name: "test-repo",
      full_name: "workspace/test-repo"
    }
  };

  try {
    const response = await axios.post(
      'http://localhost:3000/webhook/bitbucket',
      payload,
      {
        headers: {
          'x-event-key': 'repo:push',
          'x-hook-uuid': 'test-webhook-uuid',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Commit Webhook test successful:', response.data);
  } catch (error) {
    console.error('❌ Commit Webhook test failed:', error.response?.data || error.message);
  }
};

// Test health endpoint
const testHealthEndpoint = async () => {
  try {
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check successful:', response.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
};

// Run tests
const runTests = async () => {
  console.log('🧪 Starting webhook tests...\n');
  
  // Test health endpoint first
  await testHealthEndpoint();
  console.log('');
  
  // Test PR webhook
  console.log('Testing PR webhook...');
  await testPRWebhook();
  console.log('');
  
  // Test commit webhook
  console.log('Testing commit webhook...');
  await testCommitWebhook();
  
  console.log('\n✨ Tests completed!');
};

// Check if server is running
axios.get('http://localhost:3000/health')
  .then(() => {
    runTests();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start the server first with: npm run dev');
  });