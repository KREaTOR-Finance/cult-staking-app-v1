import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import xamanService from '../services/XamanService';

const WalletConnect = ({ onConnect, onDisconnect, walletAddress }) => {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [deepLink, setDeepLink] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile] = useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [payloadId, setPayloadId] = useState(null);
  const [appStoreLink, setAppStoreLink] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);

  // Helper function to add debug logs
  const addDebugLog = useCallback((message) => {
    console.log(message);
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []); // Empty dependency array since setDebugLogs is stable

  // Check existing connection
  const checkConnection = useCallback(async () => {
    try {
      const address = await xamanService.getConnectedAddress();
      if (address) {
        onConnect(address);
        navigate('#/dashboard');
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ Connection check failed:', err);
      return false;
    }
  }, [onConnect, navigate]);

  // Handle redirect after mobile sign
  const handleRedirect = useCallback(async () => {
    const currentPayloadId = payloadId || localStorage.getItem('xaman_payload_id');
    
    if (!currentPayloadId) {
      addDebugLog('No payload ID found for status check');
      return { success: false, reason: 'no_payload' };
    }

    try {
      addDebugLog(`Checking payload status after return. PayloadID: ${currentPayloadId}`);
      
      const status = await xamanService.getPayloadStatus(currentPayloadId);
      addDebugLog(`Return status: ${JSON.stringify(status, null, 2)}`);
      
      if (!status.success) {
        addDebugLog(`Failed to get status: ${status.error}`);
        return { success: false, reason: 'status_error', error: status.error };
      }

      if (status.expired) {
        addDebugLog('Sign request has expired');
        localStorage.removeItem('xaman_payload_id');
        setPayloadId(null);
        return { success: false, reason: 'expired' };
      }

      if (status.rejected) {
        addDebugLog('Sign request was rejected');
        localStorage.removeItem('xaman_payload_id');
        setPayloadId(null);
        return { success: false, reason: 'rejected' };
      }

      if (status.error) {
        addDebugLog(`Sign request error: ${status.error}`);
        return { success: false, reason: 'sign_error', error: status.error };
      }

      if (status.account) {
        addDebugLog(`Successfully connected with account: ${status.account}`);
        
        // Clear states before connecting to prevent race conditions
        setQrCode(null);
        setDeepLink(null);
        setPayloadId(null);
        setAppStoreLink(null);
        setDebugLogs([]);
        setIsConnecting(false);
        localStorage.removeItem('xaman_payload_id');
        
        // Connect and navigate
        onConnect(status.account);
        navigate('#/dashboard');
        return { success: true, account: status.account };
      }

      // Still waiting for signature
      addDebugLog('Account not yet signed, waiting for signature...');
      return { success: false, reason: 'pending' };
      
    } catch (err) {
      console.error('❌ Redirect handling failed:', err);
      addDebugLog(`Redirect error: ${err.message}`);
      return { success: false, reason: 'error', error: err.message };
    }
  }, [payloadId, onConnect, addDebugLog, navigate]);

  useEffect(() => {
    let redirectCheckInterval;
    let retryCount = 0;
    const MAX_RETRIES = 30; // 60 seconds total with 2-second interval
    
    const checkAndHandleRedirect = async () => {
      try {
        // Check for signed=true in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const isSignedReturn = urlParams.get('signed') === 'true';
        
        if (isSignedReturn) {
          addDebugLog('Detected signed=true in URL, handling return...');
          
          // Get the payload ID from localStorage
          const storedPayloadId = localStorage.getItem('xaman_payload_id');
          if (!storedPayloadId) {
            addDebugLog('No stored payload ID found, checking for existing connection...');
            const connected = await checkConnection();
            if (connected) {
              // Clean up URL and clear interval if we're already connected
              window.history.replaceState({}, document.title, window.location.pathname + '#/dashboard');
              if (redirectCheckInterval) {
                clearInterval(redirectCheckInterval);
              }
              return;
            }
          }

          if (storedPayloadId) {
            addDebugLog(`Found stored payload ID: ${storedPayloadId}`);
            setPayloadId(storedPayloadId);
            
            // Try to handle the redirect
            const result = await handleRedirect();
            addDebugLog(`Redirect result: ${JSON.stringify(result)}`);
            
            if (result.success) {
              // Clean up the URL and clear the interval if successful
              window.history.replaceState({}, document.title, window.location.pathname + '#/dashboard');
              if (redirectCheckInterval) {
                clearInterval(redirectCheckInterval);
              }
              return;
            }

            // Handle different failure reasons
            retryCount++;
            if (retryCount >= MAX_RETRIES || 
                ['expired', 'rejected', 'error'].includes(result.reason)) {
              addDebugLog(`Stopping retries: ${result.reason}`);
              clearInterval(redirectCheckInterval);
              
              // Show appropriate error message
              switch (result.reason) {
                case 'expired':
                  setError('Connection request expired. Please try again.');
                  break;
                case 'rejected':
                  setError('Connection request was rejected.');
                  break;
                case 'error':
                  setError(`Connection failed: ${result.error}`);
                  break;
                default:
                  setError('Connection timed out. Please try again.');
              }
              
              // Clean up states
              setIsConnecting(false);
              setQrCode(null);
              setDeepLink(null);
              setPayloadId(null);
              localStorage.removeItem('xaman_payload_id');
              
              // Redirect to home page on failure
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } else {
          addDebugLog('No signed parameter, checking existing connection...');
          const connected = await checkConnection();
          if (connected) {
            clearInterval(redirectCheckInterval);
          }
        }
      } catch (error) {
        addDebugLog(`Error in checkAndHandleRedirect: ${error.message}`);
        console.error('Check and handle redirect error:', error);
      }
    };

    // Initial check - wrap in try/catch to prevent uncaught errors
    try {
      checkAndHandleRedirect();
    } catch (error) {
      console.error('Initial redirect check error:', error);
    }
    
    // Set up interval to keep checking (will be cleared on success)
    redirectCheckInterval = setInterval(() => {
      try {
        checkAndHandleRedirect();
      } catch (error) {
        console.error('Interval redirect check error:', error);
      }
    }, 2000);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        addDebugLog('Page became visible, checking connection status...');
        try {
          checkAndHandleRedirect();
        } catch (error) {
          console.error('Visibility change handler error:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => {
      try {
        checkAndHandleRedirect();
      } catch (error) {
        console.error('Focus handler error:', error);
      }
    });

    return () => {
      if (redirectCheckInterval) {
        clearInterval(redirectCheckInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkAndHandleRedirect);
    };
  }, [checkConnection, handleRedirect, addDebugLog]);

  const connectWallet = async () => {
    // Don't create a new sign request if we're already connecting
    if (isConnecting || payloadId) {
      addDebugLog('Already connecting or have an active payload, skipping...');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setAppStoreLink(null);
      setDebugLogs([]); // Clear previous logs

      // Clear any existing connection state
      await xamanService.disconnect();
      setQrCode(null);
      setDeepLink(null);
      setPayloadId(null);

      addDebugLog('Creating sign request...');
      const signRequest = await xamanService.createSignRequest();
      addDebugLog(`Sign request created: ${JSON.stringify(signRequest, null, 2)}`);

      if (!signRequest.success) {
        throw new Error(signRequest.error || 'Failed to create sign request');
      }

      // Store payload ID in both state and localStorage
      localStorage.setItem('xaman_payload_id', signRequest.payloadId);
      setPayloadId(signRequest.payloadId);
      addDebugLog(`Payload ID set and stored: ${signRequest.payloadId}`);

      // Create a reference for the polling interval
      let pollInterval;

      // Start polling for payload status
      pollInterval = setInterval(async () => {
        try {
          const status = await xamanService.getPayloadStatus(signRequest.payloadId);
          addDebugLog(`Poll status: ${JSON.stringify(status)}`);
          
          if (status.success) {
            if (status.account) {
              clearInterval(pollInterval);
              onConnect(status.account);
              setQrCode(null);
              setDeepLink(null);
              setPayloadId(null);
              setAppStoreLink(null);
              setIsConnecting(false);
              // Navigate using hash routing
              navigate('#/dashboard');
            } else if (status.error) {
              clearInterval(pollInterval);
              throw new Error(status.error);
            }
          }
        } catch (error) {
          addDebugLog(`Poll error: ${error.message}`);
          clearInterval(pollInterval);
          setError('Connection failed. Please try again.');
          setIsConnecting(false);
        }
      }, 2000);

      // Clear polling after 10 minutes (matching the increased expiry time)
      setTimeout(() => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        if (!walletAddress) {
          setError('Connection request expired');
          setQrCode(null);
          setDeepLink(null);
          setPayloadId(null);
          setAppStoreLink(null);
          setIsConnecting(false);
        }
      }, 10 * 60 * 1000);

      if (isMobile) {
        if (!signRequest.deepLink) {
          throw new Error('No deep link available from API');
        }
        
        addDebugLog(`Opening mobile deep link: ${signRequest.deepLink}`);
        // Add a small delay before opening the deep link to ensure state is updated
        setTimeout(() => {
          window.location.href = signRequest.deepLink;
        }, 100);
      } else {
        // Desktop flow with QR code
        setQrCode(signRequest.qrUrl);
        setDeepLink(signRequest.deepLink);
      }
    } catch (error) {
      addDebugLog(`Error: ${error.message}`);
      setError(error.message);
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await xamanService.disconnect();
      onDisconnect();
      setQrCode(null);
      setDeepLink(null);
      setPayloadId(null);
      setError(null);
      setAppStoreLink(null);
    } catch (error) {
      console.error('❌ Wallet disconnect failed:', error);
      setError('Failed to disconnect wallet');
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="wallet-connect-container">
      <h2>Connect Your Wallet</h2>
      <p className="helper-text">
        Connect your XRP wallet to start staking your NFTs and tokens.
      </p>
      
      {/* Debug logs section for mobile */}
      {isMobile && debugLogs.length > 0 && (
        <div className="debug-logs" style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <h4 style={{ marginBottom: '10px', color: '#ffd700' }}>Debug Logs:</h4>
          {debugLogs.map((log, index) => (
            <div key={index} style={{ 
              borderBottom: '1px solid #333',
              padding: '5px 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {!walletAddress && !qrCode && !appStoreLink && (
        <div className="info-box">
          <h4>Getting Started</h4>
          <p>To participate in staking, you'll need:</p>
          <ul>
            <li>A Xaman wallet</li>
            <li>Some XRP for transaction fees</li>
            <li>CULT NFTs or tokens to stake</li>
          </ul>
        </div>
      )}

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {appStoreLink && (
        <div className="app-store-prompt">
          <p>Install Xaman Wallet to continue</p>
          <a 
            href={appStoreLink}
            className="app-store-button"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Xaman
          </a>
          <button 
            onClick={() => setAppStoreLink(null)} 
            className="retry-button"
          >
            I've installed Xaman
          </button>
        </div>
      )}

      {qrCode && !isMobile && (
        <div className="qr-container">
          <img src={qrCode} alt="Scan with Xaman" className="qr-code" />
          <p>Scan this QR code with your Xaman wallet</p>
          {deepLink && (
            <a 
              href={deepLink}
              className="deep-link-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Xaman
            </a>
          )}
        </div>
      )}

      {walletAddress ? (
        <div className="wallet-info">
          <p className="wallet-address">
            Connected: {formatAddress(walletAddress)}
          </p>
          <a 
            href={xamanService.getAccountUrl(walletAddress)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="explorer-link"
          >
            View in Explorer
          </a>
          <button onClick={disconnectWallet} className="disconnect-button">
            Disconnect
          </button>
        </div>
      ) : (
        <div className="connect-container">
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="connect-button"
          >
            {isConnecting ? 'Connecting...' : 'Connect with Xaman'}
          </button>
          {!isMobile && !appStoreLink && (
            <div className="help-links">
              <a 
                href="https://xaman.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="help-link"
              >
                Get Xaman Wallet
              </a>
              <a 
                href="https://xrpl.org/docs.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="help-link"
              >
                Learn More
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
