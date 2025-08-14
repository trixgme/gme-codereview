// Repository-specific configurations
const repositoryConfigs = {
  // Default configuration for all repositories
  default: {
    enableReview: true,
    reviewModel: 'gpt-5',
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
    
    // iOS App
    'gmeios': {
      enableReview: true,
      reviewTypes: ['bug', 'memory', 'performance', 'ui/ux', 'battery'],
      focusAreas: ['메모리 관리', 'UI 반응성', 'Swift best practices', 'iOS 가이드라인'],
      skipPaths: ['Pods/', 'build/', 'DerivedData/', '.xcworkspace/', '*.xcuserstate', 
                  'Base.lproj/', '*.lproj/', 'Assets.xcassets/', '*.storyboard', '*.xib',
                  'Info.plist', 'Localizable.strings']
    },
    
    // Mobile Apps
    'mobile': {
      enableReview: true,
      reviewTypes: ['bug', 'performance', 'memory', 'ui/ux'],
      focusAreas: ['Cross-platform compatibility', 'Responsive design', 'Mobile optimization'],
      skipPaths: ['assets/', 'node_modules/', 'build/']
    },
    
    'gmeAndroid': {  // Bitbucket에서 사용하는 정확한 이름
      enableReview: true,
      reviewTypes: ['bug', 'memory', 'performance', 'ui/ux', 'battery'],
      focusAreas: ['메모리 누수', 'ANR 방지', 'Kotlin best practices', 'Material Design'],
      skipPaths: ['build/', 'gradle/', '.gradle/', '*.apk', 'app/build/', 
                  'res/values*/strings.xml', 'res/values*/colors.xml', 'res/values*/dimens.xml',
                  'res/values*/styles.xml', 'res/values*/arrays.xml', 'res/drawable*/',
                  'res/mipmap*/', 'res/raw/', '*.properties']
    },
    
    // Core Services
    'core': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'performance', 'architecture'],
      focusAreas: ['Core business logic', 'Data integrity', 'System stability', 'API contracts'],
      skipPaths: ['test/', 'docs/']
    },
    
    'database': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'performance', 'data-integrity'],
      focusAreas: ['SQL injection', 'Query optimization', 'Transaction management', 'Data consistency'],
      skipPaths: ['migrations/', 'seeds/', 'backups/']
    },
    
    'online-service': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'performance', 'api'],
      focusAreas: ['Service availability', 'API response time', 'Error handling', 'Rate limiting'],
      skipPaths: ['logs/', 'temp/']
    },
    
    // Banking Partners
    'alifbank_v2': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'compliance', 'api'],
      focusAreas: ['Banking regulations', 'Transaction security', 'API integration', 'Error handling'],
      skipPaths: ['test/', 'docs/']
    },
    
    'sacombank': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'compliance', 'api'],
      focusAreas: ['Banking security', 'Transaction integrity', 'API compatibility', 'Compliance'],
      skipPaths: ['test/', 'docs/']
    },
    
    'kbank-service': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'performance', 'api'],
      focusAreas: ['Service reliability', 'API security', 'Transaction processing', 'Error recovery'],
      skipPaths: ['logs/', 'temp/']
    },
    
    'bracbank': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'compliance', 'api'],
      focusAreas: ['Banking compliance', 'Security protocols', 'API standards', 'Data privacy'],
      skipPaths: ['test/', 'docs/']
    },
    
    'kbank': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'compliance', 'api'],
      focusAreas: ['Banking integration', 'Security measures', 'Transaction handling', 'API reliability'],
      skipPaths: ['test/', 'docs/']
    },
    
    // GME Services
    'partner_portal_upgrade': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'ui/ux', 'performance'],
      focusAreas: ['Partner authentication', 'Portal security', 'User experience', 'Performance'],
      skipPaths: ['node_modules/', 'dist/', 'build/']
    },
    
    'gmehom-finance': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'compliance', 'calculation'],
      focusAreas: ['Financial calculations', 'Compliance rules', 'Transaction accuracy', 'Audit trail'],
      skipPaths: ['reports/', 'temp/']
    },
    
    'payform_outbound': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'api', 'validation'],
      focusAreas: ['Payment validation', 'Outbound security', 'API contracts', 'Error handling'],
      skipPaths: ['logs/', 'temp/']
    },
    
    'gmehom-auth': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'authentication', 'authorization'],
      focusAreas: ['Authentication security', 'Token management', 'Session handling', 'Permission checks'],
      skipPaths: ['test/', 'docs/']
    },
    
    // Payment Services
    'sendmn-billpayment': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'api', 'payment'],
      focusAreas: ['Payment processing', 'Bill validation', 'API integration', 'Transaction integrity'],
      skipPaths: ['logs/', 'temp/']
    },
    
    'schedulepaymentsvc': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'scheduling', 'payment'],
      focusAreas: ['Payment scheduling', 'Transaction security', 'Schedule reliability', 'Error handling'],
      skipPaths: ['logs/', 'temp/']
    },
    
    'paysend_outbound': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'payment', 'api'],
      focusAreas: ['Payment security', 'Outbound validation', 'API reliability', 'Transaction tracking'],
      skipPaths: ['logs/', 'temp/']
    },
    
    // Integration Services
    'zalo-api': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'api', 'integration'],
      focusAreas: ['Zalo integration', 'API authentication', 'Message handling', 'Rate limiting'],
      skipPaths: ['test/', 'docs/']
    },
    
    'e4net-api': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'api', 'integration'],
      focusAreas: ['E4Net integration', 'API security', 'Data mapping', 'Error handling'],
      skipPaths: ['test/', 'docs/']
    },
    
    // Scheduler & Sync Services
    'inboundscheduler': {
      enableReview: true,
      reviewTypes: ['bug', 'performance', 'scheduling', 'reliability'],
      focusAreas: ['Scheduling accuracy', 'Job reliability', 'Queue management', 'Error recovery'],
      skipPaths: ['logs/', 'temp/']
    },
    
    'statussynchronize_v2': {
      enableReview: true,
      reviewTypes: ['bug', 'performance', 'synchronization', 'consistency'],
      focusAreas: ['Data synchronization', 'Status consistency', 'Conflict resolution', 'Performance'],
      skipPaths: ['logs/', 'cache/']
    },
    
    // Other Services
    'galaxia': {
      enableReview: true,
      reviewTypes: ['bug', 'security', 'performance', 'api'],
      focusAreas: ['Core functionality', 'API design', 'Performance optimization', 'Security'],
      skipPaths: ['test/', 'docs/']
    },
    
    'kt-promotion': {
      enableReview: true,
      reviewTypes: ['bug', 'business-logic', 'validation', 'performance'],
      focusAreas: ['Promotion logic', 'Validation rules', 'Campaign management', 'Performance'],
      skipPaths: ['reports/', 'temp/']
    },
    
    'gme-monitor': {
      enableReview: true,
      reviewTypes: ['bug', 'performance', 'monitoring', 'alerting'],
      focusAreas: ['Monitoring accuracy', 'Alert reliability', 'Performance metrics', 'Dashboard optimization'],
      skipPaths: ['logs/', 'data/', 'cache/']
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
    
    // Add repository-specific fix instructions
    prompt += `\n\n**CRITICAL REQUIREMENT**:\n`;
    
    if (repoName === 'gme-backend') {
      prompt += `For this backend repository, ALWAYS provide fixes for:\n`;
      prompt += `- SQL injection vulnerabilities\n`;
      prompt += `- Authentication/authorization issues\n`;
      prompt += `- Data validation problems\n`;
      prompt += `- API security flaws\n`;
    } else if (repoName === 'gme-frontend') {
      prompt += `For this frontend repository, ALWAYS provide fixes for:\n`;
      prompt += `- XSS vulnerabilities\n`;
      prompt += `- React hook violations\n`;
      prompt += `- Performance bottlenecks\n`;
      prompt += `- Accessibility issues\n`;
    } else if (repoName === 'gme-mobile') {
      prompt += `For this mobile app, ALWAYS provide fixes for:\n`;
      prompt += `- Memory leaks\n`;
      prompt += `- Battery drain issues\n`;
      prompt += `- Unsafe network calls\n`;
      prompt += `- Platform-specific bugs\n`;
    } else if (repoName === 'gme-admin') {
      prompt += `For this admin panel, ALWAYS provide fixes for:\n`;
      prompt += `- Permission bypasses\n`;
      prompt += `- Admin privilege escalation\n`;
      prompt += `- Sensitive data exposure\n`;
      prompt += `- Audit logging gaps\n`;
    } else {
      prompt += `ALWAYS provide corrected code when you find:\n`;
      prompt += `- Security vulnerabilities\n`;
      prompt += `- Critical bugs\n`;
      prompt += `- Performance issues\n`;
      prompt += `- Code that could cause runtime errors\n`;
    }
    
    prompt += `\nShow the fixed code with clear "Before" and "After" examples.`;
    
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