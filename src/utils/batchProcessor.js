const logger = require('./logger');

class BatchProcessor {
  /**
   * Process files in batches to avoid timeout
   * @param {Array} files - Array of files to process
   * @param {Function} processor - Function to process each file
   * @param {Number} batchSize - Number of files to process in parallel
   * @returns {Array} - Array of results
   */
  static async processBatch(files, processor, batchSize = 3) {
    const results = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchStartTime = Date.now();
      
      logger.info(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(files.length/batchSize)}`, {
        batchSize: batch.length,
        totalFiles: files.length
      });
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (file, index) => {
          try {
            const fileStartTime = Date.now();
            const result = await processor(file, i + index);
            const processingTime = Date.now() - fileStartTime;
            
            logger.info(`File processed in ${processingTime}ms`, {
              file: file.path || file.name,
              index: i + index + 1,
              total: files.length
            });
            
            return result;
          } catch (error) {
            logger.error(`Error processing file`, {
              file: file.path || file.name,
              error: error.message
            });
            return {
              file: file.path || file.name,
              error: error.message
            };
          }
        })
      );
      
      results.push(...batchResults);
      
      const batchTime = Date.now() - batchStartTime;
      logger.info(`Batch processed in ${batchTime}ms`, {
        batchNumber: Math.floor(i/batchSize) + 1,
        filesProcessed: batch.length
      });
      
      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
  
  /**
   * Process files with timeout protection
   * @param {Array} files - Array of files to process
   * @param {Function} processor - Function to process each file
   * @param {Number} timeout - Maximum time in ms
   * @returns {Object} - Results and any unprocessed files
   */
  static async processWithTimeout(files, processor, timeout = 280000) { // 280 seconds (leave 20s buffer)
    const startTime = Date.now();
    const results = [];
    const unprocessed = [];
    
    for (let i = 0; i < files.length; i++) {
      const elapsed = Date.now() - startTime;
      
      // Check if we're approaching timeout
      if (elapsed > timeout) {
        logger.warning(`Approaching timeout, stopping at file ${i}/${files.length}`, {
          elapsed,
          timeout,
          filesProcessed: i,
          filesRemaining: files.length - i
        });
        
        // Mark remaining files as unprocessed
        unprocessed.push(...files.slice(i));
        break;
      }
      
      try {
        const result = await processor(files[i], i);
        results.push(result);
      } catch (error) {
        logger.error(`Error processing file ${i}`, {
          file: files[i].path || files[i].name,
          error: error.message
        });
        results.push({
          file: files[i].path || files[i].name,
          error: error.message
        });
      }
    }
    
    return {
      processed: results,
      unprocessed: unprocessed,
      totalTime: Date.now() - startTime
    };
  }
}

module.exports = BatchProcessor;