import React, { useState, useEffect } from 'react';
import { useXRPL } from '../hooks/useXRPL';
import { useStaking } from '../hooks/useStaking';
import { fetchAllCultNFTs, getNFTDetails } from '../services/XRPLService';
import '../styles/app.css';

const Staking = ({ walletAddress }) => {
    const { userNFTs, stakedNFTs, fetchNFTs, fetchStakedNFTs } = useXRPL();
    const { stakeNFT, unstakeNFT, loading, error } = useStaking();
    const [cultNFTs, setCultNFTs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadNFTs = async () => {
            if (!walletAddress) {
                console.log('No wallet address provided');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                console.log('Fetching NFTs for wallet:', walletAddress);
                const nfts = await fetchAllCultNFTs(walletAddress);
                console.log('Fetched CULT NFTs:', nfts);
                
                // Sort NFTs by their number for consistent display
                const sortedNFTs = nfts.sort((a, b) => {
                    const numA = parseInt(a.name.split('#')[1]);
                    const numB = parseInt(b.name.split('#')[1]);
                    return numA - numB;
                });
                
                setCultNFTs(sortedNFTs);
            } catch (error) {
                console.error('Error loading NFTs:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadNFTs();
    }, [walletAddress]);

    if (!walletAddress) {
        return (
            <div className="staking-container">
                <div className="nft-list">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        Please connect your wallet to view your NFTs
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading || loading) {
        return (
            <div className="staking-container">
                <div className="nft-list">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="loading-spinner"></div>
                        <div style={{ marginTop: '1rem' }}>Loading your NFTs...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="staking-container">
                <div className="nft-list">
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)' }}>
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="staking-container">
            <div className="nft-list">
                {cultNFTs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        No CULT NFTs found in your wallet
                    </div>
                ) : (
                    cultNFTs.map((nft) => (
                        <div key={nft.id} className="nft-list-item">
                            <div className="nft-icon">
                                <img 
                                    src={nft.image || '/placeholder.png'} 
                                    alt={nft.name}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/placeholder.png';
                                    }}
                                />
                            </div>
                            <div className="nft-info">
                                <div className="nft-number">{nft.name.split('#')[1]}</div>
                                <div className="nft-id">{nft.id}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Staking; 