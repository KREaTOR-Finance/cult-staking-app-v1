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
    
    if (currentPayloadId) {
      try {
        addDebugLog(`Checking payload status after return. PayloadID: ${currentPayloadId}`);
        
        const status = await xamanService.getPayloadStatus(currentPayloadId);
        addDebugLog(`Return status: ${JSON.stringify(status, null, 2)}`);
        
        if (status.success) {
          if (status.account) {
            addDebugLog(`Successfully connected with account: ${status.account}`);
            onConnect(status.account);
            
            // Clear states
            setQrCode(null);
            setDeepLink(null);
            setPayloadId(null);
            setAppStoreLink(null);
            setDebugLogs([]);
            localStorage.removeItem('xaman_payload_id');
            
            navigate('#/dashboard');
          } else {
            addDebugLog('Account not yet signed, waiting for signature...');
          }
        } else {
          addDebugLog(`Invalid status response: ${JSON.stringify(status, null, 2)}`);
        }
      } catch (err) {
        console.error('❌ Redirect handling failed:', err);
        addDebugLog(`Redirect error: ${err.message}`);
        localStorage.removeItem('xaman_payload_id');
        setPayloadId(null);
      }
    } else {
      addDebugLog('No payload ID found for status check');
    }
  }, [payloadId, onConnect, addDebugLog, navigate]);

  useEffect(() => {
    // Check for signed=true in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const isSignedReturn = urlParams.get('signed') === 'true';
    
    if (isSignedReturn) {
      addDebugLog('Detected signed=true in URL, handling return...');
      // Clean up the URL first to prevent loops
      window.history.replaceState({}, document.title, window.location.pathname);
      handleRedirect();
    } else {
      addDebugLog('No signed parameter, checking existing connection...');
      checkConnection();
    }

    // Handle page visibility changes (for mobile app returns)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        addDebugLog('Page became visible, checking connection status...');
        handleRedirect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleRedirect);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleRedirect);
    };
  }, [checkConnection, handleRedirect, addDebugLog, navigate]);

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

      addDebugLog('Creating sign request...');
      const signRequest = await xamanService.createSignRequest();
      addDebugLog(`Sign request created: ${JSON.stringify(signRequest, null, 2)}`);

      if (!signRequest.success) {
        throw new Error(signRequest.error || 'Failed to create sign request');
      }

      setPayloadId(signRequest.payloadId);
      addDebugLog(`Payload ID set: ${signRequest.payloadId}`);

      // Start polling for payload status
      const pollInterval = setInterval(async () => {
        try {
          const status = await xamanService.getPayloadStatus(signRequest.payloadId);
          addDebugLog(`Poll status: ${JSON.stringify(status)}`);
          if (status.success && status.account) {
            clearInterval(pollInterval);
            onConnect(status.account);
            setQrCode(null);
            setDeepLink(null);
            setPayloadId(null);
            setAppStoreLink(null);
            // Navigate using React Router
            navigate('#/dashboard');
          }
        } catch (error) {
          addDebugLog(`Poll error: ${error.message}`);
        }
      }, 2000);

      // Clear polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!walletAddress) {
          setError('Connection request expired');
          setQrCode(null);
          setDeepLink(null);
          setPayloadId(null);
          setAppStoreLink(null);
        }
      }, 5 * 60 * 1000);

      if (isMobile) {
        if (!signRequest.deepLink) {
          throw new Error('No deep link available from API');
        }
        
        addDebugLog(`Opening mobile deep link: ${signRequest.deepLink}`);
        window.location.href = signRequest.deepLink;
      } else {
        // Desktop flow with QR code
        setQrCode(signRequest.qrUrl);
        setDeepLink(signRequest.deepLink);
      }
    } catch (error) {
      addDebugLog(`Error: ${error.message}`);
      setError(error.message);
    } finally {
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
