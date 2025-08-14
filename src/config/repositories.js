// Repository-specific configurations
const repositoryConfigs = {
  // Default configuration for all repositories
  default: {
    enableReview: true,
    reviewModel: 'gpt-4-turbo-preview',
    maxTokens: 1500,
    temperature: 0.3,
    reviewTypes: ['bug', 'security', 'performance', 'quality'],
    autoApprove: false
  },

  // Repository-specific overrides
  repositories: {
    // Example: Different settings for specific repos
    'frontend-app': {
      enableReview: true,
      reviewTypes: ['bug', 'accessibility', 'performance', 'quality'],
      focusAreas: ['React hooks', 'TypeScript', 'CSS performance'],
      skipPaths: ['node_modules/', 'build/', 'dist/']
    },
    
    'backend-api': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'performance', 'database'],
      focusAreas: ['SQL injection', 'Authentication', 'API design'],
      skipPaths: ['tests/', 'migrations/']
    },
    
    'mobile-app': {
      enableReview: true,
      reviewTypes: ['bug', 'performance', 'memory', 'ui'],
      focusAreas: ['Memory leaks', 'Battery usage', 'Network optimization'],
      skipPaths: ['assets/', 'ios/Pods/']
    },
    
    'documentation': {
      enableReview: false, // Skip review for documentation repos
    },
    
    'config-repo': {
      enableReview: true,
      reviewTypes: ['security', 'configuration'],
      focusAreas: ['Credentials', 'Environment variables', 'Security settings'],
      requireApproval: true
    }
  },

  // Get configuration for a specific repository
  getConfig(repoName) {
    const specific = this.repositories[repoName] || {};
    return {
      ...this.default,
      ...specific
    };
  },

  // Check if review is enabled for repository
  isReviewEnabled(repoName) {
    const config = this.getConfig(repoName);
    return config.enableReview;
  },

  // Get review prompt customization
  getReviewPrompt(repoName) {
    const config = this.getConfig(repoName);
    let prompt = 'Please review this code focusing on:\n';
    
    if (config.reviewTypes) {
      prompt += `- ${config.reviewTypes.join('\n- ')}\n`;
    }
    
    if (config.focusAreas) {
      prompt += `\nPay special attention to:\n- ${config.focusAreas.join('\n- ')}\n`;
    }
    
    return prompt;
  },

  // Check if path should be skipped
  shouldSkipPath(repoName, filePath) {
    const config = this.getConfig(repoName);
    if (!config.skipPaths) return false;
    
    return config.skipPaths.some(pattern => filePath.includes(pattern));
  }
};

module.exports = repositoryConfigs;