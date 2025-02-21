import React, { useEffect, useState } from 'react';
import { unlockTokens, fetchPools, stakeTokens } from './XRPLService';

const StakingPools = ({ walletAddress }) => {
  const [pools, setPools] = useState([]);
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);

  useEffect(() => {
    const loadPools = async () => {
      const poolData = await fetchPools();
      setPools(poolData);
    };
    loadPools();
  }, []);

  const handleStake = async (pool) => {
    if (!stakeAmount || stakeAmount < pool.minStake) {
      alert(`Minimum stake amount is ${pool.minStake} XRP`);
      return;
    }

    setIsStaking(true);
    try {
      const result = await stakeTokens(walletAddress, stakeAmount, pool.duration);
      if (result.success) {
        alert(`Successfully staked ${stakeAmount} XRP for ${pool.duration} days!`);
        // Refresh pools data
        const updatedPools = await fetchPools();
        setPools(updatedPools);
      } else {
        alert('Failed to stake tokens. Please try again.');
      }
    } catch (error) {
      console.error('Staking error:', error);
      alert('An error occurred while staking.');
    } finally {
      setIsStaking(false);
      setStakeAmount('');
    }
  };

  const unlockEarly = async (amount) => {
    const penalty = amount * 0.5;
    const confirmUnlock = window.confirm(
      `Unlocking early will result in a 50% penalty. You will receive ${amount - penalty} tokens. Continue?`
    );

    if (confirmUnlock) {
      const result = await unlockTokens(walletAddress, amount);
      if (result.success) {
        alert(`Tokens unlocked with a penalty of ${penalty}!`);
        // Refresh pools data
        const updatedPools = await fetchPools();
        setPools(updatedPools);
      } else {
        alert('Failed to unlock tokens.');
      }
    }
  };

  return (
    <div className="card staking-section">
      <div className="info-badge">Step 2</div>
      <h2>Choose Your Staking Pool</h2>
      <p className="helper-text">
        Select a staking pool that matches your investment goals. The longer you stake, the higher rewards you can earn!
      </p>

      <div className="info-box">
        <h4>Understanding Staking Pools</h4>
        <p>
          Staking is like earning interest on your savings. When you stake your XRP tokens:
          <ul>
            <li>Your tokens are safely locked for the chosen duration</li>
            <li>You earn rewards based on the APY (Annual Percentage Yield)</li>
            <li>The longer you stake, the more rewards you can earn</li>
          </ul>
        </p>
      </div>

      <div className="pools-grid">
        {pools.map((pool) => (
          <div key={pool.id} className="pool-card">
            <div className="pool-header">
              <h3>{pool.name}</h3>
              <div className="duration-badge">{pool.duration} Days</div>
            </div>
            
            <div className="pool-stats">
              <div className="stat-item">
                <div className="stat-value">{pool.totalStaked.toLocaleString()}</div>
                <div className="stat-label">
                  <i className="fas fa-coins"></i> Total Staked
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-value highlight">{pool.apy}%</div>
                <div className="stat-label">
                  <i className="fas fa-chart-line"></i> APY
                </div>
              </div>
            </div>

            <div className="pool-info">
              <div className="info-row">
                <span>Minimum Stake:</span>
                <span>{pool.minStake} XRP</span>
              </div>
              <div className="info-row">
                <span>Early Unlock Fee:</span>
                <span>50%</span>
              </div>
              <div className="info-row">
                <span>Participants:</span>
                <span>{pool.participants}</span>
              </div>
            </div>

            <div className="stake-input-group">
              <input
                type="number"
                placeholder={`Enter amount (min. ${pool.minStake} XRP)`}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                min={pool.minStake}
                step="100"
              />
            </div>

            <div className="pool-footer">
              <button 
                className="stake-button"
                onClick={() => handleStake(pool)}
                disabled={isStaking || !stakeAmount}
              >
                {isStaking ? (
                  <><i className="fas fa-spinner fa-spin"></i> Staking...</>
                ) : (
                  <><i className="fas fa-plus-circle"></i> Stake Now</>
                )}
              </button>
              <button 
                className="unlock-button"
                onClick={() => unlockEarly(stakeAmount)}
                title="Unlock your tokens early (50% penalty applies)"
                disabled={!stakeAmount}
              >
                <i className="fas fa-lock-open"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="help-section">
        <h4>Need Help Choosing?</h4>
        <div className="help-grid">
          <div className="help-item">
            <i className="fas fa-clock"></i>
            <h5>Short Term (60 Days)</h5>
            <p>Best for those who want flexibility and quick access to their tokens.</p>
          </div>
          <div className="help-item">
            <i className="fas fa-balance-scale"></i>
            <h5>Medium Term (180 Days)</h5>
            <p>Balanced option with better rewards and reasonable commitment.</p>
          </div>
          <div className="help-item">
            <i className="fas fa-star"></i>
            <h5>Long Term (1 Year)</h5>
            <p>Maximum rewards for those committed to long-term growth.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakingPools;
