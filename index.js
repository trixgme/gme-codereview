const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Code Review Bot is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  const configs = {
    'OpenAI API': !!process.env.OPENAI_API_KEY,
    'Bitbucket Workspace': !!process.env.BITBUCKET_WORKSPACE,
    'Bitbucket Auth': !!process.env.BITBUCKET_USERNAME && !!process.env.BITBUCKET_APP_PASSWORD,
    'Webhook Secret': !!process.env.WEBHOOK_SECRET
  };
  
  console.log('\n📋 Configuration Status:');
  Object.entries(configs).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}`);
  });
  
  if (Object.values(configs).some(v => !v)) {
    console.log('\n⚠️  Warning: Some configurations are missing. Check your .env file.');
  }
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

module.exports = server;