const app = require('./src/app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Code Review Bot is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  const configs = {
    'OpenAI API': !!process.env.OPENAI_API_KEY,
    'Bitbucket Workspace': !!process.env.BITBUCKET_WORKSPACE,
    'Bitbucket Auth': !!process.env.BITBUCKET_USERNAME && !!process.env.BITBUCKET_APP_PASSWORD,
    'Webhook Secret': !!process.env.WEBHOOK_SECRET
  };
  
  logger.info('Configuration Status', configs);
  
  console.log('\n📋 Configuration Status:');
  Object.entries(configs).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}`);
  });
  
  if (Object.values(configs).some(v => !v)) {
    logger.warning('Some configurations are missing. Check your .env file.');
    console.log('\n⚠️  Warning: Some configurations are missing. Check your .env file.');
  }
  
  console.log('\n📊 Log endpoints available:');
  console.log('  GET /logs - View recent logs');
  console.log('  GET /logs/webhooks - View webhook logs');
  console.log('  GET /logs/errors - View error logs');
  console.log('  GET /logs/stats - View log statistics');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Keep the process running
process.stdin.resume();

module.exports = server;