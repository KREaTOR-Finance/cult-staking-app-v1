import React, { useEffect } from 'react';
import { useXRPL } from '../hooks/useXRPL';
import { useStaking } from '../hooks/useStaking';
import '../styles/app.css';

const Staking = () => {
    const { userNFTs, stakedNFTs, fetchNFTs, fetchStakedNFTs } = useXRPL();
    const { stakeNFT, unstakeNFT, loading, error } = useStaking();

    useEffect(() => {
        const loadNFTs = async () => {
            await Promise.all([
                fetchNFTs(),
                fetchStakedNFTs()
            ]);
        };
        loadNFTs();
    }, [fetchNFTs, fetchStakedNFTs]);

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="staking-container">
            <div className="staking-info">
                <h2>NFT Staking</h2>
            </div>

            <div className="nft-grid">
                <div className="unstaked-nfts">
                    <h3>Your NFTs</h3>
                    {userNFTs.map((nft) => (
                        <div key={nft.id} className="nft-card">
                            <img src={nft.image} alt={nft.name} />
                            <h4>{nft.name}</h4>
                            <button onClick={() => stakeNFT(nft.id)}>
                                Stake NFT
                            </button>
                        </div>
                    ))}
                </div>

                <div className="staked-nfts">
                    <h3>Staked NFTs</h3>
                    {stakedNFTs.map((nft) => (
                        <div key={nft.id} className="nft-card">
                            <img src={nft.image} alt={nft.name} />
                            <h4>{nft.name}</h4>
                            <div className="staking-info">
                                <p>Staked: {nft.stakedDate}</p>
                            </div>
                            <button 
                                onClick={() => unstakeNFT(nft.id, nft.stakedDate, nft.isInnerCircle)}
                                className="unstake-button"
                            >
                                Unstake NFT
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Staking; 