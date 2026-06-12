import api from './apiClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class HealthService {
  static connectionStatus = 'unknown';
  static lastCheck = null;
  static checkInterval = null;
  static listeners = new Set();

  static async checkConnection() {
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        this.connectionStatus = 'healthy';
        this.lastCheck = new Date();
        
        this.notifyListeners({
          status: 'healthy',
          responseTime,
          data,
          timestamp: this.lastCheck
        });
        
        return { status: 'healthy', responseTime, data };
      } else {
        this.connectionStatus = 'unhealthy';
        this.lastCheck = new Date();
        
        this.notifyListeners({
          status: 'unhealthy',
          responseTime,
          error: `Server responded with ${response.status}`,
          timestamp: this.lastCheck
        });
        
        return { status: 'unhealthy', error: `Server responded with ${response.status}` };
      }
    } catch (error) {
      this.connectionStatus = 'offline';
      this.lastCheck = new Date();
      
      this.notifyListeners({
        status: 'offline',
        error: error.message,
        timestamp: this.lastCheck
      });
      
      return { status: 'offline', error: error.message };
    }
  }

  static startHealthMonitoring(interval = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Initial check
    this.checkConnection();
    
    // Set up periodic checks
    this.checkInterval = setInterval(async () => {
      await this.checkConnection();
    }, interval);
    
    console.log(`🏥 Health monitoring started (checking every ${interval/1000}s)`);
  }

  static stopHealthMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🏥 Health monitoring stopped');
    }
  }

  static addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  static notifyListeners(healthData) {
    this.listeners.forEach(callback => {
      try {
        callback(healthData);
      } catch (error) {
        console.error('Health listener error:', error);
      }
    });
  }

  static getStatus() {
    return {
      status: this.connectionStatus,
      lastCheck: this.lastCheck,
      isMonitoring: !!this.checkInterval
    };
  }

  static showConnectionWarning(healthData) {
    // Create or update connection warning notification
    const existingWarning = document.getElementById('connection-warning');
    
    if (existingWarning) {
      existingWarning.remove();
    }
    
    const warning = document.createElement('div');
    warning.id = 'connection-warning';
    warning.className = 'fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded shadow-lg';
    warning.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <div>
          <strong>Connection Issue:</strong> ${healthData.error || 'Server not responding'}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-yellow-700 hover:text-yellow-900">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove();
      }
    }, 10000);
  }
}

export default HealthService;
