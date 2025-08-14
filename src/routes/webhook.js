const express = require('express');
const router = express.Router();
const codeReviewer = require('../utils/codeReviewer');
const bitbucketClient = require('../utils/bitbucketClient');
const { validateWebhookSignature, parseWebhookPayload } = require('../middlewares/webhookValidator');

router.post('/bitbucket', 
  validateWebhookSignature,
  parseWebhookPayload,
  async (req, res) => {
    try {
      const { eventType, payload } = req.webhookData;
      
      console.log(`Received webhook event: ${eventType}`);

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

    const diffText = await bitbucketClient.getPullRequestDiff(repoSlug, prId);
    const files = bitbucketClient.parseDiff(diffText);

    if (files.length === 0) {
      console.log('No files changed in PR');
      return;
    }

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
    
    for (const change of push.changes) {
      if (change.new && change.new.type === 'commit') {
        const commitHash = change.new.target.hash;
        const commitMessage = change.new.target.message;
        
        console.log(`Processing commit: ${commitHash.substring(0, 7)}`);

        const diffText = await bitbucketClient.getCommitDiff(repoSlug, commitHash);
        const files = bitbucketClient.parseDiff(diffText);

        if (files.length === 0) {
          console.log('No files changed in commit');
          continue;
        }

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
        
        console.log(`Successfully posted review for commit ${commitHash.substring(0, 7)}`);
      }
    }
  } catch (error) {
    console.error('Error handling push:', error);
    throw error;
  }
}

module.exports = router;