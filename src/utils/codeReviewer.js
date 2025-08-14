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

Format your response in markdown with clear sections.
Be constructive and specific in your feedback.`;
  }

  async reviewCode(diff, filePath, commitMessage) {
    try {
      // Truncate large diffs to avoid token limits
      const MAX_DIFF_SIZE = 8000;
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
        temperature: 0.3
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
      
      const fileReviews = await Promise.all(
        files.map(async (file) => {
          const review = await this.reviewCode(
            file.diff,
            file.path,
            title
          );
          return {
            file: file.path,
            review
          };
        })
      );

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
          { role: 'system', content: 'You are a senior code reviewer providing a PR summary.' },
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.3
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