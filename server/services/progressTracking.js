/**
 * Progress Tracking Service
 * Handles real-time progress tracking for video generation processes
 */

class ProgressTrackingService {
  constructor() {
    // In-memory storage for progress data
    this.progressData = new Map();
    
    // Progress update callbacks
    this.callbacks = new Map();
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldProgress();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Initialize progress tracking for a process
   * @param {string} processId - Unique process identifier
   * @param {Object} initialData - Initial progress data
   * @returns {Object} Progress tracking object
   */
  initializeProgress(processId, initialData = {}) {
    const progressInfo = {
      id: processId,
      status: 'starting',
      progress: 0,
      currentStep: 0,
      totalSteps: initialData.totalSteps || 1,
      steps: initialData.steps || ['Processing'],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      error: null,
      metadata: initialData.metadata || {},
      ...initialData
    };

    this.progressData.set(processId, progressInfo);
    this.notifyCallbacks(processId, progressInfo);

    return progressInfo;
  }

  /**
   * Update progress for a process
   * @param {string} processId - Process identifier
   * @param {Object} updates - Progress updates
   * @returns {Object|null} Updated progress data
   */
  updateProgress(processId, updates) {
    const progressInfo = this.progressData.get(processId);
    
    if (!progressInfo) {
      console.warn(`Progress tracking not found for process: ${processId}`);
      return null;
    }

    // Update progress data
    Object.assign(progressInfo, updates, {
      lastUpdated: new Date().toISOString()
    });

    // Ensure progress is within bounds
    if (progressInfo.progress < 0) progressInfo.progress = 0;
    if (progressInfo.progress > 100) progressInfo.progress = 100;

    // Update current step name if step changed
    if (updates.currentStep !== undefined && progressInfo.steps) {
      progressInfo.currentStepName = progressInfo.steps[progressInfo.currentStep];
    }

    this.progressData.set(processId, progressInfo);
    this.notifyCallbacks(processId, progressInfo);

    return progressInfo;
  }

  /**
   * Mark process as completed
   * @param {string} processId - Process identifier
   * @param {Object} result - Final result data
   * @returns {Object|null} Final progress data
   */
  completeProgress(processId, result = {}) {
    return this.updateProgress(processId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      result,
      ...result
    });
  }

  /**
   * Mark process as failed
   * @param {string} processId - Process identifier
   * @param {string|Error} error - Error information
   * @returns {Object|null} Final progress data
   */
  failProgress(processId, error) {
    const errorMessage = error instanceof Error ? error.message : error;
    
    return this.updateProgress(processId, {
      status: 'failed',
      error: errorMessage,
      failedAt: new Date().toISOString()
    });
  }

