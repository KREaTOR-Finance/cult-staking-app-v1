import React from 'react';
import { useXRPL } from '../hooks/useXRPL';
import '../styles/app.css';

const Dashboard = () => {
    const { userStats, loading, error } = useXRPL();

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="dashboard-container">
            <h2>Staking Dashboard</h2>
            
            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <h3>Your Staked NFTs</h3>
                    <p className="highlight">{userStats.totalStaked}</p>
                </div>

                <div className="dashboard-card">
                    <h3>Total Rewards Earned</h3>
                    <p className="highlight">{userStats.totalRewards.toFixed(2)} CULT</p>
                </div>

                <div className="dashboard-card">
                    <h3>Staking Rank</h3>
                    <p className="highlight">#{userStats.stakingRank}</p>
                </div>

                {userStats.hasInnerCircle && (
                    <div className="dashboard-card">
                        <h3>Inner Circle Status</h3>
                        <p className="highlight">Active (+20% Bonus)</p>
                    </div>
                )}
            </div>

            <div className="info-box">
                <h4>Important Information</h4>
                <ul>
                    <li>Early unstaking incurs a 25% penalty on accumulated rewards</li>
                    <li>Inner Circle NFT holders receive a 20% bonus on all rewards</li>
                    <li>Rewards are distributed daily based on total staked NFTs</li>
                </ul>
            </div>
        </div>
    );
};

export default Dashboard; 