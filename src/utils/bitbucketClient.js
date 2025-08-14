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
    const startTime = Date.now();
    try {
      const response = await axios.get(
        `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/pullrequests/${prId}`,
        { auth: this.auth }
      );
      const responseTime = Date.now() - startTime;
      logger.apiCall('Bitbucket', 'getPullRequestDetails', true, responseTime);
      return response.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.apiCall('Bitbucket', 'getPullRequestDetails', false, responseTime);
      logger.error('Error fetching PR details', {
        error: error.message,
        status: error.response?.status,
        repoSlug,
        prId
      });
      throw new Error(`Failed to fetch PR details: ${error.message}`);
    }
  }

  async getCommitDiff(repoSlug, commitHash) {
    const startTime = Date.now();
    const url = `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/diff/${commitHash}`;
    
    console.log('[BITBUCKET] Fetching diff from:', url);
    console.log('[BITBUCKET] Workspace:', this.workspace);
    console.log('[BITBUCKET] Repo:', repoSlug);
    console.log('[BITBUCKET] Commit:', commitHash);
    
    try {
      const response = await axios.get(url, { auth: this.auth });
      const responseTime = Date.now() - startTime;
      logger.apiCall('Bitbucket', 'getCommitDiff', true, responseTime);
      console.log('[BITBUCKET] Diff fetched successfully');
      return response.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.apiCall('Bitbucket', 'getCommitDiff', false, responseTime);
      
      console.error('[BITBUCKET] Error details:');
      console.error('[BITBUCKET] Status:', error.response?.status);
      console.error('[BITBUCKET] Message:', error.message);
      console.error('[BITBUCKET] Response data:', error.response?.data);
      
      logger.error('Error fetching commit diff', {
        error: error.message,
        status: error.response?.status,
        repoSlug,
        commitHash,
        workspace: this.workspace
      });
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
    const startTime = Date.now();
    const endpoint = `${this.baseURL}/repositories/${this.workspace}/${repoSlug}/commit/${commitHash}/comments`;
    
    try {
      logger.debug(`Posting commit comment`, { repoSlug, commitHash, contentLength: content.length });
      
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
      logger.apiCall('Bitbucket', 'postCommitComment', true, responseTime);
      logger.success(`Posted comment to commit ${commitHash.substring(0, 7)}`, { repoSlug, commitHash });
      
      return response.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.apiCall('Bitbucket', 'postCommitComment', false, responseTime);
      logger.error('Error posting commit comment', {
        error: error.message,
        status: error.response?.status,
        repoSlug,
        commitHash
      });
      throw new Error(`Failed to post commit comment: ${error.message}`);
    }
  }

  parseDiff(diffText) {
    const files = [];
    const fileRegex = /diff --git a\/(.*?) b\/(.*?)\n([\s\S]*?)(?=diff --git|$)/g;
    let match;
    
    // Files to skip from environment variables
    const skipExtensions = (process.env.SKIP_EXTENSIONS || '').split(',').filter(Boolean);
    const skipPaths = (process.env.SKIP_PATHS || '').split(',').filter(Boolean);
    const skipPatterns = (process.env.SKIP_FILE_PATTERNS || '').split(',').filter(Boolean);
    
    // Additional hardcoded patterns for translation and config files
    const translationPatterns = [
      /strings.*\.xml$/i,
      /colors\.xml$/i,
      /dimens\.xml$/i,
      /styles\.xml$/i,
      /attrs\.xml$/i,
      /themes\.xml$/i,
      /arrays\.xml$/i,
      /plurals\.xml$/i,
      /integers\.xml$/i,
      /bools\.xml$/i,
      /config\.xml$/i,
      /\.properties$/i,
      /messages.*\.properties$/i,
      /i18n\/.*\.json$/i,
      /locale\/.*\.json$/i,
      /lang\/.*\.json$/i,
      /translation\/.*\.json$/i,
      /locales\/.*\.(json|yml|yaml)$/i,
      /\.po$/i,
      /\.pot$/i,
      /\.mo$/i
    ];
    
    // Config and generated files to skip
    const configPatterns = [
      /package-lock\.json$/i,
      /yarn\.lock$/i,
      /composer\.lock$/i,
      /Gemfile\.lock$/i,
      /Podfile\.lock$/i,
      /cargo\.lock$/i,
      /\.generated\./i,
      /\.min\./i,
      /\.bundle\./i,
      /\.map$/i,
      /\.sum$/i,
      /\.cache$/i
    ];

    while ((match = fileRegex.exec(diffText)) !== null) {
      const filePath = match[2];
      
      // Check if file should be skipped
      let shouldSkip = false;
      
      // Check file extension
      for (const ext of skipExtensions) {
        if (filePath.endsWith(ext)) {
          logger.debug(`Skipping file due to extension: ${filePath}`);
          shouldSkip = true;
          break;
        }
      }
      
      // Check paths
      if (!shouldSkip) {
        for (const path of skipPaths) {
          if (filePath.includes(path)) {
            logger.debug(`Skipping file due to path: ${filePath}`);
            shouldSkip = true;
            break;
          }
        }
      }
      
      // Check translation patterns
      if (!shouldSkip) {
        for (const pattern of translationPatterns) {
          if (pattern.test(filePath)) {
            logger.debug(`Skipping translation file: ${filePath}`);
            shouldSkip = true;
            break;
          }
        }
      }
      
      // Check config patterns
      if (!shouldSkip) {
        for (const pattern of configPatterns) {
          if (pattern.test(filePath)) {
            logger.debug(`Skipping config/generated file: ${filePath}`);
            shouldSkip = true;
            break;
          }
        }
      }
      
      // Check custom skip patterns
      if (!shouldSkip) {
        for (const pattern of skipPatterns) {
          // Convert glob pattern to regex
          const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');
          if (regex.test(filePath)) {
            logger.debug(`Skipping file due to custom pattern: ${filePath}`);
            shouldSkip = true;
            break;
          }
        }
      }
      
      if (!shouldSkip) {
        files.push({
          path: filePath,
          diff: match[0]
        });
      }
    }
    
    logger.info(`Parsed diff: ${files.length} files to review (after filtering)`);
    return files;
  }
}

module.exports = new BitbucketClient();