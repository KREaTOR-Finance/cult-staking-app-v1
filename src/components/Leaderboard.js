import React, { useState } from 'react';
import { useXRPL } from '../hooks/useXRPL';
import '../styles/app.css';

const Leaderboard = () => {
    const [timeframe, setTimeframe] = useState('all');
    const { topStakers, loading, error } = useXRPL();

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    const formatAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <h2>Top Stakers</h2>
                <div className="timeframe-selector">
                    <button 
                        className={timeframe === 'all' ? 'active' : ''} 
                        onClick={() => setTimeframe('all')}
                    >
                        All Time
                    </button>
                    <button 
                        className={timeframe === 'month' ? 'active' : ''} 
                        onClick={() => setTimeframe('month')}
                    >
                        This Month
                    </button>
                    <button 
                        className={timeframe === 'week' ? 'active' : ''} 
                        onClick={() => setTimeframe('week')}
                    >
                        This Week
                    </button>
                </div>
            </div>

            <div className="leaderboard-table">
                <div className="table-header">
                    <div className="rank">Rank</div>
                    <div className="address">Wallet</div>
                    <div className="staked">Staked NFTs</div>
                    <div className="rewards">Total Rewards</div>
                    <div className="status">Status</div>
                </div>
                
                {topStakers.map((staker, index) => (
                    <div key={staker.address} className="table-row">
                        <div className="rank">
                            {index + 1}
                            {index < 3 && (
                                <span className={`trophy trophy-${index + 1}`}>🏆</span>
                            )}
                        </div>
                        <div className="address">
                            {formatAddress(staker.address)}
                            {staker.pfp && (
                                <img 
                                    src={staker.pfp} 
                                    alt="Profile" 
                                    className="mini-pfp"
                                />
                            )}
                        </div>
                        <div className="staked">{staker.stakedNFTs}</div>
                        <div className="rewards">
                            {staker.totalRewards.toFixed(2)} CULT
                        </div>
                        <div className="status">
                            {staker.hasInnerCircle && (
                                <span className="inner-circle-badge">Inner Circle</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Leaderboard; 