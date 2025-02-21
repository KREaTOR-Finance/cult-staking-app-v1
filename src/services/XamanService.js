import { Xumm } from 'xumm-sdk';

// Transaction status constants
export const TX_STATUS = {
  CREATED: 'created',
  PENDING: 'pending',
  SIGNED: 'signed',
  SUBMITTED: 'submitted',
  VALIDATED: 'validated',
  FAILED: 'failed',
  EXPIRED: 'expired',
  REJECTED: 'rejected'
};

const BACKEND_URL = 'http://localhost:4000/api';
const XUMM_API_KEY = process.env.REACT_APP_XUMM_API_KEY;
const xumm = new Xumm(XUMM_API_KEY);

class XamanService {
  constructor() {
    // Connection management
    this.activeSubscriptions = new Map();
    this.transactionStatuses = new Map();
    this.eventListeners = new Map();
    
    // XRPL configuration
    this.xrplConfig = {
      wsUrl: 'wss://xrplcluster.com',
      explorer: 'https://livenet.xrpl.org'
    };

    this.currentPayload = null;
    this.connected = false;
    this.address = null;
  }

  // Event handling methods
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  removeEventListener(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emitEvent(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  async connect() {
    try {
      // Create sign request
      const payload = await xumm.payload.create({
        TransactionType: 'SignIn',
        options: {
          return_url: {
            app: window.location.href,
            web: window.location.href
          }
        }
      });

      this.currentPayload = payload;

      // If on mobile, redirect to Xaman app
      if (this.isMobileDevice()) {
        window.location.href = payload.next.always;
        return {
          success: true,
          deepLink: payload.next.always
        };
      }

      // Otherwise return QR data for desktop
      return {
        success: true,
        qrUrl: payload.refs.qr_png,
        payloadId: payload.uuid
      };
    } catch (error) {
      console.error('Failed to create Xaman connection request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPayloadStatus(payloadId) {
    try {
      const payload = await xumm.payload.get(payloadId);
      
      if (payload.meta.resolved) {
        if (payload.response.account) {
          this.connected = true;
          this.address = payload.response.account;
          return {
            success: true,
            account: payload.response.account
          };
        }
      }
      
      return {
        success: false,
        error: 'Payload not resolved'
      };
    } catch (error) {
      console.error('Failed to get payload status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  updateTransactionStatus(payloadId, statusUpdate) {
    const currentStatus = this.transactionStatuses.get(payloadId) || {};
    const newStatus = {
      ...currentStatus,
      ...statusUpdate,
      lastUpdated: Date.now()
    };
    
    this.transactionStatuses.set(payloadId, newStatus);
    this.emitEvent('transactionStatusUpdate', {
      payloadId,
      ...newStatus
    });
  }

  getTransactionStatus(payloadId) {
    return this.transactionStatuses.get(payloadId) || null;
  }

  cleanup() {
    this.activeSubscriptions.clear();
    this.transactionStatuses.clear();
    this.eventListeners.clear();
    this.emitEvent('cleanup', null);
  }

  getExplorerUrl(txHash) {
    return `${this.xrplConfig.explorer}/transactions/${txHash}`;
  }

  getAccountUrl(address) {
    return `https://xrpscan.com/account/${address}`;
  }

  async getConnectedAddress() {
    if (this.connected && this.address) {
      return this.address;
    }
    return null;
  }

  async disconnect() {
    this.connected = false;
    this.address = null;
    this.currentPayload = null;
    
    // Clear all subscriptions
    this.cleanup();
    
    return true;
  }

  // Helper method to check if the app is running on mobile
  isMobileDevice() {
    return /android|iphone|ipad|ipod/i.test(
      navigator.userAgent.toLowerCase()
    );
  }

  // Get the appropriate connection method based on device
  getConnectionMethod() {
    return this.isMobileDevice() ? 'deeplink' : 'qr';
  }
}

// Create and export a single instance
const xamanService = new XamanService();

// Add cleanup listener
if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    xamanService.cleanup();
  });
}

export default xamanService; 