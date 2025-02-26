import React, { useState, useEffect } from 'react';
import { useXRPL } from '../hooks/useXRPL';
import '../styles/app.css';

const Leaderboard = () => {
    const [timeframe, setTimeframe] = useState('all');
    const { topStakers, loading, error, fetchTopStakers } = useXRPL();

    // Fetch stakers when timeframe changes
    useEffect(() => {
        fetchTopStakers(timeframe);
    }, [timeframe, fetchTopStakers]);

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    const formatAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <h2>TOP STAKERS</h2>
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
                    <div className="rank">RANK</div>
                    <div className="address">WALLET</div>
                    <div className="staked">STAKED NFTS</div>
                    <div className="rewards">TOTAL REWARDS</div>
                    <div className="status">STATUS</div>
                </div>
                
                {topStakers.length === 0 ? (
                    <div className="empty-state">
                        <p>No staking data available for this timeframe.</p>
                    </div>
                ) : (
                    topStakers.map((staker, index) => (
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
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                        }}
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
                    ))
                )}
            </div>
        </div>
    );
};

export default Leaderboard; 