const express = require('express');
const router = express.Router();
const codeReviewer = require('../utils/codeReviewer');
const bitbucketClient = require('../utils/bitbucketClient');
const logger = require('../utils/logger');
const { validateWebhookSignature, parseWebhookPayload } = require('../middlewares/webhookValidator');

router.post('/bitbucket', 
  validateWebhookSignature,
  parseWebhookPayload,
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { eventType, payload } = req.webhookData;
      
      logger.webhook(eventType, payload);
      logger.debug('Full webhook payload', payload);

      switch (eventType) {
        case 'pullrequest:created':
        case 'pullrequest:updated':
          await handlePullRequest(payload);
          break;
        
        case 'repo:push':
          await handlePush(payload);
          break;
        
        default:
          logger.warning(`Unhandled event type: ${eventType}`);
      }

      const responseTime = Date.now() - startTime;
      logger.success(`Webhook processed successfully in ${responseTime}ms`, { eventType });
      
      res.status(200).json({ 
        message: 'Webhook processed successfully',
        eventType,
        processingTime: `${responseTime}ms`
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Error processing webhook', {
        error: error.message,
        stack: error.stack,
        eventType: req.webhookData?.eventType,
        responseTime
      });
      
      res.status(500).json({ error: 'Failed to process webhook' });
    }
});

async function handlePullRequest(payload) {
  const startTime = Date.now();
  
  try {
    const { pullrequest, repository } = payload;
    const repoSlug = repository.name;
    const prId = pullrequest.id;
    const prTitle = pullrequest.title;
    const prDescription = pullrequest.description || '';

    logger.info(`Processing PR #${prId}: ${prTitle}`, {
      repository: repoSlug,
      prId,
      author: pullrequest.author?.display_name
    });

    const diffText = await bitbucketClient.getPullRequestDiff(repoSlug, prId);
    const files = bitbucketClient.parseDiff(diffText);

    if (files.length === 0) {
      logger.warning('No files changed in PR', { prId, repoSlug });
      return;
    }
    
    logger.debug(`Found ${files.length} files changed in PR #${prId}`);

    const reviewResult = await codeReviewer.reviewPullRequest({
      title: prTitle,
      description: prDescription,
      files: files
    });

    let comment = `## 🤖 Automated Code Review\n\n`;
    comment += `### Overall Assessment\n${reviewResult.summary}\n\n`;
    
    if (reviewResult.fileReviews && reviewResult.fileReviews.length > 0) {
      comment += `### File Reviews\n\n`;
      for (const fileReview of reviewResult.fileReviews) {
        comment += `<details>\n<summary>📄 ${fileReview.file}</summary>\n\n`;
        comment += `${fileReview.review}\n\n`;
        comment += `</details>\n\n`;
      }
    }

    comment += `---\n*This review was generated automatically by AI.*`;

    await bitbucketClient.postPullRequestComment(repoSlug, prId, comment);
    
    const processingTime = Date.now() - startTime;
    logger.success(`Successfully posted review for PR #${prId}`, {
      prId,
      repository: repoSlug,
      filesReviewed: files.length,
      processingTime: `${processingTime}ms`
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error handling pull request', {
      error: error.message,
      prId: payload?.pullrequest?.id,
      repository: payload?.repository?.name,
      processingTime: `${processingTime}ms`
    });
    throw error;
  }
}

async function handlePush(payload) {
  const startTime = Date.now();
  
  try {
    const { push, repository } = payload;
    const repoSlug = repository.name;
    
    logger.info(`Processing push event for repository: ${repoSlug}`, {
      repository: repoSlug,
      changes: push.changes?.length || 0
    });
    
    for (const change of push.changes) {
      if (change.new && change.new.type === 'commit') {
        const commitHash = change.new.target.hash;
        const commitMessage = change.new.target.message;
        
        logger.info(`Processing commit: ${commitHash.substring(0, 7)}`, {
          repository: repoSlug,
          commit: commitHash.substring(0, 7),
          message: commitMessage
        });

        const diffText = await bitbucketClient.getCommitDiff(repoSlug, commitHash);
        const files = bitbucketClient.parseDiff(diffText);

        if (files.length === 0) {
          logger.warning('No files changed in commit', { 
            commit: commitHash.substring(0, 7),
            repository: repoSlug 
          });
          continue;
        }
        
        logger.debug(`Found ${files.length} files changed in commit ${commitHash.substring(0, 7)}`);

        let comment = `## 🤖 Automated Code Review for Commit\n\n`;
        comment += `**Commit:** ${commitHash.substring(0, 7)}\n`;
        comment += `**Message:** ${commitMessage}\n\n`;

        for (const file of files) {
          const review = await codeReviewer.reviewCode(
            file.diff,
            file.path,
            commitMessage
          );
          
          comment += `### 📄 ${file.path}\n\n`;
          comment += `${review}\n\n`;
        }

        comment += `---\n*This review was generated automatically by AI.*`;

        await bitbucketClient.postCommitComment(repoSlug, commitHash, comment);
        
        logger.success(`Successfully posted review for commit ${commitHash.substring(0, 7)}`, {
          commit: commitHash.substring(0, 7),
          repository: repoSlug,
          filesReviewed: files.length
        });
      }
    }
    
    const processingTime = Date.now() - startTime;
    logger.success(`Push event processed successfully`, {
      repository: repoSlug,
      processingTime: `${processingTime}ms`
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error handling push', {
      error: error.message,
      repository: payload?.repository?.name,
      processingTime: `${processingTime}ms`
    });
    throw error;
  }
}

module.exports = router;