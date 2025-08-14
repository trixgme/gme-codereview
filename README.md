# GME Code Review Bot

Automated code review system for Bitbucket using OpenAI GPT-4.

## Features

- **Automatic PR Reviews**: Code review on pull request creation/update
- **Commit Reviews**: Review individual commits on push
- **Detailed Feedback**: Bug detection, security issues, performance suggestions
- **Bitbucket Integration**: Automatic comment posting

## Setup

### 1. Environment Variables

Create a `.env` file with:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Bitbucket Configuration  
BITBUCKET_WORKSPACE=your_workspace
BITBUCKET_USERNAME=your_username
BITBUCKET_APP_PASSWORD=your_app_password

# Security
WEBHOOK_SECRET=your_secret

# Server
PORT=3000
NODE_ENV=production
```

**Important**: Never commit `.env` files to version control!

### 2. Bitbucket App Password

1. Go to Bitbucket account settings
2. Personal settings > App passwords  
3. Create app password with permissions:
   - Repositories: Read, Write
   - Pull requests: Read, Write

### 3. Deploy to Vercel

```bash
npm i -g vercel
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add BITBUCKET_WORKSPACE
vercel env add BITBUCKET_USERNAME
vercel env add BITBUCKET_APP_PASSWORD
vercel env add WEBHOOK_SECRET
```

### 4. Configure Bitbucket Webhook

1. Repository settings > Webhooks
2. Add webhook:
   - URL: `https://your-app.vercel.app/webhook/bitbucket`
   - Triggers: Repository Push, Pull Request Created/Updated

## Local Development

```bash
npm install
npm run dev
```

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `POST /webhook/bitbucket` - Webhook receiver

## Security

- Use environment variables for all credentials
- Enable webhook signature validation
- Never expose API keys in code
- Use HTTPS only for webhooks

## License

ISC