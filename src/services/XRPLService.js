import { Client } from 'xrpl';

// List of XRPL websocket nodes for redundancy
const XRPL_NODES = [
    process.env.REACT_APP_XRPL_MAINNET_URL || 'wss://xrplcluster.com',
    'wss://s1.ripple.com',
    'wss://s2.ripple.com',
    'wss://xrpl.ws',
    'wss://xrplcluster.com',
    'wss://xrpl.link'
];

// Keep track of the current node index
let currentNodeIndex = 0;

const STAKING_CONTRACT = process.env.REACT_APP_STAKING_CONTRACT;
const CULT_TOKEN_ISSUER = process.env.REACT_APP_CULT_TOKEN_ISSUER;

// Staking configuration
const STAKING_CONFIG = {
    CONTRACT_ADDRESS: STAKING_CONTRACT,
    DAILY_EMISSION: process.env.REACT_APP_DAILY_EMISSION_YEAR_1 || 205479,
    INNER_CIRCLE_BONUS: process.env.REACT_APP_INNER_CIRCLE_BONUS || 20,
    EARLY_UNSTAKE_PENALTY: process.env.REACT_APP_EARLY_UNSTAKE_PENALTY || 25,
    MIN_STAKE_DURATION: process.env.REACT_APP_MIN_STAKE_DURATION || 7
};

// Base CULT NFT contract addresses
const CULT_NFT_BASE_CONTRACTS = [
    '000A17700C185B42735B06E248D5FC91',
    '0394A02969086D03'
];

let client = null;
let connectionPromise = null;
let disconnectTimer = null;
// eslint-disable-next-line no-unused-vars
let lastActivityTimestamp = Date.now();
let connectionFailures = {};

// Function to get the next available node
const getNextNode = () => {
    // If we've tried all nodes without success, start over
    if (Object.keys(connectionFailures).length >= XRPL_NODES.length) {
        // Reset failures but remember which nodes have failed
        const now = Date.now();
        
        // Remove nodes from failure list if they failed more than 5 minutes ago
        Object.keys(connectionFailures).forEach(node => {
            if (now - connectionFailures[node] > 5 * 60 * 1000) {
                delete connectionFailures[node];
            }
        });
    }
    
    // Find the next node that has not recently failed
    let attempts = 0;
    let nextNodeIndex = currentNodeIndex;
    
    while (attempts < XRPL_NODES.length) {
        nextNodeIndex = (nextNodeIndex + 1) % XRPL_NODES.length;
        const nextNode = XRPL_NODES[nextNodeIndex];
        
        // If this node hasn't recently failed, use it
        if (!connectionFailures[nextNode] || 
            (Date.now() - connectionFailures[nextNode] > 5 * 60 * 1000)) {
            currentNodeIndex = nextNodeIndex;
            return XRPL_NODES[currentNodeIndex];
        }
        
        attempts++;
    }
    
    // If all nodes have failed recently, just use the next one in sequence
    currentNodeIndex = (currentNodeIndex + 1) % XRPL_NODES.length;
    return XRPL_NODES[currentNodeIndex];
};

// Keep track of activity to disconnect after inactivity
const updateActivityTimestamp = () => {
    lastActivityTimestamp = Date.now();
    
    // Reset the disconnect timer
    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
    }
    
    // Set a new disconnect timer - disconnect after 10 minutes of inactivity
    disconnectTimer = setTimeout(() => {
        if (client && client.isConnected()) {
            console.log('Disconnecting XRPL client due to inactivity');
            disconnectFromXRPL();
        }
    }, 10 * 60 * 1000); // 10 minutes
};

const handleConnectionError = (error, nodeUrl) => {
    console.error(`XRPL connection error on node ${nodeUrl}:`, error);
    
    // Mark this node as failed
    connectionFailures[nodeUrl] = Date.now();
    
    // Clean up on error
    if (client) {
        try {
            client.removeAllListeners();
        } catch (e) {
            // Ignore clean up errors
        }
    }
    client = null;
    connectionPromise = null;
};

