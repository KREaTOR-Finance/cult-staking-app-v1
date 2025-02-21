import React from 'react';

const TokenInfo = () => {
  const cultTokenInfo = {
    name: 'CULT',
    issuer: 'rPGKpTsgSaQiwLpEekVj1t7yqgB9vhpXbs',
    currency: '434F4C54000000000000000000000000000000000000', // CULT hex code
    exchanges: [
      {
        name: 'XRPL DEX',
        link: 'https://xrpl.services/?issuer=rPGKpTsgSaQiwLpEekVj1t7yqgB9vhpXbs&currency=CULT',
        type: 'DEX'
      },
      {
        name: 'Bitrue',
        link: 'https://www.bitrue.com/trade/cult_usdt',
        type: 'CEX'
      }
    ]
  };

  return (
    <div className="card token-info">
      <div className="info-badge">Important</div>
      <h2>CULT Token Information</h2>
      
      <div className="info-box">
        <h4>Before You Start</h4>
        <p>To participate in staking, you need:</p>
        <ul>
          <li>An XRP Ledger account with some XRP for fees</li>
          <li>A trustline set for the CULT token</li>
          <li>CULT tokens in your wallet</li>
        </ul>
      </div>

      <div className="token-details">
        <h3>CULT Token Details</h3>
        <div className="info-row">
          <span>Token Name:</span>
          <span>CULT</span>
        </div>
        <div className="info-row">
          <span>Issuer Address:</span>
          <div className="copy-wrapper">
            <code>{cultTokenInfo.issuer}</code>
            <button 
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(cultTokenInfo.issuer)}
              title="Copy address"
            >
              <i className="fas fa-copy"></i>
            </button>
          </div>
        </div>
        <div className="info-row">
          <span>Currency Code:</span>
          <div className="copy-wrapper">
            <code>{cultTokenInfo.currency}</code>
            <button 
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(cultTokenInfo.currency)}
              title="Copy currency code"
            >
              <i className="fas fa-copy"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="action-section">
        <h3>How to Get Started</h3>
        
        <div className="action-card">
          <div className="action-header">
            <i className="fas fa-link"></i>
            <h4>1. Set Trustline</h4>
          </div>
          <p>First, you need to set a trustline to hold CULT tokens:</p>
          <button className="action-button" onClick={() => window.open('https://xrpl.services/trustline', '_blank')}>
            <i className="fas fa-external-link-alt"></i> Set Trustline on XRPL Services
          </button>
          <div className="help-text">
            <i className="fas fa-info-circle"></i>
            Enter the issuer address and currency code above when setting the trustline
          </div>
        </div>

        <div className="action-card">
          <div className="action-header">
            <i className="fas fa-shopping-cart"></i>
            <h4>2. Buy CULT</h4>
          </div>
          <p>You can buy CULT tokens from these exchanges:</p>
          <div className="exchange-buttons">
            {cultTokenInfo.exchanges.map((exchange, index) => (
              <button 
                key={index}
                className="action-button"
                onClick={() => window.open(exchange.link, '_blank')}
              >
                <i className={`fas fa-${exchange.type === 'DEX' ? 'chart-line' : 'building-columns'}`}></i>
                Buy on {exchange.name}
              </button>
            ))}
          </div>
        </div>

        <div className="action-card">
          <div className="action-header">
            <i className="fas fa-calculator"></i>
            <h4>3. Calculate Returns</h4>
          </div>
          <p>Use our calculator to estimate your staking rewards:</p>
          <div className="calculator">
            <div className="calc-input">
              <label>Amount to Stake (CULT)</label>
              <input type="number" placeholder="Enter CULT amount" min="100" />
            </div>
            <div className="calc-input">
              <label>Staking Duration (Days)</label>
              <select>
                <option value="60">60 Days (5% APY)</option>
                <option value="180">180 Days (10% APY)</option>
                <option value="365">365 Days (15% APY)</option>
              </select>
            </div>
            <div className="calc-result">
              <div className="result-item">
                <span>Estimated Returns:</span>
                <span className="highlight">0 CULT</span>
              </div>
              <div className="result-item">
                <span>Total Value After Period:</span>
                <span className="highlight">0 CULT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenInfo; 