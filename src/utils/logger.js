const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    // Skip directory creation in serverless environment
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return;
    }
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatLogEntry(level, message, data = null) {
    const entry = {
      timestamp: this.getTimestamp(),
      level,
      message,
      ...(data && { data })
    };
    return JSON.stringify(entry, null, 2);
  }

  writeToFile(filename, content) {
    // Skip file writing in serverless environment
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return;
    }
    const filePath = path.join(this.logDir, filename);
    fs.appendFileSync(filePath, content + '\n', 'utf8');
  }

  log(level, message, data = null) {
    const logEntry = this.formatLogEntry(level, message, data);
    
    // Console output with color coding
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      DEBUG: '\x1b[35m'    // Magenta
    };
    const reset = '\x1b[0m';
    
    console.log(`${colors[level] || ''}[${this.getTimestamp()}] [${level}] ${message}${reset}`);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }

    // Write to daily log file
    const today = new Date().toISOString().split('T')[0];
    this.writeToFile(`${today}.log`, logEntry);
    
    // Also write to specific log files based on level
    if (level === 'ERROR') {
      this.writeToFile('errors.log', logEntry);
    }
    
    // Write webhook-specific logs
    if (message.toLowerCase().includes('webhook')) {
      this.writeToFile('webhooks.log', logEntry);
    }
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  success(message, data) {
    this.log('SUCCESS', message, data);
  }

  warning(message, data) {
    this.log('WARNING', message, data);
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  debug(message, data) {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      this.log('DEBUG', message, data);
    }
  }

  webhook(eventType, payload) {
    const webhookData = {
      eventType,
      repository: payload?.repository?.name,
      workspace: payload?.repository?.workspace?.slug,
      actor: payload?.actor?.display_name,
      ...(payload?.pullrequest && {
        pullRequest: {
          id: payload.pullrequest.id,
          title: payload.pullrequest.title,
          state: payload.pullrequest.state
        }
      }),
      ...(payload?.push && {
        push: {
          changes: payload.push.changes?.length || 0
        }
      })
    };
    
    this.log('INFO', `Webhook received: ${eventType}`, webhookData);
  }

  apiCall(service, endpoint, success, responseTime) {
    const apiData = {
      service,
      endpoint,
      success,
      responseTime: `${responseTime}ms`
    };
    
    const level = success ? 'SUCCESS' : 'ERROR';
    this.log(level, `API call to ${service}`, apiData);
  }

  getLogs(date = null, type = 'all') {
    // Return empty array in serverless environment
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return [];
    }
    
    try {
      let filename;
      
      if (type === 'errors') {
        filename = 'errors.log';
      } else if (type === 'webhooks') {
        filename = 'webhooks.log';
      } else {
        const targetDate = date || new Date().toISOString().split('T')[0];
        filename = `${targetDate}.log`;
      }
      
      const filePath = path.join(this.logDir, filename);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split('\n').filter(line => line.trim()).map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return line;
          }
        });
      }
      
      return [];
    } catch (error) {
      console.error('Error reading logs:', error);
      return [];
    }
  }

  clearLogs(olderThanDays = 30) {
    // Skip in serverless environment
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return;
    }
    
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.info(`Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      this.error('Error clearing old logs', error);
    }
  }
}

module.exports = new Logger();