const createClient = (nodeUrl) => {
    if (client) {
        return client;
    }

    try {
        console.log(`Creating XRPL client with node: ${nodeUrl}`);
        client = new Client(nodeUrl, {
            connectionTimeout: 15000, // 15 seconds timeout for websocket connection
            timeout: 30000, // 30 seconds timeout for requests
            maxConnectionAttempts: 3 // Maximum number of automatic reconnection attempts
        });
        
        // Add event handlers
        client.on('error', (err) => handleConnectionError(err, nodeUrl));
        client.on('disconnected', () => {
            console.log('XRPL client disconnected');
            client = null;
            connectionPromise = null;
        });
        
        // Keep track of activity
        client.on('connected', () => {
            console.log(`Successfully connected to XRPL node: ${nodeUrl}`);
            updateActivityTimestamp();
            
            // Clear this node from failure list if it's there
            if (connectionFailures[nodeUrl]) {
                delete connectionFailures[nodeUrl];
            }
        });
        
        return client;
    } catch (error) {
        console.error(`Error creating XRPL client for node ${nodeUrl}:`, error);
        connectionFailures[nodeUrl] = Date.now();
        return null;
    }
};

export const connectToXRPL = async () => {
    try {
        // Update activity timestamp when connecting
        updateActivityTimestamp();
        
        // If we're already connecting, return the existing promise
        if (connectionPromise) {
            return connectionPromise;
        }

        // If we're already connected, return true without reconnecting
        if (client && client.isConnected()) {
            return true;
        }

        // Get the next node to try
        const nodeUrl = getNextNode();
        
        // Create a timeout promise to ensure we don't hang forever
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Connection timeout for node ${nodeUrl}`)), 15000); // 15 second timeout
        });

        // Create connection promise with timeout
        const connect = async () => {
            try {
                // First, ensure any existing client is properly cleaned up
                if (client) {
                    try {
                        // Remove listeners to prevent memory leaks
                        client.removeAllListeners();
                        
                        // Attempt to disconnect if still connected
                        if (client.isConnected()) {
                            await client.disconnect();
                        }
                    } catch (e) {
                        // Just log and continue, we'll create a new client anyway
                        console.warn('Error cleaning up existing client:', e);
                    }
                    
                    // Reset client reference to prevent reuse
                    client = null;
                }

                // Create new client with the selected node
                client = createClient(nodeUrl);
                if (!client) {
                    throw new Error(`Failed to create XRPL client for node ${nodeUrl}`);
                }
                
                await client.connect();
                console.log(`Connected to XRPL node: ${nodeUrl}`);
                return true;
            } catch (error) {
                // Mark this node as failed
                connectionFailures[nodeUrl] = Date.now();
                
                // Clean up the client on error
                if (client) {
                    try {
                        client.removeAllListeners();
                    } catch (e) {
                        // Just log the error
                        console.warn('Error removing listeners:', e);
                    }
                }
                client = null;
                throw error;
            }
        };

        // Create and store the connection promise with timeout
        connectionPromise = Promise.race([connect(), timeoutPromise])
            .then(result => {
                connectionPromise = null;
                return result;
            })
            .catch(error => {
                console.error(`Failed to connect to XRPL node ${nodeUrl}:`, error);
                
                // If this was the first attempt, try with a different node immediately
                if (!Object.keys(connectionFailures).length) {
                    console.log('Attempting immediate retry with different node...');
                    connectionPromise = null;
                    return connectToXRPL(); // Recursive call to try the next node
                }
                
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
        // Clear the disconnect timer
        if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            disconnectTimer = null;
        }
        
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

// Simplified method to ensure connection that avoids infinite loops
const ensureConnection = async () => {
    // Update activity timestamp when making requests
    updateActivityTimestamp();
    
    // If we have a client and it's connected, use it
    if (client && client.isConnected()) {
        return client;
    }
    
    // If not, try to connect with limited retries
    let retries = 3; // Limit retries to avoid infinite loops
    let connected = false;
    
    while (retries >= 0 && !connected) {
        // Try to connect
        connected = await connectToXRPL();
        
        if (connected) break;
        
        // If connection failed and we have retries left, wait before trying again
        if (retries > 0) {
            // Use exponential backoff
            const backoffTime = Math.min(1000 * Math.pow(2, 3 - retries), 5000);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            retries--;
        } else {
            // If we've exhausted retries, throw an error
            throw new Error('Failed to connect to any XRPL node after multiple attempts');
        }
    }
    
    if (!client) {
        throw new Error('Failed to establish XRPL client connection');
    }
    
    return client;
};

// Specialized request function with automatic node failover
export const executeXrplRequest = async (requestParams, maxRetries = 2) => {
    let retries = 0;
    let lastError = null;
    
    while (retries <= maxRetries) {
        try {
            // Get a connected client
            const client = await ensureConnection();
            
            // Execute the request
            return await client.request(requestParams);
        } catch (error) {
            lastError = error;
            console.error(`XRPL request failed (attempt ${retries + 1}/${maxRetries + 1}):`, error);
            
            // If the client is connected but the request failed, it might be a node issue
            if (client && client.isConnected()) {
                // Mark the current node as failed
                connectionFailures[XRPL_NODES[currentNodeIndex]] = Date.now();
                
                // Disconnect and nullify client to force a new connection with a different node
                await disconnectFromXRPL();
            }
            
            retries++;
            
            // If we haven't exhausted retries, wait before trying again
            if (retries <= maxRetries) {
                // Use exponential backoff
                const backoffTime = Math.min(1000 * Math.pow(2, retries), 5000);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }
    
    // If we've exhausted retries, throw the last error
    throw lastError || new Error('XRPL request failed after multiple attempts');
};

// Helper function to decode hex to string
const hexToString = (hex) => {
    if (!hex || typeof hex !== 'string') return '';
    // Remove any 0x prefix
    hex = hex.replace('0x', '');
    try {
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
            const charCode = parseInt(hex.substr(i, 2), 16);
            // Only add printable characters
            if (charCode >= 32 && charCode <= 126) {
                str += String.fromCharCode(charCode);
            }
        }
        return str;
    } catch (error) {
        console.error('Error decoding hex:', error);
        return '';
    }
};

// Helper function to convert IPFS URL to HTTP URL
// eslint-disable-next-line no-unused-vars
const convertIpfsUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('ipfs://')) {
        return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
    }
    return url;
};

// Helper function to fetch JSON metadata
// eslint-disable-next-line no-unused-vars
const fetchJsonMetadata = async (url) => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Fetched metadata:', data);
        return data;
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return null;
    }
};

// Helper function to process NFT URI
const processNFTUri = async (uri) => {
    if (!uri) {
        return '/default-nft.png';
    }

    // For testing/development, use placeholder images
    if (process.env.REACT_APP_USE_PLACEHOLDER_IMAGES === 'true') {
        return '/placeholder.png';
    }
    
    // If it's already a valid URL, check if it's JSON metadata
    if (uri.startsWith('http') || uri.startsWith('ipfs')) {
        const processedUrl = convertIpfsUrl(uri);
        
        if (processedUrl.endsWith('.json')) {
            try {
                const metadata = await fetchJsonMetadata(processedUrl);
                if (metadata && metadata.image) {
                    return convertIpfsUrl(metadata.image);
                }
            } catch (error) {
                console.error('Error fetching JSON metadata:', error);
                return '/default-nft.png';
            }
        }
        return processedUrl;
    }

    // Try to decode hex
    try {
        const decoded = hexToString(uri);

        // Handle IPFS URIs
        if (decoded.startsWith('ipfs://')) {
            const ipfsUrl = convertIpfsUrl(decoded);
            
            // If it's a JSON file, fetch the metadata
            if (ipfsUrl.endsWith('.json')) {
                try {
                    const metadata = await fetchJsonMetadata(ipfsUrl);
                    if (metadata && metadata.image) {
                        return convertIpfsUrl(metadata.image);
                    }
                } catch (error) {
                    console.error('Error fetching IPFS JSON metadata:', error);
                    return '/default-nft.png';
                }
            }
            return ipfsUrl;
        }

        // Handle HTTP URIs
        if (decoded.startsWith('http')) {
            if (decoded.endsWith('.json')) {
                try {
                    const metadata = await fetchJsonMetadata(decoded);
                    if (metadata && metadata.image) {
                        return convertIpfsUrl(metadata.image);
                    }
                } catch (error) {
                    console.error('Error fetching HTTP JSON metadata:', error);
                    return '/default-nft.png';
                }
            }
            return decoded;
        }

        // Handle base64 encoded images
        if (decoded.startsWith('data:image')) {
            return decoded;
        }

        // Try to parse as JSON
        try {
            const jsonData = JSON.parse(decoded);
            
            // Check for image URL in various common fields
            const imageUrl = jsonData.image || 
                           jsonData.image_url || 
                           jsonData.image_uri ||
                           jsonData.imageUrl ||
                           jsonData.url;
            
            if (imageUrl) {
                return convertIpfsUrl(imageUrl);
            }

            // If no image URL found but we have raw image data
            if (jsonData.image_data) {
                return `data:image/svg+xml;base64,${btoa(jsonData.image_data)}`;
            }
        } catch (e) {
            // Not valid JSON, continue with decoded string
        }

        // If the decoded string looks like a URL
        if (decoded.match(/^https?:\/\//i)) {
            return decoded;
        }

        // If we have what looks like base64 data
        if (decoded.match(/^data:image/)) {
            return decoded;
        }

        // If nothing else worked, try to use the decoded string directly
        return decoded;
    } catch (error) {
        console.error('Error processing NFT URI:', error);
        return '/default-nft.png';
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
        
        const nfts = await executeXrplRequest({
            command: 'account_nfts',
            account: walletAddress
        });

        console.log('Raw NFTs response:', JSON.stringify(nfts.result.account_nfts, null, 2));

        // Filter and map only CULT NFTs
        const cultNFTs = await Promise.all(nfts.result.account_nfts
            .filter(nft => {
                const isCult = isCultNFT(nft.NFTokenID);
                console.log(`NFT ${nft.NFTokenID} is${isCult ? '' : ' not'} a CULT NFT`);
                if (isCult) {
                    console.log('CULT NFT details:', {
                        NFTokenID: nft.NFTokenID,
                        URI: nft.URI,
                        Flags: nft.Flags,
                        Issuer: nft.Issuer,
                        NFTokenTaxon: nft.NFTokenTaxon
                    });
                }
                return isCult;
            })
            .map(async nft => {
                console.log(`Processing NFT ${nft.NFTokenID}:`);
                console.log('Original URI:', nft.URI);
                
                const imageUrl = await processNFTUri(nft.URI);
                console.log('Final processed image URL:', imageUrl);
                
                return {
                    id: nft.NFTokenID,
                    name: `CULT NFT #${nft.NFTokenID.slice(-4)}`,
                    image: imageUrl,
                    isInnerCircle: nft.Flags === 1,
                    taxon: nft.NFTokenTaxon,
                    issuer: nft.Issuer,
                    flags: nft.Flags,
                    transferFee: nft.TransferFee,
                    sequence: nft.Sequence,
                    uri: nft.URI
                };
            }));

        console.log('Final processed CULT NFTs:', cultNFTs);
        return cultNFTs;
    } catch (error) {
        console.error('Failed to fetch user NFTs:', error);
        return [];
    }
};

