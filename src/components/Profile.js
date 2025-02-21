import React from 'react';
import { useXRPL } from '../hooks/useXRPL';
import '../styles/app.css';

const Profile = () => {
    const { userStats, stakedNFTs, selectedPFP, updatePFP, loading, error } = useXRPL();

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    const formatAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <div className="profile-pfp">
                    {selectedPFP ? (
                        <img 
                            src={stakedNFTs.find(nft => nft.id === selectedPFP)?.image} 
                            alt="Profile" 
                        />
                    ) : (
                        <div className="default-pfp">Select PFP</div>
                    )}
                </div>
                
                <div className="profile-info">
                    <h2>Profile</h2>
                    <p className="wallet-address">{formatAddress(userStats.address)}</p>
                    {userStats.hasInnerCircle && (
                        <span className="inner-circle-badge">Inner Circle Member</span>
                    )}
                </div>
            </div>

            <div className="profile-stats">
                <div className="stat-card">
                    <h3>Total Staked</h3>
                    <p>{userStats.totalStaked} NFTs</p>
                </div>
                <div className="stat-card">
                    <h3>Total Rewards</h3>
                    <p>{userStats.totalRewards.toFixed(2)} CULT</p>
                </div>
                <div className="stat-card">
                    <h3>Staking Rank</h3>
                    <p>#{userStats.stakingRank}</p>
                </div>
            </div>

            <div className="pfp-selection">
                <h3>Choose Profile Picture</h3>
                <div className="nft-grid">
                    {stakedNFTs.map((nft) => (
                        <div 
                            key={nft.id} 
                            className={`nft-card ${selectedPFP === nft.id ? 'selected' : ''}`}
                            onClick={() => updatePFP(nft.id)}
                        >
                            <img src={nft.image} alt={nft.name} />
                            <h4>{nft.name}</h4>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Profile; 