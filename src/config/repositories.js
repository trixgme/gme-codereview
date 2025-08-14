// Repository-specific configurations
const repositoryConfigs = {
  // Default configuration for all repositories
  default: {
    enableReview: true,
    reviewModel: 'gpt-5',
    maxTokens: 1500,
    temperature: 0.3,
    reviewTypes: ['bug', 'security', 'performance', 'quality'],
    autoApprove: false
  },

  // Repository-specific overrides
  repositories: {
    // GME Remittance 프로젝트 저장소들
    'gme-frontend': {
      enableReview: true,
      reviewTypes: ['bug', 'accessibility', 'performance', 'quality', 'ui/ux'],
      focusAreas: ['React hooks', 'TypeScript', 'CSS performance', '반응형 디자인'],
      skipPaths: ['node_modules/', 'build/', 'dist/', '.next/', 'public/images/']
    },
    
    'gme-backend': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'performance', 'database', 'api'],
      focusAreas: ['SQL injection', 'Authentication', 'API design', '트랜잭션 처리', '에러 핸들링'],
      skipPaths: ['tests/', 'migrations/', 'seeds/']
    },
    
    'gme-admin': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'permissions', 'ui/ux'],
      focusAreas: ['권한 체크', '관리자 보안', '데이터 유출 방지'],
      skipPaths: ['node_modules/', 'build/', 'dist/']
    },
    
    'gme-mobile': {
      enableReview: true,
      reviewTypes: ['bug', 'performance', 'memory', 'ui/ux', 'battery'],
      focusAreas: ['메모리 누수', '배터리 사용량', '네트워크 최적화', 'React Native'],
      skipPaths: ['ios/Pods/', 'android/build/', 'node_modules/']
    },
    
    'gme-codereview': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'performance', 'code-quality'],
      focusAreas: ['Webhook 처리', 'API 통합', '에러 처리', '로깅'],
      skipPaths: ['logs/', 'test/', 'node_modules/']
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