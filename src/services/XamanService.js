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

// Always use Render backend
const BACKEND_URL = 'https://cult-staking-app-v1.onrender.com/api';

// Enhanced debug logging
console.log('XamanService Initialization:', {
  hostname: window.location.hostname,
  backendUrl: BACKEND_URL,
  isGitHubPages: window.location.hostname === 'kreator-finance.github.io',
  fullUrl: window.location.href,
  userAgent: navigator.userAgent
});

class XamanService {
  constructor() {
    // Connection management
    this.activeSubscriptions = new Map();
    this.transactionStatuses = new Map();
    this.eventListeners = new Map();
    
    // XRPL configuration
    this.xrplConfig = {
      wsUrl: process.env.REACT_APP_XRPL_MAINNET_URL || 'wss://xrplcluster.com',
      explorer: process.env.REACT_APP_XRPL_MAINNET_EXPLORER || 'https://livenet.xrpl.org'
    };

    // Log XRPL config for debugging
    console.log('XRPL Config:', {
      network: process.env.REACT_APP_XRPL_NETWORK,
      wsUrl: this.xrplConfig.wsUrl,
      explorer: this.xrplConfig.explorer
    });

    // Mobile detection
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
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

  isXamanInstalled() {
    return new Promise((resolve) => {
      if (!this.isMobile) {
        resolve(false);
        return;
      }

      // Try to open Xaman using a more reliable deep link
      const testUrl = 'xumm://xumm.app/detect';
      
      // Store the initial visibility state
      const initialVisibility = document.visibilityState;
      
      const timeout = setTimeout(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        // If we're still on the same visibility state, Xaman didn't open
        if (document.visibilityState === initialVisibility) {
          resolve(false);
        }
      }, 3000); // Increased timeout for slower devices/connections

      const handleVisibilityChange = () => {
        clearTimeout(timeout);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        resolve(true);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Try to open Xaman
      window.location.href = testUrl;
    });
  }

  getAppStoreLink() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'https://apps.apple.com/app/xaman-xumm-wallet/id1492302343';
    }
    return 'https://play.google.com/store/apps/details?id=com.xrpllabs.xumm';
  }

  async createSignRequest() {
    try {
      console.log('Creating sign request:', {
        backendUrl: BACKEND_URL,
        endpoint: `${BACKEND_URL}/xaman/sign-request`,
        currentUrl: window.location.href
      });
      
      // Clear any existing connection attempts
      await this.disconnect();
      
      // Construct return URLs with proper path and origin
      const returnUrl = new URL(window.location.href);
      
      // Handle local development URLs
      let baseUrl;
      if (returnUrl.hostname.includes('192.168.') || returnUrl.hostname.includes('localhost')) {
        // For local development, use the current origin consistently
        baseUrl = returnUrl.origin;
      } else {
        // For production, use the actual domain
        baseUrl = returnUrl.origin;
      }
      
      // Construct the return path
      const returnPath = baseUrl + '/?signed=true#/dashboard';
      
      console.log('Sign request details:', {
        returnPath,
        isMobile: this.isMobile
      });
      
      const requestBody = {
        txjson: {
          TransactionType: 'SignIn',
          SignIn: true
        },
        options: {
          expire: 10 * 60,
          return_url: {
            app: returnPath,
            web: returnPath
          },
          next: {
            always: returnPath
          },
          submit: true,
          forceType: this.isMobile ? 'app' : 'web',
          // Add mobile specific options
          mobile: {
            return_url: {
              app: returnPath,
              web: returnPath
            }
          }
        }
      };

      // For mobile, ensure consistent deep linking
      if (this.isMobile) {
        requestBody.options.next.app = returnPath;
      }

      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${BACKEND_URL}/xaman/sign-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('API Response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('API Success Response:', {
        uuid: data.uuid,
        hasNext: !!data.next,
        hasQR: !!data.refs?.qr_png,
        nextUrls: data.next,
        returnUrls: data.return_url
      });

      if (!data || !data.uuid) {
        console.error('Invalid API response:', data);
        throw new Error('Invalid sign request response');
      }

      // Store the payload ID and timestamp
      localStorage.setItem('xaman_payload_id', data.uuid);
      localStorage.setItem('xaman_connection_timestamp', Date.now().toString());

      // For mobile, prefer the app-specific deep link if available
      const deepLink = this.isMobile && data.next?.app ? data.next.app : data.next?.always;
      console.log('Selected deep link:', deepLink);

      return {
        success: true,
        qrUrl: data.refs?.qr_png,
        payloadId: data.uuid,
        deepLink
      };
    } catch (error) {
      console.error('Sign request creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create sign request'
      };
    }
  }

  async getPayloadStatus(payloadId) {
    try {
      console.log('Checking payload status:', {
        payloadId,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`${BACKEND_URL}/xaman/payload/${payloadId}`);
      console.log('Payload status response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payload status error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to get payload status: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Payload status data:', {
        meta: data?.meta,
        response: data?.response,
        timestamp: new Date().toISOString()
      });

      // Validate the response data
      if (!data || typeof data.meta?.signed === 'undefined') {
        console.error('Invalid payload status response:', data);
        throw new Error('Invalid payload status response format');
      }

      // If signed, store the account
      if (data?.meta?.signed && data?.response?.account) {
        console.log('Storing account from signed payload:', data.response.account);
        localStorage.setItem('xaman_account', data.response.account);
      }

      return {
        success: true,
        isSigned: data?.meta?.signed || false,
        isPending: !data?.meta?.signed,
        txHash: data?.response?.txid || null,
        account: data?.response?.account || null,
        error: data?.response?.error || null,
        rejected: data?.meta?.cancelled || false,
        expired: data?.meta?.expired || false
      };
    } catch (error) {
      console.error('Failed to get payload status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get payload status',
        isPending: false,
        isSigned: false
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