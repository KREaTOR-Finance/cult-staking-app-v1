import React from 'react';
import ProfileImage from './ProfileImage';

const Header = () => {
  return (
    <header className="site-header">
      <div className="container">
        <div className="header-content">
          <div className="brand">
            <h1 className="brand-title">XRPCULT</h1>
            <p className="brand-subtitle">NFT Staking Platform</p>
          </div>
          <nav className="nav-links">
            <a href="#nft-staking" className="nav-link active">
              <i className="fas fa-cube"></i>
              NFT Staking
            </a>
            <a href="#token-staking" className="nav-link">
              <i className="fas fa-coins"></i>
              Token Staking
            </a>
          </nav>
          <div className="social-links">
            <a href="https://twitter.com/XRPCULT" target="_blank" rel="noopener noreferrer" className="social-link" title="Twitter">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://t.me/XRPCULT" target="_blank" rel="noopener noreferrer" className="social-link" title="Telegram">
              <i className="fab fa-telegram"></i>
            </a>
            <a href="https://github.com/XRPCULT" target="_blank" rel="noopener noreferrer" className="social-link" title="GitHub">
              <i className="fab fa-github"></i>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 