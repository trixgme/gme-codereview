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

      console.log(`[WEBHOOK] Processing event: ${eventType}`);
      console.log(`[WEBHOOK] Repository:`, payload?.repository?.name);
      console.log(`[WEBHOOK] Workspace:`, payload?.repository?.workspace?.slug);
      
      switch (eventType) {
        case 'pullrequest:created':
        case 'pullrequest:updated':
          console.log('[WEBHOOK] Handling pull request');
          await handlePullRequest(payload);
          break;
        
        case 'repo:push':
          console.log('[WEBHOOK] Handling push event');
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
      console.error('[WEBHOOK ERROR] Full error:', error);
      console.error('[WEBHOOK ERROR] Message:', error.message);
      console.error('[WEBHOOK ERROR] Stack:', error.stack);
      
      logger.error('Error processing webhook', {
        error: error.message,
        stack: error.stack,
        eventType: req.webhookData?.eventType,
        responseTime
      });
      
      // Return success to prevent Bitbucket from retrying
      res.status(200).json({ 
        message: 'Webhook received but processing failed',
        error: error.message 
      });
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
    console.log('[HANDLE_PUSH] Starting push handler');
    console.log('[HANDLE_PUSH] Payload keys:', Object.keys(payload));
    
    const { push, repository } = payload;
    const repoSlug = repository.name;
    
    console.log('[HANDLE_PUSH] Repository:', repoSlug);
    console.log('[HANDLE_PUSH] Changes count:', push?.changes?.length || 0);
    
    logger.info(`Processing push event for repository: ${repoSlug}`, {
      repository: repoSlug,
      changes: push.changes?.length || 0
    });
    
    // Check if push.changes exists
    if (!push || !push.changes || push.changes.length === 0) {
      console.log('[HANDLE_PUSH] No changes found in push event');
      console.log('[HANDLE_PUSH] Push object:', JSON.stringify(push, null, 2));
      return;
    }
    
    // Track processed commits to avoid duplicates
    const processedCommits = new Set();
    
    for (const change of push.changes) {
      console.log('[HANDLE_PUSH] Processing change:', JSON.stringify(change, null, 2));
      console.log('[HANDLE_PUSH] Change type:', change?.new?.type);
      
      // Handle both 'commit' and 'branch' types
      if (change.new && (change.new.type === 'commit' || change.new.type === 'branch')) {
        const commitHash = change.new.target.hash;
        const commitMessage = change.new.target.message;
        
        // Skip if we've already processed this commit
        if (processedCommits.has(commitHash)) {
          console.log('[HANDLE_PUSH] Skipping duplicate commit:', commitHash.substring(0, 7));
          continue;
        }
        processedCommits.add(commitHash);
        
        console.log('[HANDLE_PUSH] Processing commit:', commitHash.substring(0, 7));
        console.log('[HANDLE_PUSH] Commit message:', commitMessage);
        
        logger.info(`Processing commit: ${commitHash.substring(0, 7)}`, {
          repository: repoSlug,
          commit: commitHash.substring(0, 7),
          message: commitMessage
        });

        let diffText;
        try {
          diffText = await bitbucketClient.getCommitDiff(repoSlug, commitHash);
          console.log('[HANDLE_PUSH] Diff fetched, length:', diffText?.length || 0);
        } catch (diffError) {
          console.error('[HANDLE_PUSH] Error fetching diff:', diffError.message);
          console.error('[HANDLE_PUSH] Workspace:', process.env.BITBUCKET_WORKSPACE);
          console.error('[HANDLE_PUSH] Repository:', repoSlug);
          throw diffError;
        }
        const files = bitbucketClient.parseDiff(diffText);

        if (files.length === 0) {
          logger.warning('No files changed in commit', { 
            commit: commitHash.substring(0, 7),
            repository: repoSlug 
          });
          continue;
        }
        
        logger.debug(`Found ${files.length} files changed in commit ${commitHash.substring(0, 7)}`);
        
        // Count total files in diff before filtering
        const totalFilesInDiff = (diffText.match(/diff --git/g) || []).length;
        const skippedFiles = totalFilesInDiff - files.length;

        let comment = `## 🤖 Automated Code Review for Commit\n\n`;
        comment += `**Commit:** ${commitHash.substring(0, 7)}\n`;
        comment += `**Message:** ${commitMessage}\n`;
        comment += `**Files to Review:** ${files.length}`;
        
        if (skippedFiles > 0) {
          comment += ` (${skippedFiles} files skipped - translations/configs/generated)\n`;
        } else {
          comment += `\n`;
        }
        
        comment += `**Review Mode:** Full Analysis (GPT-5 Maximum Capacity)\n\n`;
        
        if (files.length === 0) {
          comment += `ℹ️ **No files to review** - All changed files are translations, configurations, or generated files that don't require code review.\n\n`;
          logger.info(`No files to review for commit ${commitHash.substring(0, 7)} - all files filtered`);
          continue;
        }
        
        // Process ALL files sequentially for thorough analysis
        let fileIndex = 0;
        for (const file of files) {
          fileIndex++;
          logger.info(`Reviewing file ${fileIndex}/${files.length}: ${file.path}`);
          
          const startTime = Date.now();
          const review = await codeReviewer.reviewCode(
            file.diff,
            file.path,
            commitMessage
          );
          
          const reviewTime = Date.now() - startTime;
          
          comment += `### 📄 [${fileIndex}/${files.length}] ${file.path}\n`;
          comment += `*Review time: ${(reviewTime/1000).toFixed(1)}s*\n\n`;
          comment += `${review}\n\n`;
          comment += `---\n\n`;
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