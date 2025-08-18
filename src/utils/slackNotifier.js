const axios = require('axios');
const logger = require('./logger');

class SlackNotifier {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = !!this.webhookUrl;
    this.workspace = process.env.BITBUCKET_WORKSPACE;
    
    if (!this.enabled) {
      console.log('[SLACK] Slack notifications disabled (no webhook URL configured)');
    } else {
      console.log('[SLACK] Slack notifications enabled');
    }
  }

  /**
   * Send notification to Slack when code review is completed
   * @param {Object} params - Notification parameters
   * @param {string} params.repoSlug - Repository name
   * @param {string} params.type - 'commit' or 'pr'
   * @param {string} params.commitHash - Commit hash (for commits)
   * @param {string} params.prId - Pull request ID (for PRs)
   * @param {number} params.filesReviewed - Number of files reviewed
   * @param {string} params.reviewFocus - Review focus areas
   * @param {string} params.commentId - Bitbucket comment ID (optional)
   */
  async sendCodeReviewNotification(params) {
    if (!this.enabled) {
      logger.debug('Slack notification skipped (not configured)');
      return;
    }

    const {
      repoSlug,
      type,
      commitHash,
      prId,
      filesReviewed,
      reviewFocus,
      commentId
    } = params;

    try {
      // Generate Bitbucket URL
      let bitbucketUrl;
      let titleText;
      let identifierText;

      if (type === 'commit') {
        bitbucketUrl = `https://bitbucket.org/${this.workspace}/${repoSlug}/commits/${commitHash}`;
        if (commentId) {
          bitbucketUrl += `#comment-${commentId}`;
        }
        titleText = '🔍 Commit Review Completed';
        identifierText = commitHash.substring(0, 7);
      } else if (type === 'pr') {
        bitbucketUrl = `https://bitbucket.org/${this.workspace}/${repoSlug}/pull-requests/${prId}`;
        titleText = '🔀 Pull Request Review Completed';
        identifierText = `PR #${prId}`;
      } else {
        throw new Error(`Unknown review type: ${type}`);
      }

      // Create Slack message payload
      const payload = {
        text: `Code Review Completed for ${repoSlug}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: titleText,
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Repository: *${repoSlug}*`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*${type === 'commit' ? 'Commit' : 'Pull Request'}:*\n\`${identifierText}\``
              },
              {
                type: 'mrkdwn',
                text: `*Files Reviewed:*\n${filesReviewed}`
              }
            ]
          }
        ]
      };

      // Add review focus if provided
      if (reviewFocus) {
        payload.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Review Focus:* ${reviewFocus}`
          }
        });
      }

      // Add action button
      payload.blocks.push(
        {
          type: 'divider'
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📝 View in Bitbucket',
                emoji: true
              },
              url: bitbucketUrl,
              style: 'primary'
            }
          ]
        }
      );

      // Add timestamp
      payload.blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🤖 Automated review completed at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>`
          }
        ]
      });

      // Send to Slack
      const response = await axios.post(this.webhookUrl, payload);
      
      if (response.status === 200) {
        logger.success('Slack notification sent successfully', {
          repository: repoSlug,
          type: type,
          identifier: identifierText
        });
        console.log(`[SLACK] Notification sent for ${repoSlug} (${identifierText})`);
      }

      return response.data;

    } catch (error) {
      // Don't throw error to prevent disrupting the main flow
      logger.error('Failed to send Slack notification', {
        error: error.message,
        repository: repoSlug,
        type: type
      });
      console.error('[SLACK] Notification failed:', error.message);
      
      // Return null to indicate failure without breaking the main process
      return null;
    }
  }

  /**
   * Send error notification to Slack
   * @param {Object} params - Error notification parameters
   * @param {string} params.repoSlug - Repository name
   * @param {string} params.error - Error message
   * @param {string} params.context - Context where error occurred
   */
  async sendErrorNotification(params) {
    if (!this.enabled) {
      return;
    }

    const { repoSlug, error, context } = params;

    try {
      const payload = {
        text: `Error in code review process`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ Code Review Error',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Repository:*\n${repoSlug}`
              },
              {
                type: 'mrkdwn',
                text: `*Context:*\n${context}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error:*\n\`\`\`${error}\`\`\``
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Error occurred at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>`
              }
            ]
          }
        ]
      };

      await axios.post(this.webhookUrl, payload);
      console.log('[SLACK] Error notification sent');

    } catch (notificationError) {
      console.error('[SLACK] Failed to send error notification:', notificationError.message);
    }
  }

  /**
   * Test Slack connection
   */
  async testConnection() {
    if (!this.enabled) {
      return { success: false, message: 'Slack webhook URL not configured' };
    }

    try {
      const payload = {
        text: '✅ Slack integration test successful!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✅ *Slack Integration Test*\nYour code review bot is successfully connected to Slack!'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Test performed at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>`
              }
            ]
          }
        ]
      };

      const response = await axios.post(this.webhookUrl, payload);
      return { success: true, message: 'Slack connection test successful' };

    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new SlackNotifier();