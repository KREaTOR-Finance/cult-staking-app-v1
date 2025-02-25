import React, { useState, useEffect, useCallback } from 'react';
import { useXRPL } from '../hooks/useXRPL';
import { fetchAllCultNFTs } from '../services/XRPLService';
import ProfileImage from './ProfileImage';
import '../styles/app.css';

const Profile = ({ walletAddress }) => {
    const { userStats, selectedPFP, pfpMetadata, updatePFP, clearPFP, loading, error } = useXRPL();
    const [cultNFTs, setCultNFTs] = useState([]);
    const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
    const [notification, setNotification] = useState(null);
    const [localSelectedPFP, setLocalSelectedPFP] = useState(selectedPFP);
    
    // Update local state when selectedPFP changes
    useEffect(() => {
        setLocalSelectedPFP(selectedPFP);
    }, [selectedPFP]);
    
    // Load all NFTs for this wallet
    const loadNFTs = useCallback(async () => {
        if (!walletAddress) return;
        
        setIsLoadingNFTs(true);
        try {
            const nfts = await fetchAllCultNFTs(walletAddress);
            
            if (nfts && Array.isArray(nfts)) {
                setCultNFTs(nfts);
            } else {
                setCultNFTs([]);
            }
        } catch (err) {
            console.error('Error loading NFTs in Profile:', err);
            setNotification({
                type: 'error',
                message: 'Failed to load your NFTs. Please try again later.'
            });
            
            setTimeout(() => {
                setNotification(null);
            }, 3000);
        } finally {
            setIsLoadingNFTs(false);
        }
    }, [walletAddress]);
    
    useEffect(() => {
        loadNFTs();
    }, [loadNFTs]);
    
    // Handle selecting a new PFP with immediate UI update
    const handleSelectPFP = useCallback((nft) => {
        try {
            // Check if this is a custom uploaded image
            const isCustomUpload = nft.id && nft.id.startsWith('custom_');
            
            // Update local state immediately for responsive UI
            setLocalSelectedPFP(nft.id);
            
            // Show notification immediately
            setNotification({
                type: 'success',
                message: `${isCustomUpload ? 'Custom image' : nft.name} set as profile picture`
            });
            
            // Attempt to update in the background
            updatePFP(nft.id, walletAddress, nft)
                .then(success => {
                    if (!success) {
                        console.error('Failed to update PFP in storage');
                        // Only show error if update fails
                        setNotification({
                            type: 'error',
                            message: 'Failed to save profile picture selection'
                        });
                    }
                })
                .catch(e => {
                    console.error('Error in updatePFP:', e);
                    setNotification({
                        type: 'error',
                        message: 'Error setting profile picture'
                    });
                })
                .finally(() => {
                    // Clear notification after delay
                    setTimeout(() => {
                        setNotification(null);
                    }, 3000);
                });
        } catch (e) {
            console.error('Error in handleSelectPFP:', e);
            setNotification({
                type: 'error',
                message: 'Error setting profile picture'
            });
            setTimeout(() => setNotification(null), 3000);
        }
    }, [updatePFP, walletAddress]);
    
    // Find selected NFT in available NFTs
    const selectedNFT = localSelectedPFP ? cultNFTs.find(nft => nft.id === localSelectedPFP) : null;
    
    // If NFT not found in available NFTs, use stored metadata
    const nftToDisplay = selectedNFT || pfpMetadata;

    if (loading) return <div className="loading">Loading profile data...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!walletAddress) return <div className="error">Please connect your wallet to view your profile</div>;

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };
    
    const handleClearPFP = () => {
        // Update local state immediately
        setLocalSelectedPFP(null);
        
        // Show notification
        setNotification({
            type: 'info',
            message: 'Profile picture cleared'
        });
        
        // Clear in background
        clearPFP();
        
        setTimeout(() => setNotification(null), 3000);
    };

    return (
        <div className="profile-container">
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
            
            <div className="profile-header">
                <div className="profile-pfp">
                    <ProfileImage 
                        walletAddress={walletAddress} 
                        size="large" 
                    />
                </div>
                
                <div className="profile-info">
                    <h2>Profile</h2>
                    <p className="wallet-address">{formatAddress(walletAddress)}</p>
                    {userStats.hasInnerCircle && (
                        <span className="inner-circle-badge">Inner Circle Member</span>
                    )}
                    {nftToDisplay && (
                        <div className="nft-details">
                            <h3>{nftToDisplay.name}</h3>
                            {nftToDisplay.isInnerCircle && (
                                <span className="inner-circle-tag">Inner Circle NFT</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="profile-stats">
                <div className="stat-card">
                    <h3>Total Staked</h3>
                    <p>{userStats.totalStaked || 0} NFTs</p>
                </div>
                <div className="stat-card">
                    <h3>Total Rewards</h3>
                    <p>{userStats.totalRewards?.toFixed(2) || "0.00"} CULT</p>
                </div>
                <div className="stat-card">
                    <h3>Staking Rank</h3>
                    <p>#{userStats.stakingRank || "N/A"}</p>
                </div>
            </div>

            <div className="profile-actions">
                {localSelectedPFP && (
                    <button className="clear-pfp-button" onClick={handleClearPFP}>
                        Clear Profile Picture
                    </button>
                )}
            </div>
            
            <h3 className="section-title">Your NFTs</h3>
            
            {isLoadingNFTs ? (
                <div className="loading">Loading your NFTs...</div>
            ) : (
                <div className="nft-grid">
                    {cultNFTs.length > 0 ? (
                        cultNFTs.map((nft) => (
                            <div 
                                key={nft.id} 
                                className={`nft-card ${localSelectedPFP === nft.id ? 'selected' : ''}`}
                            >
                                <div className="nft-image-container">
                                    <img 
                                        src={nft.image || '/placeholder.png'} 
                                        alt={nft.name || "NFT"}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/placeholder.png';
                                        }}
                                        loading="lazy"
                                    />
                                    {localSelectedPFP === nft.id && (
                                        <div className="selected-overlay">
                                            <span>✓</span>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    className="select-pfp-button"
                                    onClick={() => handleSelectPFP(nft)}
                                    disabled={localSelectedPFP === nft.id}
                                >
                                    {localSelectedPFP === nft.id ? 'Current PFP' : 'Set as PFP'}
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="no-nfts-message">
                            No NFTs found in your wallet or staked.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Profile; 