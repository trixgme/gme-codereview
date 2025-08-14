const axios = require('axios');
const logger = require('./logger');
require('dotenv').config();

class BitbucketClient {
  constructor() {
    this.baseURL = 'https://api.bitbucket.org/2.0';
    this.workspace = process.env.BITBUCKET_WORKSPACE;
    this.auth = {
      username: process.env.BITBUCKET_USERNAME,
      password: process.env.BITBUCKET_APP_PASSWORD
    };
  }

  async getPullRequestDiff(repoSlug, prId) {
    const startTime = Date.now();
    const endpoint = `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/pullrequests/${prId}/diff`;
    
    try {
      logger.debug(`Fetching PR diff`, { repoSlug, prId, endpoint });
      
      const response = await axios.get(endpoint, { auth: this.auth });
      
      const responseTime = Date.now() - startTime;
      logger.apiCall('Bitbucket', 'getPullRequestDiff', true, responseTime);
      
      return response.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.apiCall('Bitbucket', 'getPullRequestDiff', false, responseTime);
      logger.error('Error fetching PR diff', {
        error: error.message,
        status: error.response?.status,
        repoSlug,
        prId
      });
      throw new Error(`Failed to fetch PR diff: ${error.message}`);
    }
  }

  async getPullRequestDetails(repoSlug, prId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/pullrequests/${prId}`,
        { auth: this.auth }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching PR details:', error);
      throw new Error(`Failed to fetch PR details: ${error.message}`);
    }
  }

  async getCommitDiff(repoSlug, commitHash) {
    try {
      const response = await axios.get(
        `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/diff/${commitHash}`,
        { auth: this.auth }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching commit diff:', error);
      throw new Error(`Failed to fetch commit diff: ${error.message}`);
    }
  }

  async postPullRequestComment(repoSlug, prId, content) {
    const startTime = Date.now();
    const endpoint = `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/pullrequests/${prId}/comments`;
    
    try {
      logger.debug(`Posting PR comment`, { repoSlug, prId, contentLength: content.length });
      
      const response = await axios.post(
        endpoint,
        {
          content: {
            raw: content
          }
        },
        { auth: this.auth }
      );
      
      const responseTime = Date.now() - startTime;
      logger.apiCall('Bitbucket', 'postPullRequestComment', true, responseTime);
      logger.success(`Posted comment to PR #${prId}`, { repoSlug, prId });
      
      return response.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.apiCall('Bitbucket', 'postPullRequestComment', false, responseTime);
      logger.error('Error posting PR comment', {
        error: error.message,
        status: error.response?.status,
        repoSlug,
        prId
      });
      throw new Error(`Failed to post PR comment: ${error.message}`);
    }
  }

  async postCommitComment(repoSlug, commitHash, content) {
    try {
      const response = await axios.post(
        `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/commit/${commitHash}/comments`,
        {
          content: {
            raw: content
          }
        },
        { auth: this.auth }
      );
      return response.data;
    } catch (error) {
      console.error('Error posting commit comment:', error);
      throw new Error(`Failed to post commit comment: ${error.message}`);
    }
  }

  parseDiff(diffText) {
    const files = [];
    const fileRegex = /diff --git a\/(.*?) b\/(.*?)\n([\s\S]*?)(?=diff --git|$)/g;
    let match;

    while ((match = fileRegex.exec(diffText)) !== null) {
      files.push({
        path: match[2],
        diff: match[0]
      });
    }

    return files;
  }
}

module.exports = new BitbucketClient();