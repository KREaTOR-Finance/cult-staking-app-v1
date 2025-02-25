import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllCultNFTs } from '../services/XRPLService';
import { useXRPL } from '../hooks/useXRPL';
import '../styles/app.css';

const Staking = ({ walletAddress }) => {
    const { selectedPFP } = useXRPL();
    const [cultNFTs, setCultNFTs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [maxRetries] = useState(3);
    const [autoRetrying, setAutoRetrying] = useState(false);
    const [activeStakingNFT, setActiveStakingNFT] = useState(null);
    const [showStakingPopup, setShowStakingPopup] = useState(false);
    
    const loadNFTs = useCallback(async () => {
        if (!walletAddress) {
            console.log('No wallet address provided');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setAutoRetrying(false);
        
        try {
            console.log('Fetching NFTs for wallet:', walletAddress);
            console.log('Retry attempt:', retryCount);
            
            const nfts = await fetchAllCultNFTs(walletAddress);
            console.log('Fetched CULT NFTs:', nfts);
            
            if (nfts.length > 0) {
                const sortedNFTs = nfts.sort((a, b) => {
                    try {
                        const numA = parseInt(a.name.split('#')[1] || '0');
                        const numB = parseInt(b.name.split('#')[1] || '0');
                        return numA - numB;
                    } catch (e) {
                        return 0;
                    }
                });
                
                setCultNFTs(sortedNFTs);
                setError(null);
            } else {
                setCultNFTs([]);
            }
        } catch (err) {
            console.error('Error loading NFTs:', err);
            setError(`Failed to load NFTs. ${err.message || 'Please try again.'}`);
            
            if (err.message && err.message.includes('connection') && retryCount < maxRetries && !autoRetrying) {
                setAutoRetrying(true);
                const timeoutId = setTimeout(() => {
                    setRetryCount(prevCount => prevCount + 1);
                }, 3000);
                
                return () => clearTimeout(timeoutId);
            }
        } finally {
            setIsLoading(false);
        }
    }, [walletAddress, retryCount, maxRetries, autoRetrying]);

    useEffect(() => {
        let isMounted = true;
        const timeoutRef = { current: null };
        
        const initLoad = async () => {
            if (isMounted) {
                await loadNFTs();
            }
        };
        
        initLoad();
        
        return () => {
            isMounted = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [loadNFTs]);

    const handleRetry = useCallback(() => {
        setRetryCount(prevCount => prevCount + 1);
    }, []);

    const handleStakeNFT = useCallback((nft) => {
        setActiveStakingNFT(nft);
        setShowStakingPopup(true);
    }, []);

    const closeStakingPopup = useCallback(() => {
        setShowStakingPopup(false);
        setActiveStakingNFT(null);
    }, []);

    const confirmStaking = useCallback((stakingPeriod) => {
        try {
            // This would call the actual staking function
            // Example: stakeNFT(activeStakingNFT.id, walletAddress, stakingPeriod);
            
            setNotification({
                type: 'success',
                message: `${activeStakingNFT.name} staked successfully for ${stakingPeriod} days`
            });
            
            setTimeout(() => {
                setNotification(null);
            }, 3000);
            
            closeStakingPopup();
            
            // Refresh NFT list after staking
            loadNFTs();
        } catch (e) {
            console.error('Error in confirmStaking:', e);
            setNotification({
                type: 'error',
                message: 'Error staking NFT'
            });
            setTimeout(() => setNotification(null), 3000);
        }
    }, [activeStakingNFT, closeStakingPopup, loadNFTs]);

    if (!walletAddress) {
        return (
            <div className="staking-container">
                <div className="nft-list">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        Please connect your wallet to view your NFTs
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="staking-container">
                <div className="nft-list">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="loading-spinner"></div>
                        <div style={{ marginTop: '1rem' }}>Loading your NFTs...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="staking-container">
                <div className="nft-list">
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)' }}>
                        {error}
                        {autoRetrying ? (
                            <div style={{ marginTop: '1rem' }}>
                                <div className="loading-spinner"></div>
                                <div style={{ marginTop: '1rem' }}>
                                    Auto-retrying... ({retryCount}/{maxRetries})
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={handleRetry} 
                                className="retry-button"
                                style={{ 
                                    display: 'block', 
                                    margin: '1rem auto',
                                    padding: '0.5rem 1.5rem',
                                    background: 'var(--primary)',
                                    color: 'var(--background-dark)',
                                    border: 'none',
                                    borderRadius: 'var(--radius)',
                                    cursor: 'pointer'
                                }}
                            >
                                Retry Loading NFTs
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="staking-container">
            {notification && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                    <span 
                        style={{ marginLeft: '10px', cursor: 'pointer', fontSize: '16px' }}
                        onClick={() => setNotification(null)}
                    >
                        ×
                    </span>
                </div>
            )}
            
            {showStakingPopup && activeStakingNFT && (
                <div className="staking-popup-overlay">
                    <div className="staking-popup">
                        <div className="staking-popup-header">
                            <h3>Stake NFT: {activeStakingNFT.name}</h3>
                            <span 
                                className="close-popup"
                                onClick={closeStakingPopup}
                            >×</span>
                        </div>
                        <div className="staking-popup-content">
                            <div className="staking-nft-preview">
                                <img 
                                    src={activeStakingNFT.image || '/placeholder.png'} 
                                    alt={activeStakingNFT.name}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/placeholder.png';
                                    }}
                                />
                            </div>
                            <div className="staking-options">
                                <p>Choose staking period:</p>
                                <div className="staking-buttons">
                                    <button onClick={() => confirmStaking(30)}>30 Days</button>
                                    <button onClick={() => confirmStaking(60)}>60 Days</button>
                                    <button onClick={() => confirmStaking(90)}>90 Days</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="nft-list">
                {cultNFTs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        No CULT NFTs found in your wallet
                    </div>
                ) : (
                    cultNFTs.map((nft) => (
                        <div key={nft.id} className={`nft-list-item ${selectedPFP === nft.id ? 'selected-pfp' : ''}`}>
                            <div className="nft-icon">
                                <img 
                                    src={nft.image || '/placeholder.png'} 
                                    alt={nft.name}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/placeholder.png';
                                    }}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: '8px'
                                    }}
                                />
                                {selectedPFP === nft.id && (
                                    <div className="selected-pfp-indicator">
                                        <span className="pfp-check">✓</span>
                                    </div>
                                )}
                            </div>
                            <div className="nft-info">
                                <div className="nft-number">{nft.name.split('#')[1]}</div>
                                <div className="nft-id" style={{ fontSize: '0.7rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis' }}>{nft.id}</div>
                            </div>
                            <button 
                                className="stake-nft-button"
                                onClick={() => handleStakeNFT(nft)}
                            >
                                Stake NFT
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Staking; 