import React, { useState, useEffect, useCallback } from 'react';
import xamanService from '../services/XamanService';

const WalletConnect = ({ onConnect, onDisconnect, walletAddress }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [deepLink, setDeepLink] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile] = useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [payloadId, setPayloadId] = useState(null);

  // Check existing connection
  const checkConnection = useCallback(async () => {
    try {
      const address = await xamanService.getConnectedAddress();
      if (address) {
        onConnect(address);
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ Connection check failed:', err);
      return false;
    }
  }, [onConnect]);

  // Handle redirect after mobile sign
  const handleRedirect = useCallback(async () => {
    if (payloadId) {
      try {
        const status = await xamanService.getPayloadStatus(payloadId);
        if (status.success && status.account) {
          onConnect(status.account);
          setQrCode(null);
          setDeepLink(null);
          setPayloadId(null);
        }
      } catch (err) {
        console.error('❌ Redirect handling failed:', err);
      }
    }
  }, [payloadId, onConnect]);

  useEffect(() => {
    // Check for signed=true in URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('signed') === 'true') {
      handleRedirect();
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      checkConnection();
    }

    // Handle page visibility changes (for mobile app returns)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleRedirect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleRedirect);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleRedirect);
    };
  }, [checkConnection, handleRedirect]);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const signRequest = await xamanService.createSignRequest();

      if (!signRequest.success) {
        throw new Error(signRequest.error || 'Failed to create sign request');
      }

      setQrCode(signRequest.qrUrl);
      setDeepLink(signRequest.deepLink);
      setPayloadId(signRequest.payloadId);

      if (isMobile && signRequest.deepLink) {
        // Store payload ID before redirect
        localStorage.setItem('xaman_pending_payload', signRequest.payloadId);
        window.location.href = signRequest.deepLink;
      }

      // Start polling for payload status
      const pollInterval = setInterval(async () => {
        try {
          const status = await xamanService.getPayloadStatus(signRequest.payloadId);
          if (status.success && status.account) {
            clearInterval(pollInterval);
            onConnect(status.account);
            setQrCode(null);
            setDeepLink(null);
            setPayloadId(null);
          }
        } catch (error) {
          console.error('Failed to check payload status:', error);
        }
      }, 2000); // Check every 2 seconds

      // Clear polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!walletAddress) {
          setError('Connection request expired');
          setQrCode(null);
          setDeepLink(null);
          setPayloadId(null);
        }
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
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
      
      {!walletAddress && !qrCode && (
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
          {!isMobile && (
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