  /**
   * Cancel a process
   * @param {string} processId - Process identifier
   * @returns {Object|null} Updated progress data
   */
  cancelProgress(processId) {
    return this.updateProgress(processId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    });
  }

  /**
   * Get progress data for a process
   * @param {string} processId - Process identifier
   * @returns {Object|null} Progress data
   */
  getProgress(processId) {
    return this.progressData.get(processId) || null;
  }

  /**
   * Get all active processes
   * @returns {Array} Array of active progress data
   */
  getActiveProcesses() {
    const activeStatuses = ['starting', 'processing', 'in_progress'];
    
    return Array.from(this.progressData.values())
      .filter(progress => activeStatuses.includes(progress.status));
  }

  /**
   * Get all processes for a specific type or user
   * @param {Object} filters - Filter criteria
   * @param {string} filters.userId - User ID filter
   * @param {string} filters.type - Process type filter
   * @param {string} filters.status - Status filter
   * @returns {Array} Filtered progress data
   */
  getProcesses(filters = {}) {
    let processes = Array.from(this.progressData.values());

    if (filters.userId) {
      processes = processes.filter(p => p.metadata?.userId === filters.userId);
    }

    if (filters.type) {
      processes = processes.filter(p => p.metadata?.type === filters.type);
    }

    if (filters.status) {
      processes = processes.filter(p => p.status === filters.status);
    }

    return processes.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }

  /**
   * Register a callback for progress updates
   * @param {string} processId - Process identifier
   * @param {Function} callback - Callback function
   */
  onProgressUpdate(processId, callback) {
    if (!this.callbacks.has(processId)) {
      this.callbacks.set(processId, []);
    }
    
    this.callbacks.get(processId).push(callback);
  }

  /**
   * Remove progress update callback
   * @param {string} processId - Process identifier
   * @param {Function} callback - Callback function to remove
   */
  removeProgressCallback(processId, callback) {
    const callbacks = this.callbacks.get(processId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      
      if (callbacks.length === 0) {
        this.callbacks.delete(processId);
      }
    }
  }

  /**
   * Notify all callbacks for a process
   * @param {string} processId - Process identifier
   * @param {Object} progressData - Progress data
   */
  notifyCallbacks(processId, progressData) {
    const callbacks = this.callbacks.get(processId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(progressData);
        } catch (error) {
          console.error('Error in progress callback:', error);
        }
      });
    }
  }

  /**
   * Create a progress updater function for a process
   * @param {string} processId - Process identifier
   * @returns {Function} Progress updater function
   */
  createUpdater(processId) {
    return (updates) => this.updateProgress(processId, updates);
  }

  /**
   * Create a step-based progress updater
   * @param {string} processId - Process identifier
   * @param {number} totalSteps - Total number of steps
   * @returns {Function} Step updater function
   */
  createStepUpdater(processId, totalSteps) {
    return (stepIndex, stepName = null) => {
      const progress = Math.round((stepIndex / totalSteps) * 100);
      
      const updates = {
        currentStep: stepIndex,
        progress
      };
      
      if (stepName) {
        updates.currentStepName = stepName;
      }
      
      return this.updateProgress(processId, updates);
    };
  }

  /**
   * Clean up old completed/failed processes
   * @param {number} maxAgeHours - Maximum age in hours (default: 24)
   * @returns {number} Number of processes cleaned up
   */
  cleanupOldProgress(maxAgeHours = 24) {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [processId, progressData] of this.progressData.entries()) {
      const completedTime = progressData.completedAt || progressData.failedAt || progressData.cancelledAt;
      
      if (completedTime) {
        const completedTimestamp = new Date(completedTime).getTime();
        if (completedTimestamp < cutoffTime) {
          this.progressData.delete(processId);
          this.callbacks.delete(processId);
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const allProcesses = Array.from(this.progressData.values());
    
    const stats = {
      totalProcesses: allProcesses.length,
      activeProcesses: allProcesses.filter(p => ['starting', 'processing', 'in_progress'].includes(p.status)).length,
      completedProcesses: allProcesses.filter(p => p.status === 'completed').length,
      failedProcesses: allProcesses.filter(p => p.status === 'failed').length,
      cancelledProcesses: allProcesses.filter(p => p.status === 'cancelled').length,
      totalCallbacks: Array.from(this.callbacks.values()).reduce((sum, callbacks) => sum + callbacks.length, 0)
    };

    // Calculate average completion time
    const completedProcesses = allProcesses.filter(p => p.status === 'completed' && p.startedAt && p.completedAt);
    if (completedProcesses.length > 0) {
      const totalTime = completedProcesses.reduce((sum, process) => {
        const start = new Date(process.startedAt).getTime();
        const end = new Date(process.completedAt).getTime();
        return sum + (end - start);
      }, 0);
      
      stats.averageCompletionTime = Math.round((totalTime / completedProcesses.length) / 1000); // in seconds
    } else {
      stats.averageCompletionTime = 0;
    }

    return stats;
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.progressData.clear();
    this.callbacks.clear();
  }
}

module.exports = new ProgressTrackingService();