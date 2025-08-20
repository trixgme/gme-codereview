const logger = require('./logger');

class ProcessedCommitsCache {
  constructor() {
    // Map으로 commit hash와 처리 시간을 저장
    this.cache = new Map();
    // 처리 중인 커밋을 추적 (동시 요청 방지)
    this.processing = new Map();
    // 24시간 후 자동 삭제 (밀리초)
    this.TTL = 24 * 60 * 60 * 1000;
    // 1시간마다 만료된 항목 정리
    this.cleanupInterval = 60 * 60 * 1000;
    
    // 주기적으로 만료된 항목 정리
    this.startCleanup();
  }

  /**
   * 커밋이 이미 처리되었는지 확인
   * @param {string} repoSlug - 저장소 이름
   * @param {string} commitHash - 커밋 해시
   * @returns {boolean} 이미 처리되었으면 true
   */
  has(repoSlug, commitHash) {
    const key = `${repoSlug}:${commitHash}`;
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // 만료 시간 확인
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      logger.debug(`Expired cache entry removed: ${key}`);
      return false;
    }
    
    return true;
  }

  /**
   * 처리 중인 커밋인지 확인
   * @param {string} repoSlug - 저장소 이름
   * @param {string} commitHash - 커밋 해시
   * @returns {boolean} 처리 중이면 true
   */
  isProcessing(repoSlug, commitHash) {
    const key = `${repoSlug}:${commitHash}`;
    return this.processing.has(key);
  }

  /**
   * 처리 시작 표시
   * @param {string} repoSlug - 저장소 이름
   * @param {string} commitHash - 커밋 해시
   * @returns {boolean} 처리를 시작할 수 있으면 true, 이미 처리 중이면 false
   */
  startProcessing(repoSlug, commitHash) {
    const key = `${repoSlug}:${commitHash}`;
    
    // 이미 처리 중이거나 완료된 경우
    if (this.processing.has(key) || this.has(repoSlug, commitHash)) {
      logger.warn(`Duplicate processing attempt blocked: ${key}`);
      return false;
    }
    
    this.processing.set(key, Date.now());
    logger.debug(`Started processing: ${key}`);
    return true;
  }

  /**
   * 처리 완료 및 캐시 추가
   * @param {string} repoSlug - 저장소 이름
   * @param {string} commitHash - 커밋 해시
   */
  completeProcessing(repoSlug, commitHash) {
    const key = `${repoSlug}:${commitHash}`;
    
    // 처리 중 목록에서 제거
    this.processing.delete(key);
    
    // 캐시에 추가
    this.cache.set(key, {
      timestamp: Date.now(),
      repoSlug,
      commitHash
    });
    logger.debug(`Processing completed and cached: ${key}`);
  }

  /**
   * 처리된 커밋 추가 (레거시 호환성)
   * @param {string} repoSlug - 저장소 이름
   * @param {string} commitHash - 커밋 해시
   */
  add(repoSlug, commitHash) {
    this.completeProcessing(repoSlug, commitHash);
  }

  /**
   * 특정 커밋 제거
   * @param {string} repoSlug - 저장소 이름
   * @param {string} commitHash - 커밋 해시
   */
  remove(repoSlug, commitHash) {
    const key = `${repoSlug}:${commitHash}`;
    this.cache.delete(key);
    this.processing.delete(key);
    logger.debug(`Removed from cache: ${key}`);
  }

  /**
   * 만료된 항목 정리
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      logger.info(`Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * 주기적 정리 시작
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * 정리 타이머 중지 (서버 종료 시)
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 캐시 상태 조회 (디버깅용)
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Math.floor((Date.now() - entry.timestamp) / 1000 / 60) + ' minutes'
      }))
    };
  }

  /**
   * 캐시 초기화
   */
  clear() {
    this.cache.clear();
    logger.info('ProcessedCommitsCache cleared');
  }
}

// 싱글톤 인스턴스 생성
const instance = new ProcessedCommitsCache();

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
  instance.stopCleanup();
});

process.on('SIGINT', () => {
  instance.stopCleanup();
});

module.exports = instance;