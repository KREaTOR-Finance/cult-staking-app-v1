import React, { useEffect, useState } from 'react';
import { fetchNFTPools, stakeNFTs, unlockNFTs, fetchUserNFTs } from './XRPLService';
import '../styles/app.css';

const NFTStakingPools = ({ walletAddress }) => {
  const [nftPools, setNFTPools] = useState([]);
  const [selectedNFTs, setSelectedNFTs] = useState([]);
  const [userNFTs, setUserNFTs] = useState([]);
  const [stakedNFTs, setStakedNFTs] = useState({});
  const [isStaking, setIsStaking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPool, setSelectedPool] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [poolsData, nftsData] = await Promise.all([
          fetchNFTPools(),
          fetchUserNFTs(walletAddress)
        ]);
        
        setNFTPools(poolsData);
        setUserNFTs(nftsData);
        
        const stakedTracker = {};
        poolsData.forEach(pool => {
          stakedTracker[pool.id] = [];
        });
        setStakedNFTs(stakedTracker);
      } catch (err) {
        console.error('Error loading NFT data:', err);
        setError('Failed to load NFT data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (walletAddress) {
      loadData();
    }
  }, [walletAddress]);

  const calculatePotentialRewards = (pool, nftCount) => {
    const dailyRewards = pool.rewardsPerDay * nftCount;
    const totalRewards = dailyRewards * pool.duration;
    return {
      daily: dailyRewards,
      total: totalRewards
    };
  };

  const handleNFTStake = async (pool) => {
    if (selectedNFTs.length === 0) {
      setError('Please select at least one NFT to stake');
      return;
    }

    setIsStaking(true);
    setError(null);
    
    try {
      const result = await stakeNFTs(walletAddress, selectedNFTs, pool.id);
      if (result.success) {
        setStakedNFTs(prev => ({
          ...prev,
          [pool.id]: [...prev[pool.id], ...selectedNFTs]
        }));
        
        setUserNFTs(prev => prev.filter(nft => !selectedNFTs.includes(nft.id)));
        setSelectedNFTs([]);
        
        const updatedPools = await fetchNFTPools();
        setNFTPools(updatedPools);
      } else {
        setError('Failed to stake NFTs. Please try again.');
      }
    } catch (err) {
      console.error('Staking error:', err);
      setError('An error occurred while staking NFTs.');
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async (poolId) => {
    const confirmUnstake = window.confirm(
      'Are you sure you want to unstake your NFTs? Early unstaking may result in reduced rewards.'
    );

    if (!confirmUnstake) return;

    setIsStaking(true);
    setError(null);

    try {
      const result = await unlockNFTs(walletAddress, poolId);
      if (result.success) {
        const [updatedNFTs, updatedPools] = await Promise.all([
          fetchUserNFTs(walletAddress),
          fetchNFTPools()
        ]);
        
        setUserNFTs(updatedNFTs);
        setNFTPools(updatedPools);
        setStakedNFTs(prev => ({
          ...prev,
          [poolId]: []
        }));
      } else {
        setError('Failed to unstake NFTs. Please try again.');
      }
    } catch (err) {
      console.error('Unstaking error:', err);
      setError('An error occurred while unstaking NFTs.');
    } finally {
      setIsStaking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="nft-staking-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading NFT staking pools...</p>
        <p className="loading-subtext">Please wait while we fetch your NFTs and pool information</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nft-staking-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const selectedNFTsRewards = selectedPool ? calculatePotentialRewards(selectedPool, selectedNFTs.length) : null;

  return (
    <div className="nft-staking-container">
      <h2>🎨 CULT NFT Staking Pools</h2>
      <p className="nft-staking-description">
        Stake your CULT NFTs to earn additional CULT tokens! Support the ecosystem while earning rewards.
        Choose from our curated pools designed for different staking preferences.
      </p>
      
      <div className="nft-pools-grid">
        {nftPools.map((pool) => (
          <div 
            key={pool.id} 
            className={`nft-pool-card ${selectedPool?.id === pool.id ? 'selected' : ''}`}
            onClick={() => setSelectedPool(pool)}
          >
            <div className="pool-header">
              <h3>{pool.name}</h3>
              <span className="duration-badge">{pool.duration} Days</span>
            </div>
            
            <p className="pool-description">{pool.description}</p>
            
            <div className="pool-details">
              <p><strong>APR:</strong> <span className="highlight">{pool.apr}%</span></p>
              <p><strong>Lock Period:</strong> <span>{pool.duration} days</span></p>
              <p><strong>Total NFTs Staked:</strong> <span>{pool.totalStaked}</span></p>
              <p><strong>Rewards Per Day:</strong> <span>{pool.rewardsPerDay} CULT per NFT</span></p>
              <p><strong>Total Rewards Distributed:</strong> <span>{pool.totalRewardsDistributed.toLocaleString()} CULT</span></p>
            </div>
            
            <div className="nft-selection">
              <h4>Your NFTs</h4>
              {userNFTs.length > 0 ? (
                <>
                  <div className="nft-grid">
                    {userNFTs.map((nft) => (
                      <div
                        key={nft.id}
                        className={`nft-item ${selectedNFTs.includes(nft.id) ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedNFTs.includes(nft.id)) {
                            setSelectedNFTs(prev => prev.filter(id => id !== nft.id));
                          } else {
                            setSelectedNFTs(prev => [...prev, nft.id]);
                          }
                        }}
                      >
                        <img src={nft.image} alt={nft.name} />
                        <p>{nft.name}</p>
                      </div>
                    ))}
                  </div>
                  
                  {selectedNFTs.length > 0 && selectedPool?.id === pool.id && (
                    <div className="rewards-preview">
                      <h4>Potential Rewards</h4>
                      <p>Daily: {selectedNFTsRewards.daily} CULT</p>
                      <p>Total after {pool.duration} days: {selectedNFTsRewards.total} CULT</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="no-nfts-message">No available NFTs to stake</p>
              )}
            </div>

            {stakedNFTs[pool.id]?.length > 0 && (
              <div className="staked-nfts-section">
                <h4>Your Staked NFTs</h4>
                <p>{stakedNFTs[pool.id].length} NFTs staked in this pool</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnstake(pool.id);
                  }}
                  disabled={isStaking}
                  className="unstake-button"
                >
                  {isStaking ? 'Unstaking...' : 'Unstake All'}
                </button>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNFTStake(pool);
              }}
              disabled={isStaking || selectedNFTs.length === 0 || selectedPool?.id !== pool.id}
              className="stake-button"
            >
              {isStaking ? 'Staking...' : `Stake ${selectedNFTs.length} Selected NFT${selectedNFTs.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NFTStakingPools; 