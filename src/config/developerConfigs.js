// Developer-specific configurations for code review
const developerConfigs = {
  // Default configuration for all developers
  default: {
    reviewLanguage: 'en',
    enableReview: true,
    notifyOnReview: true
  },

  // Developer-specific configurations
  developers: {
    // Eugene - 한글 리뷰 (정확한 이름 매칭만)
    'Eugene': {
      reviewLanguage: 'ko',
      enableReview: true,
      notifyOnReview: true,
      preferences: {
        detailLevel: 'high',
        includeCodeExamples: true,
        focusAreas: ['버그', '보안', '성능', '코드 품질']
      }
    },
    
    // Fred - 한글 리뷰 (정확한 이름 매칭만)
    'fred': {
      reviewLanguage: 'ko',
      enableReview: true,
      notifyOnReview: true,
      preferences: {
        detailLevel: 'high',
        includeCodeExamples: true,
        focusAreas: ['버그', '보안', '성능', '코드 품질']
      }
    },
    
    // 한세희(Trix) - 한글 리뷰 (정확한 이름 매칭만)
    '한세희(Trix)': {
      reviewLanguage: 'ko',
      enableReview: true,
      notifyOnReview: true,
      preferences: {
        detailLevel: 'high',
        includeCodeExamples: true,
        focusAreas: ['버그', '보안', '성능', '코드 품질']
      }
    }
  },

  // Get configuration for a specific developer
  getConfig(authorName) {
    if (!authorName) return this.default;
    
    // Exact match only for Eugene and Fred
    const exactName = authorName.trim();
    
    // Check for exact match in developers
    if (this.developers[exactName]) {
      return { ...this.default, ...this.developers[exactName], matchedName: exactName };
    }
    
    // Return default if no exact match found
    return this.default;
  },

  // Check if review is enabled for developer
  isReviewEnabled(authorName) {
    const config = this.getConfig(authorName);
    return config.enableReview;
  },

  // Get review language for developer
  getReviewLanguage(authorName) {
    const config = this.getConfig(authorName);
    return config.reviewLanguage || 'en';
  },

  // Get unified review prompt with language instruction
  getReviewPrompt(language = 'en') {
    const languageInstruction = language === 'ko' 
      ? `**IMPORTANT**: You must write your ENTIRE response in Korean (한국어). All sections, explanations, and code comments should be in Korean.`
      : `**IMPORTANT**: Write your response in English.`;

    return `You are an expert code reviewer. ${languageInstruction}

Analyze the provided code changes and provide:
1. A summary of the changes
2. Potential bugs or issues
3. Code quality suggestions
4. Security concerns if any
5. Performance improvements if applicable

**CRITICAL**: When you identify bugs, security issues, or dangerous code:
- Provide the FIXED CODE with proper syntax
- Show a clear "Before" and "After" comparison
- Explain WHY the change is necessary
- Use code blocks with appropriate language syntax highlighting

Format your response in markdown with clear sections.

Example format for fixes:
### 🐛 Bug Found: [Issue Name]
**Problem**: [Explain the issue]
**Risk Level**: 🔴 Critical / 🟡 Medium / 🟢 Low

**Current Code:**
\`\`\`javascript
// Problematic code here
\`\`\`

**Fixed Code:**
\`\`\`javascript
// Corrected code here
\`\`\`

**Explanation**: [Why this fix is necessary]

Be constructive, specific, and always provide actionable solutions.`;
  }
};

module.exports = developerConfigs;