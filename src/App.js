import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { connectToXRPL, disconnectFromXRPL } from './services/XRPLService';
import xamanService from './services/XamanService';
import * as StorageService from './services/StorageService';
import WalletConnect from './components/WalletConnect';
import Staking from './components/Staking';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import Notification from './components/Notification';
import ProfileImage from './components/ProfileImage';
import NetworkStatus from './components/NetworkStatus';
import './styles/app.css';

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [xrplConnected, setXrplConnected] = useState(false);
  const menuRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectedRef = useRef(false);
  const walletCheckFailCountRef = useRef(0); // Track consecutive wallet check failures
  const lastWalletAddressRef = useRef(null); // Keep track of the last valid wallet address
  const walletConnectionCheckRef = useRef(null); // Reference to the wallet check interval

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const checkWalletConnection = useCallback(async () => {
    try {
      if (isInitializing) return;
      
      const address = await xamanService.getConnectedAddress();
      
      if (address) {
        walletCheckFailCountRef.current = 0;
        
        lastWalletAddressRef.current = address;
        
        if (!walletAddress) {
          setWalletAddress(address);
          window.history.replaceState({}, document.title, window.location.pathname);
          
          StorageService.saveWalletAddress(address);
          
          const savedPFP = StorageService.getSelectedPFP(address);
          if (savedPFP) {
            const metadata = StorageService.getSelectedPFPMetadata(address);
            if (metadata && metadata.image) {
              try {
                localStorage.setItem(`pfp_img_cache_${savedPFP}`, metadata.image);
                sessionStorage.setItem(`pfp_img_cache_${savedPFP}`, metadata.image);
                
                const img = new Image();
                img.src = metadata.image;
              } catch (e) {
                console.error('Error pre-caching profile image:', e);
              }
            }
          }
          
          showNotification('Wallet connected successfully', 'success');
        } else if (walletAddress !== address) {
          setWalletAddress(address);
          StorageService.saveWalletAddress(address);
        }
      } else if (walletAddress) {
        const storedAccount = localStorage.getItem('xaman_account');
        const timestamp = localStorage.getItem('xaman_connection_timestamp');
        
        if (storedAccount && timestamp) {
          walletCheckFailCountRef.current++;
          
          console.log(`Wallet connection check failed (${walletCheckFailCountRef.current}/3) but credentials exist - not disconnecting yet`);
          
          if (walletCheckFailCountRef.current < 3) {
            return;
          }
          
          console.log('Multiple consecutive wallet check failures - disconnecting');
        }
        
        setWalletAddress(null);
        lastWalletAddressRef.current = null;
        walletCheckFailCountRef.current = 0;
        showNotification('Wallet disconnected', 'info');
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
      
      walletCheckFailCountRef.current++;
      
      if (walletCheckFailCountRef.current >= 3) {
        console.log('Multiple consecutive wallet check errors - disconnecting');
        setWalletAddress(null);
        lastWalletAddressRef.current = null;
        walletCheckFailCountRef.current = 0;
        showNotification('Wallet connection lost after multiple failures', 'error');
      }
    } finally {
      setIsInitializing(false);
    }
  }, [walletAddress, showNotification, isInitializing]);

  const attemptReconnect = useCallback(async () => {
    clearTimeout(reconnectTimeoutRef.current);
    
    if (connectionAttempts > 10) {
      console.log('Maximum reconnection attempts reached. Please refresh the page.');
      return;
    }
    
    try {
      if (connectionAttempts < 3) {
        console.log('Attempting to reconnect to XRPL...');
      }
      
      const connected = await connectToXRPL();
      if (connected) {
        console.log('Successfully reconnected to XRPL');
        setXrplConnected(true);
        isConnectedRef.current = true;
        showNotification('XRPL connection restored', 'success');
        
        setConnectionAttempts(0);
        
        checkWalletConnection();
      } else {
        const delay = Math.min(5000 * Math.pow(1.5, connectionAttempts), 30000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setConnectionAttempts(prev => prev + 1);
          attemptReconnect();
        }, delay);
      }
    } catch (error) {
      console.error('Error during XRPL reconnection attempt:', error);
      
      const delay = Math.min(5000 * Math.pow(1.5, connectionAttempts), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionAttempts(prev => prev + 1);
        attemptReconnect();
      }, delay);
    }
  }, [connectionAttempts, showNotification, checkWalletConnection]);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        // First try to restore the wallet address from storage
        const savedWalletAddress = StorageService.getWalletAddress();
        if (savedWalletAddress && mounted) {
          // Set the last valid address reference
          lastWalletAddressRef.current = savedWalletAddress;
          setWalletAddress(savedWalletAddress);
          
          // Pre-load profile image if available
          const savedPFP = StorageService.getSelectedPFP(savedWalletAddress);
          if (savedPFP) {
            const metadata = StorageService.getSelectedPFPMetadata(savedWalletAddress);
            if (metadata && metadata.image) {
              try {
                // Try to pre-cache the image, but don't fail if it doesn't work
                try {
                  localStorage.setItem(`pfp_img_cache_${savedPFP}`, metadata.image);
                } catch (localStorageError) {
                  console.error('Error caching image in localStorage during init:', localStorageError);
                }
                
                try {
                  sessionStorage.setItem(`pfp_img_cache_${savedPFP}`, metadata.image);
                } catch (sessionStorageError) {
                  console.error('Error caching image in sessionStorage during init:', sessionStorageError);
                }
                
                // Prefetch the image
                const img = new Image();
                img.src = metadata.image;
              } catch (e) {
                console.error('Error pre-caching profile image during init:', e);
              }
            }
          }
        }
        
        // Try to connect to XRPL
        let retries = 3;
        let connected = false;
        
        while (retries > 0 && !connected && mounted) {
          try {
            connected = await connectToXRPL();
            if (connected) {
              setXrplConnected(true);
              break;
            }
          } catch (err) {
            console.error('XRPL connection attempt failed:', err);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        if (!connected && mounted) {
          setXrplConnected(false);
          showNotification('Failed to connect to XRPL network. Reconnecting in background...', 'warning');
          reconnectTimeoutRef.current = setTimeout(attemptReconnect, 5000);
        }

        // Handle return from signing
        const urlParams = new URLSearchParams(window.location.search);
        const isSignedReturn = urlParams.get('signed') === 'true';
        
        if (isSignedReturn && mounted) {
          const returnUrl = localStorage.getItem('returnUrl');
          
          // Check wallet connection but don't disconnect on failure during initialization
          try {
            const address = await xamanService.getConnectedAddress();
            if (address && mounted) {
              lastWalletAddressRef.current = address;
              setWalletAddress(address);
              StorageService.saveWalletAddress(address);
            }
          } catch (walletCheckError) {
            console.error('Error checking wallet during initialization:', walletCheckError);
          }
          
          if (returnUrl) {
            try {
              const url = new URL(returnUrl);
              if (url.hash) {
                window.location.hash = url.hash;
              } else {
                window.location.hash = '#/dashboard';
              }
            } catch (e) {
              console.error('Failed to parse return URL:', e);
              window.location.hash = '#/dashboard';
            }
            localStorage.removeItem('returnUrl');
          }
          
          const newUrl = window.location.origin + 
                        window.location.pathname + 
                        window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
        } else if (mounted) {
          // Check wallet connection but don't disconnect on failure during initialization
          try {
            const address = await xamanService.getConnectedAddress();
            if (address && mounted) {
              lastWalletAddressRef.current = address;
              setWalletAddress(address);
              StorageService.saveWalletAddress(address);
            }
          } catch (walletCheckError) {
            console.error('Error checking wallet during initialization:', walletCheckError);
          }
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
      if (walletConnectionCheckRef.current) {
        clearInterval(walletConnectionCheckRef.current);
        walletConnectionCheckRef.current = null;
      }
      clearTimeout(reconnectTimeoutRef.current);
      disconnectFromXRPL();
    };
  }, [checkWalletConnection, showNotification, attemptReconnect]);

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
    setTimeout(() => {
      setNotification({ message: 'Wallet connected successfully', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    }, 500);
  };

  const handleWalletDisconnect = async () => {
    try {
      setIsInitializing(true);
      
      // Clear all references and state
      lastWalletAddressRef.current = null;
      walletCheckFailCountRef.current = 0;
      
      // Clear any active intervals
      if (walletConnectionCheckRef.current) {
        clearInterval(walletConnectionCheckRef.current);
        walletConnectionCheckRef.current = null;
      }
      
      // Clear any reconnect timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Clear local storage and session storage
      localStorage.removeItem('walletAddress');
      sessionStorage.removeItem('walletAddress');
      localStorage.removeItem('profileImageUrl');
      sessionStorage.removeItem('profileImageUrl');
      
      // Disconnect from the wallet service
      const disconnectResult = await xamanService.disconnect();
      console.log('Disconnect result:', disconnectResult);
      
      // Update state
      setWalletAddress(null);
      setActiveTab('dashboard');
      showNotification('Wallet disconnected', 'info');
      
      // Force a page reload to ensure clean state
      // This is the most reliable way to ensure complete disconnection
      window.location.reload();
    } catch (error) {
      console.error('Disconnect error:', error);
      showNotification('Failed to disconnect wallet. Please refresh the page.', 'error');
      
      // Even if there's an error, try to clean up the state
      setWalletAddress(null);
      lastWalletAddressRef.current = null;
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStakeNFT = async (nftId) => {
    try {
      showNotification('NFT staked successfully', 'success');
    } catch (error) {
      showNotification('Failed to stake NFT', 'error');
    }
  };

  const handleUnstakeNFT = async (nftId) => {
    try {
      showNotification('NFT unstaked successfully', 'success');
    } catch (error) {
      showNotification('Failed to unstake NFT', 'error');
    }
  };

  useEffect(() => {
    let xrplConnectionCheck;
    
    if (!isInitializing) {
      // Clear any existing interval first
      if (walletConnectionCheckRef.current) {
        clearInterval(walletConnectionCheckRef.current);
      }
      
      // Check wallet connection less frequently (every 5 minutes instead of every minute)
      // This reduces the chances of disconnection due to temporary issues
      walletConnectionCheckRef.current = setInterval(() => {
        // Only check if we have a wallet address or had one previously
        if (walletAddress || lastWalletAddressRef.current) {
          checkWalletConnection();
        }
      }, 5 * 60 * 1000);
      
      xrplConnectionCheck = setInterval(async () => {
        try {
          const connected = await connectToXRPL();
          
          if (connected !== isConnectedRef.current) {
            isConnectedRef.current = connected;
            setXrplConnected(connected);
            
            if (!connected && !reconnectTimeoutRef.current) {
              reconnectTimeoutRef.current = setTimeout(attemptReconnect, 5000);
            } else if (connected) {
              if (!xrplConnected) {
                showNotification('XRPL connection restored', 'success');
              }
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
          }
        } catch (error) {
          console.error('Error checking XRPL connection:', error);
        }
      }, 60000);
    }
    
    return () => {
      if (walletConnectionCheckRef.current) {
        clearInterval(walletConnectionCheckRef.current);
        walletConnectionCheckRef.current = null;
      }
      clearInterval(xrplConnectionCheck);
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [checkWalletConnection, xrplConnected, attemptReconnect, showNotification, isInitializing, walletAddress]);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path.includes('/stake')) {
        setActiveTab('staking');
      } else if (path.includes('/profile')) {
        setActiveTab('profile');
      } else if (path.includes('/leaderboard')) {
        setActiveTab('leaderboard');
      } else {
        setActiveTab('dashboard');
      }
    };

    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigateToTab = (tab) => {
    setActiveTab(tab);
    
    let path = '/';
    switch(tab) {
      case 'staking':
        path = '/stake';
        break;
      case 'profile':
        path = '/profile';
        break;
      case 'leaderboard':
        path = '/leaderboard';
        break;
      default:
        path = '/dashboard';
    }
    
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  // Listen for disconnect events from XamanService
  useEffect(() => {
    const handleXamanDisconnect = (data) => {
      console.log('Received disconnect event from XamanService:', data);
      
      if (walletAddress) {
        // Only show notification if we were previously connected
        showNotification('Wallet connection ended', 'info');
        
        // Clean up state
        setWalletAddress(null);
        lastWalletAddressRef.current = null;
        walletCheckFailCountRef.current = 0;
        
        // Navigate to dashboard
        setActiveTab('dashboard');
      }
    };
    
    // Add event listener
    xamanService.addEventListener('disconnect', handleXamanDisconnect);
    
    // Cleanup
    return () => {
      xamanService.removeEventListener('disconnect', handleXamanDisconnect);
    };
  }, [walletAddress, showNotification]);

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
        {!xrplConnected && !isInitializing && (
          <div className="connection-warning">
            <div className="connection-warning-content">
              <i className="fas fa-exclamation-triangle"></i>
              <span>XRPL connection issue. Data may not be up to date.</span>
              <button onClick={attemptReconnect} className="reconnect-button">
                Reconnect
              </button>
            </div>
          </div>
        )}
        {walletAddress && (
          <nav className="app-nav">
            <div className="nav-links">
              <button
                className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => navigateToTab('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`nav-button ${activeTab === 'staking' ? 'active' : ''}`}
                onClick={() => navigateToTab('staking')}
              >
                Stake NFTs
              </button>
              <button
                className={`nav-button ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => navigateToTab('profile')}
              >
                Profile
              </button>
              <button
                className={`nav-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
                onClick={() => navigateToTab('leaderboard')}
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
                <ProfileImage walletAddress={walletAddress} size="small" />
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

        <NetworkStatus />
      </div>
    </Router>
  );
}

export default App;
