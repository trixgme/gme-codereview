const express = require('express');
const router = express.Router();
const codeReviewer = require('../utils/codeReviewer');
const bitbucketClient = require('../utils/bitbucketClient');
const developerConfigs = require('../config/developerConfigs');
const logger = require('../utils/logger');
const BatchProcessor = require('../utils/batchProcessor');
const processedCommitsCache = require('../utils/processedCommitsCache');
const slackNotifier = require('../utils/slackNotifier');
const { validateWebhookSignature, parseWebhookPayload } = require('../middlewares/webhookValidator');

router.post('/bitbucket', 
  validateWebhookSignature,
  parseWebhookPayload,
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { eventType, payload } = req.webhookData;
      const webhookUuid = req.headers['x-hook-uuid'];
      
      logger.webhook(eventType, payload);
      logger.debug('Full webhook payload', payload);

      const repoName = payload?.repository?.name;
      const workspace = payload?.repository?.workspace?.slug;
      
      console.log(`[WEBHOOK] Processing event: ${eventType}, UUID: ${webhookUuid}`);
      console.log(`[WEBHOOK] Repository: ${repoName}, Workspace: ${workspace}`);
      
      // gmeremittance 워크스페이스만 처리
      if (workspace !== 'gmeremittance') {
        console.log(`[WEBHOOK] Skipping non-gmeremittance workspace: ${workspace}`);
        return res.status(200).json({ 
          message: 'Only gmeremittance workspace is supported',
          workspace: workspace,
          repository: repoName
        });
      }
      
      switch (eventType) {
        case 'pullrequest:created':
        case 'pullrequest:updated':
          console.log('[WEBHOOK] Handling pull request');
          await handlePullRequest(payload);
          break;
        
        case 'repo:push':
          console.log('[WEBHOOK] Handling push event');
          await handlePush(payload, webhookUuid, eventType);
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
    const authorName = pullrequest.author?.display_name || pullrequest.author?.nickname || 'unknown';

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
    }, authorName);

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

    const commentResponse = await bitbucketClient.postPullRequestComment(repoSlug, prId, comment);
    
    const processingTime = Date.now() - startTime;
    logger.success(`Successfully posted review for PR #${prId}`, {
      prId,
      repository: repoSlug,
      filesReviewed: files.length,
      processingTime: `${processingTime}ms`
    });
    
    // Send Slack notification
    await slackNotifier.sendCodeReviewNotification({
      repoSlug,
      type: 'pr',
      prId,
      filesReviewed: files.length,
      reviewFocus: 'Code quality, bugs, security, and performance',
      commentId: commentResponse?.id
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

async function handlePush(payload, webhookUuid, eventType) {
  const startTime = Date.now();
  
  try {
    console.log('[HANDLE_PUSH] Starting push handler');
    console.log(`[HANDLE_PUSH] Webhook UUID: ${webhookUuid}, Event: ${eventType}`);
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
    
    console.log('[HANDLE_PUSH] Number of changes in push:', push.changes.length);
    
    // 중복 커밋 제거를 위한 Set 사용
    const processedInThisPush = new Set();
    
    for (const change of push.changes) {
      console.log('[HANDLE_PUSH] Processing change:', JSON.stringify(change, null, 2));
      console.log('[HANDLE_PUSH] Change new:', change?.new);
      console.log('[HANDLE_PUSH] Change old:', change?.old);
      console.log('[HANDLE_PUSH] Change type:', change?.new?.type);
      
      // Log the actual structure to understand what Bitbucket sends
      if (!change.new) {
        console.log('[HANDLE_PUSH] WARNING: change.new is undefined');
        console.log('[HANDLE_PUSH] Full change object:', JSON.stringify(change, null, 2));
      }
      
      // Handle both 'commit' and 'branch' types
      // Also check if commits field exists (some webhook formats)
      if (change.new && (change.new.type === 'commit' || change.new.type === 'branch')) {
        const commitHash = change.new.target.hash;
        const commitMessage = change.new.target.message;
        const authorName = change.new.target.author?.user?.display_name || 
                          change.new.target.author?.user?.nickname || 
                          change.new.target.author?.raw?.match(/(.*?)\s*</)?.[1] || 
                          'unknown';
        
        console.log('[HANDLE_PUSH] Processing commit:', commitHash.substring(0, 7), 'by', authorName);
        
        // 0. 웹훅 UUID 기반 중복 체크 (최우선)
        if (processedCommitsCache.isWebhookProcessed(webhookUuid, eventType, repoSlug, commitHash)) {
          console.log(`[HANDLE_PUSH] Skipping duplicate webhook: ${commitHash.substring(0, 7)}`);
          continue;
        }
        
        // 웹훅 처리 시작 표시
        processedCommitsCache.markWebhookProcessed(webhookUuid, eventType, repoSlug, commitHash);
        
        // 이번 푸시에서 이미 처리한 커밋인지 확인
        if (processedInThisPush.has(commitHash)) {
          console.log(`[HANDLE_PUSH] Skipping duplicate commit in same push: ${commitHash.substring(0, 7)}`);
          continue;
        }
        processedInThisPush.add(commitHash);
        
        // 1. 처리 시작 시도 (이미 처리 중이거나 완료된 경우 false 반환)
        if (!processedCommitsCache.startProcessing(repoSlug, commitHash)) {
          console.log('[HANDLE_PUSH] Skipping commit (already processing or cached):', commitHash.substring(0, 7));
          logger.info(`Skipping commit (duplicate request): ${commitHash.substring(0, 7)}`, {
            repository: repoSlug,
            commit: commitHash.substring(0, 7)
          });
          continue;
        }
        
        // 2. Bitbucket API로 기존 댓글 확인
        const hasExistingReview = await bitbucketClient.hasAutomatedReview(repoSlug, commitHash);
        if (hasExistingReview) {
          console.log('[HANDLE_PUSH] Skipping commit (review already exists):', commitHash.substring(0, 7));
          logger.info(`Skipping commit with existing review: ${commitHash.substring(0, 7)}`, {
            repository: repoSlug,
            commit: commitHash.substring(0, 7)
          });
          // 처리 완료로 표시
          processedCommitsCache.completeProcessing(repoSlug, commitHash);
          continue;
        }
        
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
        
        // Process files with timeout protection
        const reviewProcessor = async (file, index) => {
          logger.info(`Reviewing file ${index + 1}/${files.length}: ${file.path}`);
          
          const startTime = Date.now();
          const review = await codeReviewer.reviewCode(
            file.diff,
            file.path,
            commitMessage,
            authorName
          );
          
          const reviewTime = Date.now() - startTime;
          
          return {
            path: file.path,
            review: review,
            time: reviewTime,
            index: index + 1
          };
        };
        
        // Process with timeout protection (280 seconds to leave buffer)
        const { processed, unprocessed, totalTime } = await BatchProcessor.processWithTimeout(
          files,
          reviewProcessor,
          280000
        );
        
        // Add processed reviews to comment
        for (const result of processed) {
          if (result.error) {
            comment += `### 📄 ${result.file}\n`;
            comment += `⚠️ Review failed: ${result.error}\n\n`;
          } else {
            comment += `### 📄 [${result.index}/${files.length}] ${result.path}\n`;
            comment += `*Review time: ${(result.time/1000).toFixed(1)}s*\n\n`;
            comment += `${result.review}\n\n`;
            comment += `---\n\n`;
          }
        }
        
        // Add note about unprocessed files if any
        if (unprocessed.length > 0) {
          comment += `\n⚠️ **Timeout Notice**: ${unprocessed.length} files were not reviewed due to time constraints.\n`;
          comment += `Unreviewed files:\n`;
          for (const file of unprocessed) {
            comment += `- ${file.path}\n`;
          }
          comment += `\n`;
        }

        comment += `---\n*This review was generated automatically by AI.*`;

        try {
          const commentResponse = await bitbucketClient.postCommitComment(repoSlug, commitHash, comment);
          
          logger.success(`Successfully posted review for commit ${commitHash.substring(0, 7)}`, {
            commit: commitHash.substring(0, 7),
            repository: repoSlug,
            filesReviewed: files.length
          });
          
          // Send Slack notification
          await slackNotifier.sendCodeReviewNotification({
            repoSlug,
            type: 'commit',
            commitHash,
            filesReviewed: files.length,
            reviewFocus: 'Code quality, bugs, security, and performance',
            commentId: commentResponse?.id,
            authorName
          });
          
          // 처리 완료로 표시
          processedCommitsCache.completeProcessing(repoSlug, commitHash);
        } catch (commentError) {
          // 댓글 작성 실패 시 캐시에서 제거 (재시도 가능하도록)
          processedCommitsCache.remove(repoSlug, commitHash);
          logger.error('Failed to post comment, removed from cache', {
            commit: commitHash.substring(0, 7),
            repository: repoSlug,
            error: commentError.message
          });
          throw commentError;
        }
      } else if (change.commits && Array.isArray(change.commits)) {
        // Some push events have commits array instead of new.target
        console.log('[HANDLE_PUSH] Found commits array with', change.commits.length, 'commits');
        
        for (const commit of change.commits) {
          const commitHash = commit.hash;
          const commitMessage = commit.message;
          const authorName = commit.author?.user?.display_name || 
                            commit.author?.user?.nickname || 
                            commit.author?.raw?.match(/(.*?)\s*</)?.[1] || 
                            'unknown';
          
          console.log('[HANDLE_PUSH] Processing commit from array:', commitHash.substring(0, 7), 'by', authorName);
          
          // 0. 웹훅 UUID 기반 중복 체크 (최우선)
          if (processedCommitsCache.isWebhookProcessed(webhookUuid, eventType, repoSlug, commitHash)) {
            console.log(`[HANDLE_PUSH] Skipping duplicate webhook: ${commitHash.substring(0, 7)}`);
            continue;
          }
          
          // 웹훅 처리 시작 표시
          processedCommitsCache.markWebhookProcessed(webhookUuid, eventType, repoSlug, commitHash);
          
          // 이번 푸시에서 이미 처리한 커밋인지 확인
          if (processedInThisPush.has(commitHash)) {
            console.log(`[HANDLE_PUSH] Skipping duplicate commit in same push: ${commitHash.substring(0, 7)}`);
            continue;
          }
          processedInThisPush.add(commitHash);
          
          // 처리 시작 시도 (이미 처리 중이거나 완료된 경우 false 반환)
          if (!processedCommitsCache.startProcessing(repoSlug, commitHash)) {
            console.log('[HANDLE_PUSH] Skipping commit (already processing or cached):', commitHash.substring(0, 7));
            continue;
          }
          
          const hasExistingReview = await bitbucketClient.hasAutomatedReview(repoSlug, commitHash);
          if (hasExistingReview) {
            console.log('[HANDLE_PUSH] Skipping commit (review already exists):', commitHash.substring(0, 7));
            processedCommitsCache.completeProcessing(repoSlug, commitHash);
            continue;
          }
          
          // Process diff and review
          try {
            const diffText = await bitbucketClient.getCommitDiff(repoSlug, commitHash);
            const files = bitbucketClient.parseDiff(diffText);
            
            if (files.length === 0) {
              logger.warning('No files changed in commit', { 
                commit: commitHash.substring(0, 7),
                repository: repoSlug 
              });
              continue;
            }
            
            // Generate review comment (simplified version)
            let comment = `## 🤖 Automated Code Review for Commit\n\n`;
            comment += `**Commit:** ${commitHash.substring(0, 7)}\n`;
            comment += `**Message:** ${commitMessage}\n`;
            comment += `**Files to Review:** ${files.length}\n\n`;
            
            for (const file of files) {
              const review = await codeReviewer.reviewCode(
                file.diff,
                file.path,
                commitMessage,
                authorName
              );
              
              comment += `### 📄 ${file.path}\n`;
              comment += `${review}\n\n`;
              comment += `---\n\n`;
            }
            
            comment += `---\n*This review was generated automatically by AI.*`;
            
            const commentResponse = await bitbucketClient.postCommitComment(repoSlug, commitHash, comment);
            
            logger.success(`Successfully posted review for commit ${commitHash.substring(0, 7)}`, {
              commit: commitHash.substring(0, 7),
              repository: repoSlug,
              filesReviewed: files.length
            });
            
            // Send Slack notification
            await slackNotifier.sendCodeReviewNotification({
              repoSlug,
              type: 'commit',
              commitHash,
              filesReviewed: files.length,
              reviewFocus: 'Code quality, bugs, security, and performance',
              commentId: commentResponse?.id,
              authorName
            });
            
            // 처리 완료로 표시
            processedCommitsCache.completeProcessing(repoSlug, commitHash);
          } catch (error) {
            processedCommitsCache.remove(repoSlug, commitHash);
            logger.error('Failed to process commit from array', {
              commit: commitHash.substring(0, 7),
              repository: repoSlug,
              error: error.message
            });
          }
        }
      } else {
        console.log('[HANDLE_PUSH] Change does not have expected structure');
        console.log('[HANDLE_PUSH] Keys in change:', Object.keys(change));
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