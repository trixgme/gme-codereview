const express = require('express');
const router = express.Router();
const codeReviewer = require('../utils/codeReviewer');
const bitbucketClient = require('../utils/bitbucketClient');
const { validateWebhookSignature, parseWebhookPayload } = require('../middlewares/webhookValidator');

// Webhook endpoint for Bitbucket
router.post('/bitbucket', 
  validateWebhookSignature,
  parseWebhookPayload,
  async (req, res) => {
    try {
      const { eventType, payload } = req.webhookData;
      
      console.log(`Received webhook event: ${eventType}`);

      // Handle different webhook events
      switch (eventType) {
        case 'pullrequest:created':
        case 'pullrequest:updated':
          await handlePullRequest(payload);
          break;
        
        case 'repo:push':
          await handlePush(payload);
          break;
        
        default:
          console.log(`Unhandled event type: ${eventType}`);
      }

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
});

async function handlePullRequest(payload) {
  try {
    const { pullrequest, repository } = payload;
    const repoSlug = repository.name;
    const prId = pullrequest.id;
    const prTitle = pullrequest.title;
    const prDescription = pullrequest.description || '';

    console.log(`Processing PR #${prId}: ${prTitle}`);

    // Get PR diff
    const diffText = await bitbucketClient.getPullRequestDiff(repoSlug, prId);
    const files = bitbucketClient.parseDiff(diffText);

    if (files.length === 0) {
      console.log('No files changed in PR');
      return;
    }

    // Review the PR
    const reviewResult = await codeReviewer.reviewPullRequest({
      title: prTitle,
      description: prDescription,
      files: files
    });

    // Format the review comment
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

    // Post comment to PR
    await bitbucketClient.postPullRequestComment(repoSlug, prId, comment);
    
    console.log(`Successfully posted review for PR #${prId}`);
  } catch (error) {
    console.error('Error handling pull request:', error);
    throw error;
  }
}

async function handlePush(payload) {
  try {
    const { push, repository } = payload;
    const repoSlug = repository.name;
    
    // Process each change in the push
    for (const change of push.changes) {
      if (change.new && change.new.type === 'commit') {
        const commitHash = change.new.target.hash;
        const commitMessage = change.new.target.message;
        
        console.log(`Processing commit: ${commitHash.substring(0, 7)}`);

        // Get commit diff
        const diffText = await bitbucketClient.getCommitDiff(repoSlug, commitHash);
        const files = bitbucketClient.parseDiff(diffText);

        if (files.length === 0) {
          console.log('No files changed in commit');
          continue;
        }

        // Review each file in the commit
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

        // Post comment to commit
        await bitbucketClient.postCommitComment(repoSlug, commitHash, comment);
        
        console.log(`Successfully posted review for commit ${commitHash.substring(0, 7)}`);
      }
    }
  } catch (error) {
    console.error('Error handling push:', error);
    throw error;
  }
}

module.exports = router;