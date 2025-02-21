import React, { useState } from 'react';
import xamanService from '../services/XamanService';

const WalletConnect = ({ onConnect, onDisconnect }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [qrCode, setQrCode] = useState(null);

    const handleConnect = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await xamanService.connect();
            if (result.success) {
                if (result.qrUrl) {
                    setQrCode(result.qrUrl);
                }
                // Mobile redirect is handled by XamanService
            } else {
                setError(result.error || 'Failed to connect wallet');
            }
        } catch (err) {
            console.error('Connection error:', err);
            setError('Failed to connect wallet. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="wallet-connect">
            <h2>Connect Your Wallet</h2>
            <p className="helper-text">
                Connect your XRP wallet to start staking your NFTs and tokens.
            </p>

            <div className="info-box">
                <h4>Getting Started</h4>
                <p>To participate in staking, you'll need:</p>
                <ul>
                    <li>A Xaman wallet</li>
                    <li>Some XRP for transaction fees</li>
                    <li>CULT NFTs or tokens to stake</li>
                </ul>
            </div>

            {error && (
                <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    {error}
                </div>
            )}

            {qrCode && (
                <div className="qr-container">
                    <img src={qrCode} alt="Scan with Xaman" className="qr-code" />
                    <p>Scan with your Xaman wallet</p>
                </div>
            )}

            {!qrCode && (
                <button 
                    className="connect-button"
                    onClick={handleConnect}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Connecting...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-wallet"></i>
                            Connect with Xaman
                        </>
                    )}
                </button>
            )}

            <div className="help-links">
                <a 
                    href="https://xumm.app" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="help-link"
                >
                    <i className="fas fa-download"></i>
                    Get Xaman Wallet
                </a>
                <a 
                    href="https://xumm.app/support" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="help-link"
                >
                    <i className="fas fa-question-circle"></i>
                    Need Help?
                </a>
            </div>
        </div>
    );
};

export default WalletConnect;
