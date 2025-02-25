import React, { useState, useEffect, useCallback } from 'react';
import xamanService from '../services/XamanService';

const WalletConnect = ({ onConnect, onDisconnect, walletAddress }) => {
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
  }, []);

  // Handle redirect after mobile sign
  useEffect(() => {
    const handleReturn = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const isSignedReturn = urlParams.get('signed') === 'true';
        
        if (!isSignedReturn) return;

        const storedPayloadId = localStorage.getItem('xaman_payload_id');
        if (!storedPayloadId) {
          addDebugLog('No stored payload ID found');
          return;
        }

        addDebugLog('Checking connection status...');
        const status = await xamanService.getPayloadStatus(storedPayloadId);
        
        if (status.success && status.account) {
          addDebugLog('Successfully connected');
          
          // Clean up states
          localStorage.removeItem('xaman_payload_id');
          setPayloadId(null);
          setIsConnecting(false);
          setError(null);
          
          // Connect
          onConnect(status.account);
          
          // Clean up URL - preserve any existing hash
          const currentHash = window.location.hash || '#/dashboard';
          const baseUrl = window.location.href.split('?')[0];
          window.history.replaceState({}, document.title, baseUrl + currentHash);
        } else {
          addDebugLog('Connection not completed');
          setError('Please complete the connection in Xaman');
          setIsConnecting(false);
        }
      } catch (error) {
        console.error('Return handling error:', error);
        addDebugLog(`Error: ${error.message}`);
        setError('Connection failed. Please try again.');
        setIsConnecting(false);
      }
    };

    handleReturn();
  }, [onConnect, addDebugLog]);

  const connectWallet = async () => {
    if (isConnecting || payloadId) {
      addDebugLog('Already connecting or have active payload');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setDebugLogs([]);

      addDebugLog('Creating sign request...');
      const signRequest = await xamanService.createSignRequest();
      
      if (!signRequest.success) {
        throw new Error(signRequest.error || 'Failed to create sign request');
      }

      // Store payload ID
      localStorage.setItem('xaman_payload_id', signRequest.payloadId);
      setPayloadId(signRequest.payloadId);

      if (isMobile) {
        if (!signRequest.deepLink) {
          throw new Error('No deep link available');
        }
        
        addDebugLog('Preparing mobile deep link...');
        
        // Parse the original deep link
        const xamanUrl = new URL(signRequest.deepLink);
        
        // For development, use a custom scheme to handle return
        const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname.includes('192.168') ||
                            window.location.hostname.includes('127.0.0.1');
        
        let returnUrl;
        if (isDevelopment) {
          // Use a custom scheme for development
          returnUrl = `cultapp://callback?signed=true`;
          xamanUrl.searchParams.set('browserProtocol', 'cultapp');
        } else {
          // Production environment - use actual URL
          const baseUrl = window.location.origin + window.location.pathname;
          returnUrl = `${baseUrl}?signed=true`;
          xamanUrl.searchParams.set('browserProtocol', window.location.protocol.slice(0, -1));
        }
        
        xamanUrl.searchParams.set('returnTo', encodeURIComponent(returnUrl));
        
        addDebugLog(`Redirecting to Xaman with return URL: ${returnUrl}`);
        window.location.href = xamanUrl.toString();
        return;
      }

      // Desktop flow with QR code
      setQrCode(signRequest.qrUrl);
      setDeepLink(signRequest.deepLink);

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
