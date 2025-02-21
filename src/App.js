import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { connectToXRPL, disconnectFromXRPL } from './services/XRPLService';
import xamanService from './services/XamanService';
import WalletConnect from './components/WalletConnect';
import Staking from './components/Staking';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import Notification from './components/Notification';
import './styles/app.css';

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const checkWalletConnection = useCallback(async () => {
    try {
      const address = await xamanService.getConnectedAddress();
      if (address && !walletAddress) {  // Only show notification if wallet wasn't connected before
        setWalletAddress(address);
        showNotification('Wallet connected successfully', 'success');
        // Clean up URL only after successful connection
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (address) {
        setWalletAddress(address);  // Just update the address without notification
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
    }
  }, [walletAddress, showNotification]);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        // Initialize XRPL connection with retries
        let retries = 3;
        let connected = false;
        
        while (retries > 0 && !connected && mounted) {
          try {
            connected = await connectToXRPL();
            if (connected) break;
          } catch (err) {
            console.error('XRPL connection attempt failed:', err);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between retries
            }
          }
        }

        if (!connected && mounted) {
          showNotification('Failed to connect to XRPL network. Please refresh the page.', 'error');
          return;
        }

        // Check URL parameters for connection status
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('signed') === 'true' && mounted) {
          await checkWalletConnection();
        } else if (mounted) {
          // Only check for existing connection if not coming from sign flow
          await checkWalletConnection();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        if (mounted) {
          showNotification('Failed to initialize app: ' + (error.message || 'Unknown error'), 'error');
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      disconnectFromXRPL();
    };
  }, [checkWalletConnection, showNotification]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleWalletConnect = (address) => {
    setWalletAddress(address);
    showNotification('Wallet connected successfully', 'success');
  };

  const handleWalletDisconnect = async () => {
    try {
      await xamanService.disconnect();
      setWalletAddress(null);
      showNotification('Wallet disconnected', 'info');
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Disconnect error:', error);
      showNotification('Failed to disconnect wallet', 'error');
    }
  };

  const handleStakeNFT = async (nftId) => {
    try {
      // Implementation in XRPLService.js
      showNotification('NFT staked successfully', 'success');
    } catch (error) {
      showNotification('Failed to stake NFT', 'error');
    }
  };

  const handleUnstakeNFT = async (nftId) => {
    try {
      // Implementation in XRPLService.js
      showNotification('NFT unstaked successfully', 'success');
    } catch (error) {
      showNotification('Failed to unstake NFT', 'error');
    }
  };

  const getProfileInitial = (address) => {
    return address ? address.charAt(0).toUpperCase() : '?';
  };

  if (isInitializing) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing app...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {walletAddress && (
          <nav className="app-nav">
            <div className="nav-links">
              <button
                className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`nav-button ${activeTab === 'staking' ? 'active' : ''}`}
                onClick={() => setActiveTab('staking')}
              >
                Stake NFTs
              </button>
              <button
                className={`nav-button ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button
                className={`nav-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('leaderboard')}
              >
                Leaderboard
              </button>
            </div>
            
            <div className="profile-menu" ref={menuRef}>
              <div 
                className="profile-image"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title={walletAddress}
              >
                {getProfileInitial(walletAddress)}
              </div>
              {isMenuOpen && (
                <div className="menu-dropdown">
                  <div className="menu-item">
                    <i className="fas fa-wallet"></i>
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </div>
                  <div 
                    className="menu-item disconnect"
                    onClick={handleWalletDisconnect}
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    Disconnect
                  </div>
                </div>
              )}
            </div>
          </nav>
        )}

        <main className="app-main">
          {!walletAddress ? (
            <WalletConnect
              onConnect={handleWalletConnect}
              onDisconnect={handleWalletDisconnect}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard walletAddress={walletAddress} />
              )}
              {activeTab === 'staking' && (
                <Staking
                  walletAddress={walletAddress}
                  onStakeNFT={handleStakeNFT}
                  onUnstakeNFT={handleUnstakeNFT}
                />
              )}
              {activeTab === 'profile' && (
                <Profile walletAddress={walletAddress} />
              )}
              {activeTab === 'leaderboard' && <Leaderboard />}
            </>
          )}
        </main>

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
