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
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[${context}] Error:`, error);
    } else {
      // In production, log minimal info
      console.error(`[${context}] ${error.message}`);
    }

    return errorInfo;
  }

  handleAPIError(error, service) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return {
        service,
        status: error.response.status,
        message: error.response.data?.message || error.message,
        details: error.response.data
      };
    } else if (error.request) {
      // The request was made but no response was received
      return {
        service,
        message: 'No response received from service',
        details: error.message
      };
    } else {
      // Something happened in setting up the request that triggered an Error
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