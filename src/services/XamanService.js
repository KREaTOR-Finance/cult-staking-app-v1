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

  async createSignRequest() {
    try {
      const response = await fetch(`${BACKEND_URL}/xaman/sign-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          txjson: {
            TransactionType: 'SignIn'
          },
          options: {
            expire: 5 * 60,
            return_url: {
              app: `${window.location.origin}?signed=true`,
              web: `${window.location.origin}?signed=true`
            },
            submit: true,
            multisign: false,
            signerAccount: null
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create sign request');
      }

      const data = await response.json();

      if (!data || !data.uuid) {
        throw new Error('Invalid sign request response');
      }

      // Store the payload ID and timestamp
      localStorage.setItem('xaman_payload_id', data.uuid);
      localStorage.setItem('xaman_connection_timestamp', Date.now().toString());

      return {
        success: true,
        qrUrl: data.refs.qr_png,
        payloadId: data.uuid,
        deepLink: data.next.always
      };
    } catch (error) {
      console.error('Sign request creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPayloadStatus(payloadId) {
    try {
      const response = await fetch(`${BACKEND_URL}/xaman/payload/${payloadId}`);
      if (!response.ok) {
        throw new Error('Failed to get payload status');
      }
      const data = await response.json();

      // If signed, store the account
      if (data?.meta?.signed && data?.response?.account) {
        localStorage.setItem('xaman_account', data.response.account);
      }

      return {
        success: true,
        isSigned: data?.meta?.signed || false,
        isPending: !data?.meta?.signed,
        txHash: data?.response?.txid || null,
        account: data?.response?.account || null
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
    return `https://xrpl.org/accounts/${address}`;
  }

  async getConnectedAddress() {
    try {
      // First check if we have a stored account
      const storedAccount = localStorage.getItem('xaman_account');
      
      // Check if connection is still valid (within 24 hours)
      const timestamp = localStorage.getItem('xaman_connection_timestamp');
      if (timestamp && storedAccount) {
        const elapsed = Date.now() - parseInt(timestamp);
        if (elapsed > 24 * 60 * 60 * 1000) {
          await this.disconnect();
          return null;
        }
        return storedAccount;
      }

      const payloadId = localStorage.getItem('xaman_payload_id');
      if (!payloadId) return null;

      const status = await this.getPayloadStatus(payloadId);
      if (!status.success || !status.account) {
        await this.disconnect();
        return null;
      }

      // Update timestamp and store account
      localStorage.setItem('xaman_connection_timestamp', Date.now().toString());
      localStorage.setItem('xaman_account', status.account);
      return status.account;
    } catch (error) {
      console.error('Failed to get connected address:', error);
      await this.disconnect();
      return null;
    }
  }

  async disconnect() {
    localStorage.removeItem('xaman_payload_id');
    localStorage.removeItem('xaman_connection_timestamp');
    localStorage.removeItem('xaman_account');
    
    // Clear all subscriptions
    this.cleanup();
    
    return true;
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