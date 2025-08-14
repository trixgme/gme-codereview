# Changelog

## [1.0.0] - 2025-08-14

### 🚀 Features
- **Initial Release**: Automated code review bot for Bitbucket using OpenAI GPT-4
- **Webhook Integration**: Support for Bitbucket push and pull request events
- **OpenAI GPT-4**: Intelligent code review with detailed feedback
- **Auto Comments**: Automatic posting of review comments to Bitbucket
- **Comprehensive Logging**: Detailed logging system with multiple log levels
- **Error Handling**: Retry mechanism with exponential backoff
- **Security**: Webhook signature validation and environment variable management

### 🔧 Fixes
- **Vercel Deployment**: Fixed serverless deployment configuration
  - Added `api/index.js` as Vercel function entry point
  - Updated `vercel.json` for proper routing
  - Removed `process.stdin.resume()` for serverless compatibility
  
- **File System Compatibility**: Fixed read-only file system errors in Vercel
  - Disabled file operations when running in serverless environment
  - Added environment detection for VERCEL and AWS_LAMBDA

### 🧪 Testing
- Added `test-bitbucket-webhook.js` for local webhook testing
- Added `check-logs.sh` script for log monitoring
- Added comprehensive error tracking and debugging tools

### 📝 Documentation
- Complete README with setup instructions
- Environment variable configuration guide
- Bitbucket webhook setup instructions
- Vercel deployment guide

### 🛠️ Technical Details

#### Core Components
1. **Express Server** (`src/app.js`)
   - RESTful API endpoints
   - Webhook receiver
   - Health check endpoint
   - Log viewing endpoints

2. **Bitbucket Client** (`src/utils/bitbucketClient.js`)
   - Pull request diff fetching
   - Commit diff fetching
   - Comment posting
   - API error handling

3. **Code Reviewer** (`src/utils/codeReviewer.js`)
   - OpenAI GPT-4 integration
   - Diff analysis
   - Review generation
   - Token limit management

4. **Logger** (`src/utils/logger.js`)
   - Multi-level logging (INFO, SUCCESS, WARNING, ERROR, DEBUG)
   - File-based log storage (local only)
   - Console output with color coding
   - Serverless environment compatibility

5. **Error Handler** (`src/utils/errorHandler.js`)
   - Retry logic with exponential backoff
   - API error handling
   - Error logging and tracking

### 🔐 Security Features
- Webhook signature validation
- Environment variable management
- No hardcoded credentials
- Secure API authentication

### 📦 Dependencies
- `express`: Web framework
- `openai`: GPT-4 API client
- `axios`: HTTP client for Bitbucket API
- `dotenv`: Environment variable management
- `helmet`: Security headers
- `cors`: CORS handling

### 🌐 Deployment
- **Local Development**: Port 3002 (configurable)
- **Vercel**: Serverless deployment ready
- **Environment Variables Required**:
  - `OPENAI_API_KEY`
  - `BITBUCKET_WORKSPACE`
  - `BITBUCKET_USERNAME`
  - `BITBUCKET_APP_PASSWORD`
  - `WEBHOOK_SECRET`

### 📊 API Endpoints
- `GET /` - API information
- `GET /health` - Health check
- `POST /webhook/bitbucket` - Webhook receiver
- `GET /logs` - View logs (local only)
- `GET /logs/webhooks` - Webhook logs
- `GET /logs/errors` - Error logs
- `GET /logs/stats` - Statistics

### 🐛 Known Issues
- Logs are not available in Vercel environment (read-only file system)
- Webhook requires public URL (use Vercel deployment or ngrok for local testing)

### 🔄 Version History

#### v1.0.0 (2025-08-14)
- Initial release with full functionality

---

## Commit History

### Feature Commits
- `feat: Bitbucket code review bot implementation` - Core functionality
- `feat: Add comprehensive logging system` - Logging infrastructure
- `feat: Add error handling and retry logic` - Reliability improvements

### Fix Commits
- `fix: Vercel deployment configuration` - Serverless compatibility
- `fix: Disable file system operations in Vercel environment` - EROFS error fix
- `fix: Update dependencies for stability` - Package compatibility

### Test Commits
- `test: Add webhook testing utilities` - Testing tools

### Documentation Commits
- `docs: Add README and setup instructions` - User documentation
- `docs: Add environment variable examples` - Configuration guide

---

## Installation & Usage

### Quick Start
```bash
# Clone repository
git clone https://github.com/trixgme/gme-codereview.git
cd gme-codereview

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run locally
npm run dev

# Deploy to Vercel
vercel --prod
```

### Webhook Setup
1. Get public URL (Vercel deployment or ngrok)
2. Configure in Bitbucket: Repository settings → Webhooks
3. Set URL: `https://your-domain/webhook/bitbucket`
4. Enable triggers: Push, Pull Request Created/Updated

---

## Contributing
Please ensure all commits follow conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for tests
- `chore:` for maintenance

---

## License
ISC

---

## Support
For issues or questions, please open an issue on GitHub.