export const fetchAllCultNFTs = async (walletAddress) => {
    try {
        if (!walletAddress) {
            console.log('No wallet address provided for fetchAllCultNFTs');
            return [];
        }
        
        // Get account NFTs with basic request
        const nftsResponse = await executeXrplRequest({
            command: 'account_nfts',
            account: walletAddress
        });
        
        if (!nftsResponse.result || !nftsResponse.result.account_nfts || nftsResponse.result.account_nfts.length === 0) {
            console.log('No NFTs found in wallet');
            return [];
        }
        
        // Filter to just find CULT NFTs based on issuer or contract
        const cultNFTs = nftsResponse.result.account_nfts.filter(nft => 
            isCultNFT(nft.NFTokenID)
        );
        
        if (cultNFTs.length === 0) {
            console.log('No CULT NFTs found');
            return [];
        }
        
        // Process NFTs but use a simpler approach
        const processedNFTs = await Promise.all(cultNFTs.map(async nft => {
            try {
                const imageUrl = await processNFTUri(nft.URI);
                
                return {
                    id: nft.NFTokenID,
                    name: `CULT NFT #${nft.NFTokenID.slice(-4)}`,
                    image: imageUrl || '/default-nft.png',
                    isInnerCircle: nft.Flags === 1,
                    taxon: nft.NFTokenTaxon,
                    issuer: nft.Issuer,
                    flags: nft.Flags,
                    uri: nft.URI
                };
            } catch (error) {
                console.warn(`Error processing NFT ${nft.NFTokenID}:`, error);
                // Return a default NFT on error rather than failing
                return {
                    id: nft.NFTokenID,
                    name: `CULT NFT #${nft.NFTokenID.slice(-4)}`,
                    image: '/default-nft.png',
                    isInnerCircle: nft.Flags === 1,
                    taxon: nft.NFTokenTaxon,
                    issuer: nft.Issuer,
                    flags: nft.Flags,
                    uri: nft.URI
                };
            }
        }));
        
        // Filter out any null values (in case any processing completely failed)
        return processedNFTs.filter(nft => nft !== null);
    } catch (error) {
        console.error('Error fetching CULT NFTs:', error);
        // Provide a helpful error message
        if (error.message && error.message.includes('Failed to connect')) {
            throw new Error('Connection error: Unable to connect to XRPL');
        } else if (error.message && error.message.includes('timeout')) {
            throw new Error('Connection timeout: XRPL server is not responding');
        }
        throw error;
    }
};

