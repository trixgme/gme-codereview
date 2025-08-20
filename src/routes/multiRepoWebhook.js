const express = require('express');
const router = express.Router();
const codeReviewer = require('../utils/codeReviewer');
const bitbucketClient = require('../utils/bitbucketClient');
const repositoryConfigs = require('../config/repositories');
const developerConfigs = require('../config/developerConfigs');
const logger = require('../utils/logger');
const processedCommitsCache = require('../utils/processedCommitsCache');
const slackNotifier = require('../utils/slackNotifier');

// Optional workspace parameter handled differently
router.post(['/bitbucket', '/bitbucket/:workspace'], async (req, res) => {
  const startTime = Date.now();
  
  try {
    const eventType = req.headers['x-event-key'];
    const payload = req.body;
    const workspace = req.params.workspace || payload?.repository?.workspace?.slug;
    const repoName = payload?.repository?.name;
    
    console.log(`[WEBHOOK] Event: ${eventType}, Workspace: ${workspace}, Repo: ${repoName}`);
    
    // Check if review is enabled for this repository
    if (!repositoryConfigs.isReviewEnabled(repoName)) {
      console.log(`[WEBHOOK] Review disabled for repository: ${repoName}`);
      return res.status(200).json({ 
        message: 'Review disabled for this repository',
        repository: repoName
      });
    }
    
    // Get repository-specific configuration
    const repoConfig = repositoryConfigs.getConfig(repoName);
    console.log(`[WEBHOOK] Using config for ${repoName}:`, repoConfig);
    
    // Process based on event type
    switch (eventType) {
      case 'pullrequest:created':
      case 'pullrequest:updated':
        await handlePullRequestWithConfig(payload, repoConfig);
        break;
        
      case 'repo:push':
        await handlePushWithConfig(payload, repoConfig);
        break;
        
      default:
        console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
    }
    
    const responseTime = Date.now() - startTime;
    res.status(200).json({ 
      message: 'Webhook processed successfully',
      repository: repoName,
      workspace: workspace,
      processingTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    res.status(200).json({ 
      message: 'Webhook received but processing failed',
      error: error.message 
    });
  }
});

async function handlePullRequestWithConfig(payload, config) {
  const { pullrequest, repository } = payload;
  const repoSlug = repository.name;
  const prId = pullrequest.id;
  const authorName = pullrequest.author?.display_name || pullrequest.author?.nickname || 'unknown';
  
  console.log(`[PR] Processing PR #${prId} for ${repoSlug} by ${authorName} with config:`, config);
  
  try {
    // Get PR diff
    const diffText = await bitbucketClient.getPullRequestDiff(repoSlug, prId);
    const files = bitbucketClient.parseDiff(diffText);
    
    // Filter files based on configuration
    const filesToReview = files.filter(file => 
      !repositoryConfigs.shouldSkipPath(repoSlug, file.path)
    );
    
    if (filesToReview.length === 0) {
      console.log('[PR] No files to review after filtering');
      return;
    }
    
    // Generate custom review prompt
    const customPrompt = repositoryConfigs.getReviewPrompt(repoSlug);
    
    // Get developer configuration
    const devConfig = developerConfigs.getConfig(authorName);
    const reviewLanguage = devConfig.reviewLanguage || 'en';
    
    console.log(`[PR] Using ${reviewLanguage} review for author: ${authorName}`);
    
    // Review with custom configuration
    const reviewResult = await codeReviewer.reviewPullRequest({
      title: pullrequest.title,
      description: pullrequest.description,
      files: filesToReview,
      customPrompt: customPrompt,
      config: config
    }, authorName);
    
    // Format and post comment
    let comment = reviewLanguage === 'ko' 
      ? `## 🤖 자동 코드 리뷰\n\n`
      : `## 🤖 Automated Code Review\n\n`;
    
    comment += reviewLanguage === 'ko'
      ? `**저장소**: ${repoSlug}\n`
      : `**Repository**: ${repoSlug}\n`;
    
    comment += reviewLanguage === 'ko'
      ? `**리뷰어**: ${authorName}\n`
      : `**Author**: ${authorName}\n`;
    
    comment += reviewLanguage === 'ko'
      ? `**설정**: ${config.reviewTypes.join(', ')}\n\n`
      : `**Configuration**: ${config.reviewTypes.join(', ')}\n\n`;
    
    comment += reviewResult.summary;
    
    const commentResponse = await bitbucketClient.postPullRequestComment(repoSlug, prId, comment);
    console.log(`[PR] Review posted for PR #${prId}`);
    
    // Send Slack notification
    await slackNotifier.sendCodeReviewNotification({
      repoSlug: repoSlug,
      type: 'pr',
      prId: prId,
      filesReviewed: filesToReview.length,
      reviewFocus: config.reviewTypes.join(', '),
      commentId: commentResponse?.id
    });
    
  } catch (error) {
    console.error('[PR] Error:', error);
    throw error;
  }
}

async function handlePushWithConfig(payload, config) {
  const { push, repository } = payload;
  const repoSlug = repository.name;
  
  console.log(`[PUSH] Processing push for ${repoSlug} with config:`, config);
  
  if (!push?.changes || push.changes.length === 0) {
    console.log('[PUSH] No changes found');
    return;
  }
  
  for (const change of push.changes) {
    if (change.new && (change.new.type === 'commit' || change.new.type === 'branch')) {
      const commitHash = change.new.target.hash;
      const authorName = change.new.target.author?.user?.display_name || 
                        change.new.target.author?.raw?.match(/(.*?)\s*</)?.[1] || 
                        'unknown';
      
      console.log(`[PUSH] Commit by ${authorName}`);
      
      // 1. 전역 캐시 확인
      if (processedCommitsCache.has(repoSlug, commitHash)) {
        console.log('[PUSH] Skipping commit (already in cache):', commitHash.substring(0, 7));
        logger.info(`Skipping cached commit: ${commitHash.substring(0, 7)}`, {
          repository: repoSlug,
          commit: commitHash.substring(0, 7)
        });
        continue;
      }
      
      // 2. Bitbucket API로 기존 댓글 확인
      const hasExistingReview = await bitbucketClient.hasAutomatedReview(repoSlug, commitHash);
      if (hasExistingReview) {
        console.log('[PUSH] Skipping commit (review already exists):', commitHash.substring(0, 7));
        logger.info(`Skipping commit with existing review: ${commitHash.substring(0, 7)}`, {
          repository: repoSlug,
          commit: commitHash.substring(0, 7)
        });
        // 캐시에 추가하여 다음 요청 시 빠르게 스킵
        processedCommitsCache.add(repoSlug, commitHash);
        continue;
      }
      
      // 3. 캐시에 즉시 추가 (동시 요청 방지)
      processedCommitsCache.add(repoSlug, commitHash);
      
      try {
        // Get commit diff
        const diffText = await bitbucketClient.getCommitDiff(repoSlug, commitHash);
        const files = bitbucketClient.parseDiff(diffText);
        
        // Filter files based on configuration
        const filesToReview = files.filter(file => 
          !repositoryConfigs.shouldSkipPath(repoSlug, file.path)
        );
        
        // 디버깅: 필터링 전후 파일 수 로그
        console.log(`[PUSH] Files before filtering: ${files.length}`);
        console.log(`[PUSH] Files after filtering: ${filesToReview.length}`);
        
        if (files.length > 0) {
          console.log('[PUSH] Sample files filtered out:', 
            files.filter(f => !filesToReview.includes(f))
                 .slice(0, 5)
                 .map(f => f.path));
        }
        
        if (filesToReview.length === 0) {
          console.log('[PUSH] No files to review after filtering');
          logger.warning('All files filtered out', {
            repository: repoSlug,
            commit: commitHash.substring(0, 7),
            totalFiles: files.length,
            filteredFiles: 0
          });
          continue;
        }
        
        // Get developer configuration
        const devConfig = developerConfigs.getConfig(authorName);
        const reviewLanguage = devConfig.reviewLanguage || 'en';
        
        console.log(`[PUSH] Using ${reviewLanguage} review for author: ${authorName}`);
        
        // Generate custom review prompt
        const customPrompt = repositoryConfigs.getReviewPrompt(repoSlug);
        
        // Review each file with custom configuration
        let comment = reviewLanguage === 'ko'
          ? `## 🤖 자동 코드 리뷰\n\n`
          : `## 🤖 Automated Code Review\n\n`;
        
        comment += reviewLanguage === 'ko'
          ? `**저장소**: ${repoSlug}\n`
          : `**Repository**: ${repoSlug}\n`;
        
        comment += reviewLanguage === 'ko'
          ? `**커밋**: ${commitHash.substring(0, 7)}\n`
          : `**Commit**: ${commitHash.substring(0, 7)}\n`;
        
        comment += reviewLanguage === 'ko'
          ? `**작성자**: ${authorName}\n`
          : `**Author**: ${authorName}\n`;
        
        comment += reviewLanguage === 'ko'
          ? `**리뷰 초점**: ${config.reviewTypes.join(', ')}\n`
          : `**Review Focus**: ${config.reviewTypes.join(', ')}\n`;
        
        comment += reviewLanguage === 'ko'
          ? `**검토된 파일 수**: ${filesToReview.length}\n\n`
          : `**Files Reviewed**: ${filesToReview.length}\n\n`;
        
        console.log(`[PUSH] Starting review for ${filesToReview.length} files`);
        
        for (let i = 0; i < filesToReview.length; i++) {
          const file = filesToReview[i];
          console.log(`[PUSH] Reviewing file ${i+1}/${filesToReview.length}: ${file.path}`);
          
          try {
            const review = await codeReviewer.reviewCode(
              file.diff,
              file.path,
              change.new.target.message,
              authorName
            );
            comment += `### 📄 ${file.path}\n${review}\n\n`;
          } catch (reviewError) {
            console.error(`[PUSH] Failed to review file ${file.path}:`, reviewError.message);
            logger.error('File review failed', {
              file: file.path,
              error: reviewError.message,
              commit: commitHash.substring(0, 7)
            });
            // Continue with other files even if one fails
            comment += `### 📄 ${file.path}\n⚠️ Review failed: ${reviewError.message}\n\n`;
          }
        }
        
        try {
          const commentResponse = await bitbucketClient.postCommitComment(repoSlug, commitHash, comment);
          console.log(`[PUSH] Review posted for commit ${commitHash.substring(0, 7)}`);
          
          // Send Slack notification
          await slackNotifier.sendCodeReviewNotification({
            repoSlug: repoSlug,
            type: 'commit',
            commitHash: commitHash,
            filesReviewed: filesToReview.length,
            reviewFocus: config.reviewTypes.join(', '),
            commentId: commentResponse?.id
          });
          
        } catch (commentError) {
          // 댓글 작성 실패 시 캐시에서 제거 (재시도 가능하도록)
          processedCommitsCache.remove(repoSlug, commitHash);
          logger.error('Failed to post comment, removed from cache', {
            commit: commitHash.substring(0, 7),
            repository: repoSlug,
            error: commentError.message
          });
          
          // Send error notification to Slack
          await slackNotifier.sendErrorNotification({
            repoSlug: repoSlug,
            error: commentError.message,
            context: `Failed to post comment for commit ${commitHash.substring(0, 7)}`
          });
          
          throw commentError;
        }
      } catch (error) {
        // 전체 처리 실패 시 캐시에서 제거
        processedCommitsCache.remove(repoSlug, commitHash);
        console.error('[PUSH] Error:', error);
        throw error;
      }
    }
  }
}

module.exports = router;