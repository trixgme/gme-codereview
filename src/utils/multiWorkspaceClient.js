const axios = require('axios');
const logger = require('./logger');
require('dotenv').config();

class MultiWorkspaceClient {
  constructor() {
    this.baseURL = 'https://api.bitbucket.org/2.0';
    
    // Multiple workspace configurations
    this.workspaces = {
      // Default workspace
      default: {
        workspace: process.env.BITBUCKET_WORKSPACE,
        username: process.env.BITBUCKET_USERNAME,
        password: process.env.BITBUCKET_APP_PASSWORD
      },
      
      // Add more workspaces as needed
      // workspace2: {
      //   workspace: process.env.BITBUCKET_WORKSPACE_2,
      //   username: process.env.BITBUCKET_USERNAME_2,
      //   password: process.env.BITBUCKET_APP_PASSWORD_2
      // }
    };
  }

  // Get configuration based on workspace
  getConfig(workspaceSlug) {
    // Try to find matching workspace config
    const config = this.workspaces[workspaceSlug] || this.workspaces.default;
    
    if (!config) {
      throw new Error(`No configuration found for workspace: ${workspaceSlug}`);
    }
    
    return {
      workspace: config.workspace,
      auth: {
        username: config.username,
        password: config.password
      }
    };
  }

  async getPullRequestDiff(workspaceSlug, repoSlug, prId) {
    const config = this.getConfig(workspaceSlug);
    const url = `${this.baseURL}/repositories/${config.workspace}/${repoSlug}/pullrequests/${prId}/diff`;
    
    try {
      logger.debug(`Fetching PR diff`, { workspace: config.workspace, repoSlug, prId });
      const response = await axios.get(url, { auth: config.auth });
      return response.data;
    } catch (error) {
      logger.error('Error fetching PR diff', {
        error: error.message,
        workspace: config.workspace,
        repoSlug,
        prId
      });
      throw error;
    }
  }

  async getCommitDiff(workspaceSlug, repoSlug, commitHash) {
    const config = this.getConfig(workspaceSlug);
    const url = `${this.baseURL}/repositories/${config.workspace}/${repoSlug}/diff/${commitHash}`;
    
    try {
      logger.debug(`Fetching commit diff`, { workspace: config.workspace, repoSlug, commitHash });
      const response = await axios.get(url, { auth: config.auth });
      return response.data;
    } catch (error) {
      logger.error('Error fetching commit diff', {
        error: error.message,
        workspace: config.workspace,
        repoSlug,
        commitHash
      });
      throw error;
    }
  }

  async postPullRequestComment(workspaceSlug, repoSlug, prId, content) {
    const config = this.getConfig(workspaceSlug);
    const url = `${this.baseURL}/repositories/${config.workspace}/${repoSlug}/pullrequests/${prId}/comments`;
    
    try {
      const response = await axios.post(
        url,
        { content: { raw: content } },
        { auth: config.auth }
      );
      logger.success(`Posted comment to PR #${prId}`, { workspace: config.workspace, repoSlug });
      return response.data;
    } catch (error) {
      logger.error('Error posting PR comment', {
        error: error.message,
        workspace: config.workspace,
        repoSlug,
        prId
      });
      throw error;
    }
  }

  async postCommitComment(workspaceSlug, repoSlug, commitHash, content) {
    const config = this.getConfig(workspaceSlug);
    const url = `${this.baseURL}/repositories/${config.workspace}/${repoSlug}/commit/${commitHash}/comments`;
    
    try {
      const response = await axios.post(
        url,
        { content: { raw: content } },
        { auth: config.auth }
      );
      logger.success(`Posted comment to commit`, { workspace: config.workspace, repoSlug, commitHash });
      return response.data;
    } catch (error) {
      logger.error('Error posting commit comment', {
        error: error.message,
        workspace: config.workspace,
        repoSlug,
        commitHash
      });
      throw error;
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

module.exports = new MultiWorkspaceClient();