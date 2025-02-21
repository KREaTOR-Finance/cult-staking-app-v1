import { Client } from 'xrpl';
import { XRPL_CONFIG, STAKING_CONFIG } from '../config';

const XRPL_NODE = process.env.REACT_APP_XRPL_MAINNET_URL || 'wss://xrplcluster.com';
const STAKING_CONTRACT = process.env.REACT_APP_STAKING_CONTRACT;
const CULT_TOKEN_ISSUER = process.env.REACT_APP_CULT_TOKEN_ISSUER;

// Base CULT NFT contract addresses
const CULT_NFT_BASE_CONTRACTS = [
    '000A17700C185B42735B06E248D5FC91',
    '0394A02969086D03'
];

let client = null;
let connectionPromise = null;

const handleConnectionError = (error) => {
    console.error('XRPL connection error:', error);
    client = null;
    connectionPromise = null;
};

const createClient = () => {
    if (client) {
        return client;
    }

    client = new Client(XRPL_NODE);
    
    // Add error handlers
    client.on('error', handleConnectionError);
    client.on('disconnected', () => {
        console.log('XRPL client disconnected');
        client = null;
        connectionPromise = null;
    });
    
    return client;
};

export const connectToXRPL = async () => {
    try {
        // If we're already connecting, return the existing promise
        if (connectionPromise) {
            return connectionPromise;
        }

        // If we're already connected, return true
        if (client && client.isConnected()) {
            return true;
        }

        // Create new client if needed
        if (!client) {
            client = createClient();
        }

        // Create and store the connection promise
        connectionPromise = client.connect().then(() => {
            connectionPromise = null;
            return true;
        }).catch(error => {
            console.error('Failed to connect to XRPL:', error);
            client = null;
            connectionPromise = null;
            return false;
        });

        return connectionPromise;
    } catch (error) {
        console.error('Error in connectToXRPL:', error);
        client = null;
        connectionPromise = null;
        return false;
    }
};

export const disconnectFromXRPL = async () => {
    try {
        if (client) {
            client.removeAllListeners();
            if (client.isConnected()) {
                await client.disconnect();
            }
        }
    } catch (error) {
        console.error('Error disconnecting from XRPL:', error);
    } finally {
        client = null;
        connectionPromise = null;
    }
};

const ensureConnection = async () => {
    if (!client || !client.isConnected()) {
        const connected = await connectToXRPL();
        if (!connected) {
            throw new Error('Failed to connect to XRPL');
        }
    }
    return client;
};

// Helper function to decode hex to string
const hexToString = (hex) => {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
};

// Helper function to process NFT URI
const processNFTUri = (uri) => {
    if (!uri) return '';
    
    // If it's already a valid URL, return it
    if (uri.startsWith('http') || uri.startsWith('ipfs')) {
        return uri;
    }

    // If it's hex, convert it
    try {
        const decoded = hexToString(uri);
        if (decoded.startsWith('ipfs://')) {
            return `https://ipfs.io/ipfs/${decoded.replace('ipfs://', '')}`;
        }
        return decoded;
    } catch (error) {
        console.error('Error processing NFT URI:', error);
        return uri;
    }
};

const isCultNFT = (nftId) => {
    // Check if NFT ID starts with any of the base contract addresses
    const isMatch = CULT_NFT_BASE_CONTRACTS.some(contract => nftId.startsWith(contract));
    console.log('Checking NFT:', nftId, 'isMatch:', isMatch);
    return isMatch;
};

export const fetchUserNFTs = async (walletAddress) => {
    try {
        console.log('Fetching NFTs for wallet:', walletAddress);
        const client = await ensureConnection();
        const nfts = await client.request({
            command: 'account_nfts',
            account: walletAddress
        });

        console.log('Raw NFTs response:', nfts.result.account_nfts);

        // Filter and map only CULT NFTs
        const cultNFTs = nfts.result.account_nfts
            .filter(nft => isCultNFT(nft.NFTokenID))
            .map(nft => {
                const processed = {
                    id: nft.NFTokenID,
                    name: `CULT NFT #${nft.NFTokenID.slice(-4)}`,
                    image: processNFTUri(nft.URI),
                    isInnerCircle: nft.Flags === 1,
                    taxon: nft.NFTokenTaxon,
                    issuer: nft.Issuer,
                    flags: nft.Flags,
                    transferFee: nft.TransferFee,
                    sequence: nft.Sequence,
                    uri: nft.URI
                };
                console.log('Processed NFT:', processed);
                return processed;
            });

        console.log('Filtered CULT NFTs:', cultNFTs);
        return cultNFTs;
    } catch (error) {
        console.error('Failed to fetch user NFTs:', error);
        return [];
    }
};

// Add a new function to get detailed NFT info
export const getNFTDetails = async (nftId) => {
    try {
        const client = await ensureConnection();
        const response = await client.request({
            command: 'nft_info',
            nft_id: nftId
        });

        return {
            id: nftId,
            name: `CULT NFT #${nftId.slice(-4)}`,
            image: processNFTUri(response.result.URI),
            isInnerCircle: response.result.Flags === 1,
            taxon: response.result.NFTokenTaxon,
            issuer: response.result.Issuer,
            owner: response.result.Owner,
            flags: response.result.Flags,
            transferFee: response.result.TransferFee,
            sequence: response.result.Sequence,
            uri: response.result.URI // Keep the original URI for reference
        };
    } catch (error) {
        console.error('Failed to fetch NFT details:', error);
        return null;
    }
};

// Add a function to fetch all CULT NFTs for a wallet
export const fetchAllCultNFTs = async (walletAddress) => {
    try {
        console.log('Fetching all CULT NFTs for wallet:', walletAddress);
        const client = await ensureConnection();
        let marker = undefined;
        let allNFTs = [];

        do {
            console.log('Fetching batch with marker:', marker);
            const response = await client.request({
                command: 'account_nfts',
                account: walletAddress,
                limit: 400,
                marker
            });

            console.log('Batch response:', response);

            const cultNFTs = response.result.account_nfts
                .filter(nft => isCultNFT(nft.NFTokenID))
                .map(nft => {
                    const processed = {
                        id: nft.NFTokenID,
                        name: `CULT NFT #${nft.NFTokenID.slice(-4)}`,
                        image: processNFTUri(nft.URI),
                        isInnerCircle: nft.Flags === 1,
                        taxon: nft.NFTokenTaxon,
                        issuer: nft.Issuer,
                        flags: nft.Flags,
                        transferFee: nft.TransferFee,
                        sequence: nft.Sequence,
                        uri: nft.URI
                    };
                    console.log('Processed CULT NFT:', processed);
                    return processed;
                });

            allNFTs = [...allNFTs, ...cultNFTs];
            marker = response.result.marker;
            console.log('Batch added. Total NFTs:', allNFTs.length);
        } while (marker);

        console.log('Final CULT NFTs:', allNFTs);
        return allNFTs;
    } catch (error) {
        console.error('Failed to fetch all CULT NFTs:', error);
        return [];
    }
};

export const fetchUserStakedNFTs = async (walletAddress) => {
    try {
        const client = await ensureConnection();
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
        const client = await ensureConnection();

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
        const client = await ensureConnection();
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
        const client = await ensureConnection();
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
    try {
        const client = await ensureConnection();
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
    try {
        const client = await ensureConnection();
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