export const fetchUserStakedNFTs = async (walletAddress) => {
    try {
        const response = await executeXrplRequest({
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
        // Fetch user's staked NFTs
        const stakedNFTs = await fetchUserStakedNFTs(walletAddress);
        
        // Fetch user's CULT token balance
        const balance = await executeXrplRequest({
            command: 'account_lines',
            account: walletAddress,
            peer: CULT_TOKEN_ISSUER
        });

        const cultBalance = balance.result.lines.find(line => 
            line.currency === process.env.REACT_APP_DEFAULT_TOKEN_CURRENCY
        );

        // Fetch user's staking rank
        const rankResponse = await executeXrplRequest({
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
        const response = await executeXrplRequest({
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
        await ensureConnection();
        // This would typically involve a transaction to update user preferences
        // For now, we'll just return true to simulate success
        return true;
    } catch (error) {
        console.error('Failed to update PFP:', error);
        return false;
    }
};

// Helper functions for staking calculations
// eslint-disable-next-line no-unused-vars
const isInnerCircleNFT = (taxon) => {
    return taxon >= 1 && taxon <= 100;
};

// eslint-disable-next-line no-unused-vars
const calculateTotalRewards = async (walletAddress) => {
    const stakedNFTs = await fetchUserStakedNFTs(walletAddress);
    return stakedNFTs.length * STAKING_CONFIG.DAILY_EMISSION;
};

// eslint-disable-next-line no-unused-vars
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

// Health check function to test all nodes
export const checkXrplNodesHealth = async () => {
    const results = {};
    
    for (const node of XRPL_NODES) {
        try {
            console.log(`Testing connection to ${node}...`);
            
            // Create a temporary client for this test
            const testClient = new Client(node, {
                connectionTimeout: 10000,
                timeout: 10000
            });
            
            // Try to connect
            const startTime = Date.now();
            await testClient.connect();
            const connectionTime = Date.now() - startTime;
            
            // Make a simple request to test responsiveness
            const serverInfo = await testClient.request({
                command: 'server_info'
            });
            
            // Disconnect the test client
            await testClient.disconnect();
            
            // Store the result
            results[node] = {
                status: 'available',
                connectionTime: `${connectionTime}ms`,
                serverVersion: serverInfo.result?.info?.build_version || 'unknown',
                peers: serverInfo.result?.info?.peers || 0
            };
        } catch (error) {
            results[node] = {
                status: 'unavailable',
                error: error.message
            };
        }
    }
    
    return results;
}; 