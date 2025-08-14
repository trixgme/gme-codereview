class ErrorHandler {
  constructor() {
    this.errors = [];
  }

  logError(error, context) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    };

    this.errors.push(errorInfo);
    
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[${context}] Error:`, error);
    } else {
      console.error(`[${context}] ${error.message}`);
    }

    return errorInfo;
  }

  handleAPIError(error, service) {
    if (error.response) {
      return {
        service,
        status: error.response.status,
        message: error.response.data?.message || error.message,
        details: error.response.data
      };
    } else if (error.request) {
      return {
        service,
        message: 'No response received from service',
        details: error.message
      };
    } else {
      return {
        service,
        message: error.message,
        details: null
      };
    }
  }

  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }

  clearErrors() {
    this.errors = [];
  }
}

module.exports = new ErrorHandler();