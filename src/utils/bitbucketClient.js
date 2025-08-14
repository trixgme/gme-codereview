const axios = require('axios');
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
    try {
      const response = await axios.get(
        `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/pullrequests/${prId}/diff`,
        { auth: this.auth }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching PR diff:', error);
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
    try {
      const response = await axios.post(
        `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/pullrequests/${prId}/comments`,
        {
          content: {
            raw: content
          }
        },
        { auth: this.auth }
      );
      return response.data;
    } catch (error) {
      console.error('Error posting PR comment:', error);
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