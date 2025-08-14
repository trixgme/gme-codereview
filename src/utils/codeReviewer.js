const openai = require('../config/openai');
const errorHandler = require('./errorHandler');
const logger = require('./logger');

class CodeReviewer {
  constructor() {
    this.systemPrompt = `You are an expert code reviewer. Analyze the provided code changes and provide:
1. A summary of the changes
2. Potential bugs or issues
3. Code quality suggestions
4. Security concerns if any
5. Performance improvements if applicable

**IMPORTANT**: When you identify bugs, security issues, or dangerous code:
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

  async reviewCode(diff, filePath, commitMessage) {
    try {
      // GPT-5 can handle up to 272,000 input tokens (~1,088,000 characters)
      // We'll use 200,000 characters to leave room for system prompt and response
      const MAX_DIFF_SIZE = 200000;  // ~50,000 tokens for diff alone
      let truncatedDiff = diff;
      let wasTruncated = false;
      
      if (diff.length > MAX_DIFF_SIZE) {
        truncatedDiff = diff.substring(0, MAX_DIFF_SIZE);
        wasTruncated = true;
        logger.warning(`Diff truncated for file ${filePath}`, {
          originalSize: diff.length,
          truncatedSize: MAX_DIFF_SIZE
        });
      }
      
      const userPrompt = `
File: ${filePath}
Commit Message: ${commitMessage}

Code Diff:
\`\`\`diff
${truncatedDiff}${wasTruncated ? '\n... (truncated for length)' : ''}
\`\`\`

Please review this code change.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        // GPT-5 supports up to 128,000 output tokens
        // We'll request maximum analysis depth
        max_completion_tokens: 32000  // Allow very detailed analysis per file
      });

      return response.choices[0].message.content;
    } catch (error) {
      errorHandler.logError(error, 'CodeReviewer.reviewCode');
      
      if (error.status === 429) {
        return await errorHandler.retryWithBackoff(
          () => this.reviewCode(diff, filePath, commitMessage),
          3,
          2000
        );
      }
      
      throw new Error(`Failed to review code: ${error.message}`);
    }
  }

  async reviewPullRequest(prData) {
    try {
      const { title, description, files } = prData;
      
      logger.info(`Starting PR review with ${files.length} files`);
      
      // Process files sequentially for maximum depth
      const fileReviews = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        logger.info(`Reviewing PR file ${i+1}/${files.length}: ${file.path}`);
        
        const review = await this.reviewCode(
          file.diff,
          file.path,
          title
        );
        
        fileReviews.push({
          file: file.path,
          review
        });
      }

      const summaryPrompt = `
Pull Request: ${title}
Description: ${description || 'No description provided'}

Individual file reviews have been completed. Please provide:
1. An overall assessment of the PR
2. Key points that need attention
3. Overall code quality rating (1-10)
4. Approval recommendation (Approve/Request Changes/Comment)

Number of files changed: ${files.length}`;

      const summaryResponse = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: `You are a senior code reviewer providing a comprehensive PR summary.
          
Provide an EXTREMELY DETAILED analysis including:
- Complete assessment of all changes
- Detailed security analysis
- Performance impact assessment
- Code quality metrics
- Specific recommendations with code examples
- Risk assessment for each component
- Testing recommendations
- Documentation requirements` },
          { role: 'user', content: summaryPrompt }
        ],
        max_completion_tokens: 16000  // Allow comprehensive PR summary
      });

      return {
        summary: summaryResponse.choices[0].message.content,
        fileReviews
      };
    } catch (error) {
      errorHandler.logError(error, 'CodeReviewer.reviewPullRequest');
      
      if (error.status === 429) {
        return await errorHandler.retryWithBackoff(
          () => this.reviewPullRequest(prData),
          3,
          2000
        );
      }
      
      throw new Error(`Failed to review PR: ${error.message}`);
    }
  }
}

module.exports = new CodeReviewer();