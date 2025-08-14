const express = require('express');
const router = express.Router();
const codeReviewer = require('../utils/codeReviewer');
const bitbucketClient = require('../utils/bitbucketClient');
const repositoryConfigs = require('../config/repositories');
const logger = require('../utils/logger');

router.post('/bitbucket/:workspace?', async (req, res) => {
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
  
  console.log(`[PR] Processing PR #${prId} for ${repoSlug} with config:`, config);
  
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
    
    // Review with custom configuration
    const reviewResult = await codeReviewer.reviewPullRequest({
      title: pullrequest.title,
      description: pullrequest.description,
      files: filesToReview,
      customPrompt: customPrompt,
      config: config
    });
    
    // Format and post comment
    let comment = `## 🤖 Automated Code Review\n\n`;
    comment += `**Repository**: ${repoSlug}\n`;
    comment += `**Configuration**: ${config.reviewTypes.join(', ')}\n\n`;
    comment += reviewResult.summary;
    
    await bitbucketClient.postPullRequestComment(repoSlug, prId, comment);
    console.log(`[PR] Review posted for PR #${prId}`);
    
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
      
      try {
        // Get commit diff
        const diffText = await bitbucketClient.getCommitDiff(repoSlug, commitHash);
        const files = bitbucketClient.parseDiff(diffText);
        
        // Filter files based on configuration
        const filesToReview = files.filter(file => 
          !repositoryConfigs.shouldSkipPath(repoSlug, file.path)
        );
        
        if (filesToReview.length === 0) {
          console.log('[PUSH] No files to review after filtering');
          continue;
        }
        
        // Generate custom review prompt
        const customPrompt = repositoryConfigs.getReviewPrompt(repoSlug);
        
        // Review each file with custom configuration
        let comment = `## 🤖 Automated Code Review\n\n`;
        comment += `**Repository**: ${repoSlug}\n`;
        comment += `**Commit**: ${commitHash.substring(0, 7)}\n`;
        comment += `**Review Focus**: ${config.reviewTypes.join(', ')}\n\n`;
        
        for (const file of filesToReview) {
          const review = await codeReviewer.reviewCode(
            file.diff,
            file.path,
            change.new.target.message,
            customPrompt
          );
          comment += `### 📄 ${file.path}\n${review}\n\n`;
        }
        
        await bitbucketClient.postCommitComment(repoSlug, commitHash, comment);
        console.log(`[PUSH] Review posted for commit ${commitHash.substring(0, 7)}`);
        
      } catch (error) {
        console.error('[PUSH] Error:', error);
        throw error;
      }
    }
  }
}

module.exports = router;