import { Client } from 'xrpl';
import { XRPL_CONFIG, STAKING_CONFIG } from '../config';

const XRPL_NODE = process.env.REACT_APP_XRPL_MAINNET_URL || 'wss://xrplcluster.com';
const STAKING_CONTRACT = process.env.REACT_APP_STAKING_CONTRACT;
const CULT_TOKEN_ISSUER = process.env.REACT_APP_CULT_TOKEN_ISSUER;

let client = null;

const getClient = () => {
    if (client) return client;
    
    console.log('XRPL_CONFIG:', XRPL_CONFIG);
    console.log('NETWORK:', XRPL_CONFIG.NETWORK);
    
    const network = XRPL_CONFIG.NETWORK;
    console.log('network:', network);
    
    const config = XRPL_CONFIG[network];
    console.log('network config:', config);
    
    if (!config || !config.wsUrl) {
        console.error('Invalid XRPL network configuration');
        console.log('Falling back to MAINNET config:', XRPL_CONFIG.MAINNET);
        client = new Client(XRPL_CONFIG.MAINNET.wsUrl);
        return client;
    }
    
    client = new Client(config.wsUrl);
    return client;
};

export const connectToXRPL = async () => {
    try {
        if (client && client.isConnected()) {
            return true;
        }
        client = new Client(XRPL_NODE);
        await client.connect();
        return true;
    } catch (error) {
        console.error('Failed to connect to XRPL:', error);
        return false;
    }
};

export const disconnectFromXRPL = async () => {
    try {
        if (client && client.isConnected()) {
            await client.disconnect();
        }
        client = null;
    } catch (error) {
        console.error('Failed to disconnect from XRPL:', error);
    }
};

export const fetchUserNFTs = async (walletAddress) => {
    try {
        if (!client || !client.isConnected()) {
            await connectToXRPL();
        }

        const nfts = await client.request({
            command: 'account_nfts',
            account: walletAddress
        });

        return nfts.result.account_nfts.map(nft => ({
            id: nft.NFTokenID,
            name: `CULT NFT #${nft.NFTokenID.slice(-4)}`,
            image: `${process.env.REACT_APP_IPFS_GATEWAY}/${nft.URI}`,
            isInnerCircle: nft.Flags === 1
        }));
    } catch (error) {
        console.error('Failed to fetch user NFTs:', error);
        return [];
    }
};

export const fetchUserStakedNFTs = async (walletAddress) => {
    try {
        if (!client || !client.isConnected()) {
            await connectToXRPL();
        }

        const response = await client.request({
            command: 'account_lines',
            account: STAKING_CONTRACT,
            peer: walletAddress
        });

        return response.result.lines
            .filter(line => line.currency === 'NFT')
            .map(nft => ({
                id: nft.NFTokenID,
                name: `CULT NFT #${nft.NFTokenID.slice(-4)}`,
                image: `${process.env.REACT_APP_IPFS_GATEWAY}/${nft.URI}`,
                stakedDate: new Date(nft.stake_date).toLocaleDateString(),
                isInnerCircle: nft.Flags === 1
            }));
    } catch (error) {
        console.error('Failed to fetch staked NFTs:', error);
        return [];
    }
};

export const fetchUserStats = async (walletAddress) => {
    try {
        if (!client || !client.isConnected()) {
            await connectToXRPL();
        }

        // Fetch user's staked NFTs
        const stakedNFTs = await fetchUserStakedNFTs(walletAddress);
        
        // Fetch user's CULT token balance
        const balance = await client.request({
            command: 'account_lines',
            account: walletAddress,
            peer: CULT_TOKEN_ISSUER
        });

        const cultBalance = balance.result.lines.find(line => 
            line.currency === process.env.REACT_APP_DEFAULT_TOKEN_CURRENCY
        );

        // Fetch user's staking rank
        const rankResponse = await client.request({
            command: 'account_info',
            account: walletAddress,
            ledger_index: 'validated'
        });

        return {
            totalStaked: stakedNFTs.length,
            totalRewards: parseFloat(cultBalance?.balance || 0),
            stakingRank: rankResponse.result.account_data.Sequence % 1000, // Placeholder for rank
            hasInnerCircle: stakedNFTs.some(nft => nft.isInnerCircle),
            address: walletAddress
        };
    } catch (error) {
        console.error('Failed to fetch user stats:', error);
        return {
            totalStaked: 0,
            totalRewards: 0,
            stakingRank: 0,
            hasInnerCircle: false,
            address: walletAddress
        };
    }
};

export const fetchTopStakers = async (timeframe = 'all') => {
    try {
        if (!client || !client.isConnected()) {
            await connectToXRPL();
        }

        const response = await client.request({
            command: 'account_lines',
            account: STAKING_CONTRACT,
            ledger_index: 'validated'
        });

        const stakers = response.result.lines
            .filter(line => line.currency === 'NFT')
            .reduce((acc, curr) => {
                const address = curr.account;
                if (!acc[address]) {
                    acc[address] = {
                        address,
                        totalStaked: 0,
                        totalRewards: 0
                    };
                }
                acc[address].totalStaked++;
                return acc;
            }, {});

        return Object.values(stakers)
            .sort((a, b) => b.totalStaked - a.totalStaked)
            .slice(0, 10);
    } catch (error) {
        console.error('Failed to fetch top stakers:', error);
        return [];
    }
};

export const updateUserPFP = async (walletAddress, nftId) => {
    try {
        if (!client || !client.isConnected()) {
            await connectToXRPL();
        }

        // This would typically involve a transaction to update user preferences
        // For now, we'll just return true to simulate success
        return true;
    } catch (error) {
        console.error('Failed to update PFP:', error);
        return false;
    }
};

// Helper functions
const isInnerCircleNFT = (taxon) => {
    return taxon >= 1 && taxon <= 100;
};

const calculateTotalRewards = async (walletAddress) => {
    const stakedNFTs = await fetchUserStakedNFTs(walletAddress);
    return stakedNFTs.length * STAKING_CONFIG.DAILY_EMISSION;
};

const calculateStakingRank = async (walletAddress) => {
    const allStakers = await fetchTopStakers();
    return allStakers.findIndex(staker => staker.address === walletAddress) + 1;
};

export const stakeNFT = async (walletAddress, nftId) => {
    const client = getClient();
    try {
        const tx = {
            TransactionType: 'NFTokenCreateOffer',
            Account: walletAddress,
            NFTokenID: nftId,
            Destination: STAKING_CONFIG.CONTRACT_ADDRESS,
            Flags: 1
        };

        const prepared = await client.autofill(tx);
        const result = await client.submit(prepared);
        return result.result.meta.TransactionResult === 'tesSUCCESS';
    } catch (error) {
        console.error('Error staking NFT:', error);
        return false;
    }
};

export const unstakeNFT = async (walletAddress, nftId) => {
    const client = getClient();
    try {
        const tx = {
            TransactionType: 'NFTokenAcceptOffer',
            Account: STAKING_CONFIG.CONTRACT_ADDRESS,
            NFTokenID: nftId,
            Destination: walletAddress
        };

        const prepared = await client.autofill(tx);
        const result = await client.submit(prepared);
        return result.result.meta.TransactionResult === 'tesSUCCESS';
    } catch (error) {
        console.error('Error unstaking NFT:', error);
        return false;
    }
}; 