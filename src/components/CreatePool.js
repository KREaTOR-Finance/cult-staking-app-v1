import React, { useState } from 'react';
import { createStakingPool } from './XRPLService';

const CreatePool = ({ walletAddress }) => {
  const [poolName, setPoolName] = useState('');
  const [duration, setDuration] = useState(60);
  const [minStake, setMinStake] = useState(100);
  const [apy, setApy] = useState(5);
  const [isCreating, setIsCreating] = useState(false);

  const createPool = async () => {
    if (!poolName) {
      alert('Please enter a pool name');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createStakingPool({
        name: poolName,
        duration,
        minStake,
        apy,
        walletAddress
      });

      if (result.success) {
        alert('Pool created successfully!');
        // Reset form
        setPoolName('');
        setDuration(60);
        setMinStake(100);
        setApy(5);
      } else {
        alert('Failed to create pool. Please try again.');
      }
    } catch (error) {
      console.error('Pool creation error:', error);
      alert('An error occurred while creating the pool.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="card">
      <div className="info-badge">Step 3</div>
      <h2>Create Your Own Pool</h2>
      <p className="helper-text">
        Want to create a custom staking pool? Set your own terms and invite others to join!
      </p>

      <div className="info-box">
        <h4>Creating a Pool</h4>
        <p>
          As a pool creator, you can:
          <ul>
            <li>Set custom staking duration</li>
            <li>Define minimum stake amount</li>
            <li>Set competitive APY rates</li>
            <li>Invite others to join your pool</li>
          </ul>
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="poolName">
          Pool Name
          <span className="label-hint">(Choose a memorable name)</span>
        </label>
        <input
          id="poolName"
          type="text"
          placeholder="E.g., Diamond Hands Pool"
          value={poolName}
          onChange={(e) => setPoolName(e.target.value)}
          disabled={isCreating}
        />
      </div>

      <div className="form-group">
        <label htmlFor="duration">
          Staking Duration
          <span className="label-hint">(How long tokens will be locked)</span>
        </label>
        <select
          id="duration"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          disabled={isCreating}
        >
          <option value={60}>60 Days - Short Term</option>
          <option value={180}>180 Days - Medium Term</option>
          <option value={365}>365 Days - Maximum Returns</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="minStake">
          Minimum Stake (XRP)
          <span className="label-hint">(Minimum amount required to join)</span>
        </label>
        <input
          id="minStake"
          type="number"
          min="100"
          step="100"
          value={minStake}
          onChange={(e) => setMinStake(parseInt(e.target.value))}
          disabled={isCreating}
        />
      </div>

      <div className="form-group">
        <label htmlFor="apy">
          Annual Percentage Yield (APY)
          <span className="label-hint">(Yearly return rate)</span>
        </label>
        <input
          id="apy"
          type="number"
          min="1"
          max="20"
          value={apy}
          onChange={(e) => setApy(parseInt(e.target.value))}
          disabled={isCreating}
        />
        <div className="input-hint">
          <i className="fas fa-info-circle"></i>
          APY range: 1-20%. Higher rates require more collateral.
        </div>
      </div>

      <div className="form-footer">
        <button 
          onClick={createPool} 
          className="create-button"
          disabled={isCreating}
        >
          {isCreating ? (
            <><i className="fas fa-spinner fa-spin"></i> Creating Pool...</>
          ) : (
            <><i className="fas fa-plus-circle"></i> Create Pool</>
          )}
        </button>
        <p className="form-note">
          <i className="fas fa-shield-alt"></i>
          Your pool will be reviewed for security before going live
        </p>
      </div>
    </div>
  );
};

export default CreatePool;
