import { useState, useEffect, useCallback } from 'react';
import * as XRPLService from '../services/XRPLService';
import * as StorageService from '../services/StorageService';

export const useXRPL = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [userNFTs, setUserNFTs] = useState([]);
    const [stakedNFTs, setStakedNFTs] = useState([]);
    const [userStats, setUserStats] = useState({
        totalStaked: 0,
        totalRewards: 0,
        stakingRank: 0,
        hasInnerCircle: false,
        address: ''
    });
    const [selectedPFP, setSelectedPFP] = useState(null);
    const [pfpMetadata, setPfpMetadata] = useState(null);
    const [topStakers, setTopStakers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [walletAddress, setWalletAddress] = useState(StorageService.getWalletAddress());
    const [nodesStatus, setNodesStatus] = useState(null);

    // Connect to XRPL with improved error handling
    const connect = useCallback(async () => {
        setLoading(true);
        try {
            const connected = await XRPLService.connectToXRPL();
            setIsConnected(connected);
            if (!connected) {
                setError('Failed to connect to any XRPL nodes. Please try again later.');
            } else {
                setError(null);
            }
        } catch (err) {
            setError(`Failed to connect to XRPL: ${err.message}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const disconnect = useCallback(async () => {
        try {
            await XRPLService.disconnectFromXRPL();
            setIsConnected(false);
            setError(null);
        } catch (err) {
            setError('Failed to disconnect from XRPL');
            console.error(err);
        }
    }, []);

    // Check the health status of all XRPL nodes
    const checkNodesHealth = useCallback(async () => {
        setLoading(true);
        try {
            const healthStatus = await XRPLService.checkXrplNodesHealth();
            setNodesStatus(healthStatus);
            
            // Count available nodes
            const availableNodes = Object.values(healthStatus)
                .filter(node => node.status === 'available')
                .length;
                
            if (availableNodes === 0) {
                setError('No XRPL nodes are currently available. Service may be degraded.');
            } else {
                setError(null);
            }
            
            return healthStatus;
        } catch (err) {
            setError('Failed to check XRPL nodes health');
            console.error(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Enhanced fetchNFTs with automatic retries
    const fetchNFTs = useCallback(async (address) => {
        if (!address) {
            console.log('No wallet address provided for fetchNFTs');
            return [];
        }
        
        setLoading(true);
        try {
            const nfts = await XRPLService.fetchUserNFTs(address);
            setUserNFTs(nfts);
            setError(null);
            return nfts;
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch NFTs';
            setError(errorMessage);
            console.error(err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStakedNFTs = useCallback(async (address) => {
        if (!address) {
            console.log('No wallet address provided for fetchStakedNFTs');
            return [];
        }
        
        setLoading(true);
        try {
            const nfts = await XRPLService.fetchUserStakedNFTs(address);
            setStakedNFTs(nfts);
            setError(null);
            return nfts;
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch staked NFTs';
            setError(errorMessage);
            console.error(err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async (address) => {
        if (!address) {
            console.log('No wallet address provided for fetchStats');
            return null;
        }
        
        setLoading(true);
        try {
            const stats = await XRPLService.fetchUserStats(address);
            setUserStats(stats);
            
            // Save wallet address to storage
            StorageService.saveWalletAddress(address);
            setWalletAddress(address);
            
            // Load saved PFP from storage if available
            const savedPFP = StorageService.getSelectedPFP(address);
            if (savedPFP) {
                setSelectedPFP(savedPFP);
                
                // Load saved metadata
                const metadata = StorageService.getSelectedPFPMetadata(address);
                if (metadata) {
                    setPfpMetadata(metadata);
                }
            }
            
            setError(null);
            return stats;
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch user stats';
            setError(errorMessage);
            console.error(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle setting a profile picture (PFP) from an NFT
    const updatePFP = useCallback(async (nftId, explicitWalletAddress, nftData) => {
        // Use provided wallet address or fall back to state
        const addressToUse = explicitWalletAddress || walletAddress;
        
        if (!nftId) {
            console.error('updatePFP: No NFT ID provided');
            return false;
        }
        
        if (!addressToUse) {
            console.error('Cannot update PFP: No wallet address available');
            return false;
        }
        
        try {
            // If this NFT is already selected, just return success
            if (selectedPFP === nftId) {
                return true;
            }
            
            // If nftData is provided directly, use that
            let nft = null;
            if (nftData) {
                nft = nftData;
            } else {
                // Otherwise try to find the NFT in user or staked NFTs
                const allNFTs = [...userNFTs, ...stakedNFTs];
                nft = allNFTs.find(n => n.id === nftId);
            }
            
            if (!nft) {
                console.warn(`NFT with ID ${nftId} not found in available NFTs and no direct data provided`);
                
                // If we have metadata for this NFT already, use that
                const existingMetadata = StorageService.getSelectedPFPMetadata(addressToUse);
                if (existingMetadata && existingMetadata.id === nftId) {
                    // Update state immediately for responsive UI
                    setSelectedPFP(nftId);
                    setPfpMetadata(existingMetadata);
                    
                    // Pre-cache the image for immediate access
                    if (existingMetadata.image) {
                        try {
                            localStorage.setItem(`pfp_img_cache_${nftId}`, existingMetadata.image);
                            sessionStorage.setItem(`pfp_img_cache_${nftId}`, existingMetadata.image);
                        } catch (e) {
                            console.error('Error caching image URL:', e);
                        }
                        
                        // Prefetch the image to ensure it's in browser cache
                        const img = new Image();
                        img.src = existingMetadata.image;
                    }
                    
                    return true;
                }
                
                return false;
            }
            
            // Create metadata object to persist
            const metadata = {
                id: nft.id,
                name: nft.name,
                image: nft.image,
                isInnerCircle: nft.isInnerCircle
            };
            
            // Update state immediately for responsive UI
            setSelectedPFP(nftId);
            setPfpMetadata(metadata);
            
            // Pre-cache the image for immediate access
            if (nft.image) {
                try {
                    localStorage.setItem(`pfp_img_cache_${nftId}`, nft.image);
                    sessionStorage.setItem(`pfp_img_cache_${nftId}`, nft.image);
                } catch (e) {
                    console.error('Error caching image URL:', e);
                    // Try sessionStorage as fallback
                    try {
                        sessionStorage.setItem(`pfp_img_cache_${nftId}`, nft.image);
                    } catch (sessionError) {
                        console.error('Error caching in sessionStorage:', sessionError);
                    }
                }
                
                // Prefetch the image to ensure it's in browser cache
                const img = new Image();
                img.src = nft.image;
            }
            
            // Save to storage in the background
            let success = false;
            try {
                success = StorageService.saveSelectedPFP(addressToUse, nftId, metadata);
            } catch (storageError) {
                console.error('Failed to save PFP selection to storage:', storageError);
                // We already updated the UI, so consider this a partial success
                success = true;
            }
            
            return success;
        } catch (err) {
            console.error('Failed to update PFP:', err);
            return false;
        }
    }, [walletAddress, userNFTs, stakedNFTs, selectedPFP]);

    const clearPFP = useCallback(() => {
        if (!walletAddress) return false;
        
        // Update state immediately for responsive UI
        setSelectedPFP(null);
        setPfpMetadata(null);
        
        // Clear storage in the background
        const success = StorageService.clearSelectedPFP(walletAddress);
        
        return success;
    }, [walletAddress]);

    // Handle setting a custom uploaded profile picture
    const uploadCustomPFP = useCallback((imageFile, explicitWalletAddress) => {
        // Use provided wallet address or fall back to state
        const addressToUse = explicitWalletAddress || walletAddress;
        
        if (!imageFile) {
            console.error('uploadCustomPFP: No image file provided');
            return false;
        }
        
        if (!addressToUse) {
            console.error('Cannot upload custom PFP: No wallet address available');
            return false;
        }
        
        try {
            // Create a unique ID for the custom PFP
            const customId = `custom_${Date.now()}`;
            
            // Create a URL for the uploaded image
            const imageUrl = URL.createObjectURL(imageFile);
            
            // Create metadata object to persist
            const metadata = {
                id: customId,
                name: 'Custom Profile Picture',
                image: imageUrl,
                isCustom: true,
                originalFile: imageFile
            };
            
            // Save to storage
            let success = false;
            
            try {
                // Convert image to base64 for storage
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Image = reader.result;
                    metadata.base64Image = base64Image;
                    
                    // Save to storage
                    success = StorageService.saveSelectedPFP(addressToUse, customId, metadata);
                    
                    if (success) {
                        // Update state
                        setSelectedPFP(customId);
                        setPfpMetadata(metadata);
                    }
                };
                reader.readAsDataURL(imageFile);
                
                // Return true to indicate the process has started
                return true;
            } catch (storageError) {
                console.error('Failed to save custom PFP to storage:', storageError);
                URL.revokeObjectURL(imageUrl);
                return false;
            }
        } catch (err) {
            console.error('Failed to upload custom PFP:', err);
            return false;
        }
    }, [walletAddress]);

    const fetchTopStakers = useCallback(async (timeframe = 'all') => {
        setLoading(true);
        try {
            const stakers = await XRPLService.fetchTopStakers(timeframe);
            setTopStakers(stakers);
            setError(null);
            return stakers;
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch top stakers';
            setError(errorMessage);
            console.error(err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize connection with improved reliability
    useEffect(() => {
        let isActive = true;
        let connectionCheckInterval = null;

        const initializeConnection = async () => {
            if (!isActive) return;
            
            try {
                const connected = await XRPLService.connectToXRPL();
                if (isActive) {
                    setIsConnected(connected);
                    if (connected) {
                        setError(null);
                    } else {
                        // Don't set error here to avoid spamming the UI
                        console.warn('XRPL connection attempt failed silently');
                    }
                }
            } catch (err) {
                if (isActive) {
                    // Only log the error, don't update state on initial loads to prevent UI flicker
                    console.error('Failed to connect to XRPL:', err);
                }
            }
        };
        
        // Run initial connection
        initializeConnection();
        
        // Set up periodic connection checks (every 3 minutes)
        connectionCheckInterval = setInterval(() => {
            if (isActive) {
                // Just check if we're still connected, don't show errors
                XRPLService.connectToXRPL()
                    .then(connected => {
                        if (isActive) {
                            setIsConnected(connected);
                        }
                    })
                    .catch(err => {
                        console.error('Error during scheduled connection check:', err);
                    });
            }
        }, 3 * 60 * 1000); // Check every 3 minutes
        
        // Load wallet and PFP on initial render
        const savedWallet = StorageService.getWalletAddress();
        if (savedWallet) {
            setWalletAddress(savedWallet);
            
            // Load saved PFP
            const savedPFP = StorageService.getSelectedPFP(savedWallet);
            if (savedPFP) {
                setSelectedPFP(savedPFP);
                
                // Load saved metadata
                const metadata = StorageService.getSelectedPFPMetadata(savedWallet);
                if (metadata) {
                    setPfpMetadata(metadata);
                }
            }
        }
        
        // Run a health check on initial load
        checkNodesHealth().catch(console.error);
        
        return () => {
            isActive = false;
            if (connectionCheckInterval) {
                clearInterval(connectionCheckInterval);
            }
            disconnect().catch(console.error);
        };
    }, [connect, disconnect, checkNodesHealth]);

    return {
        isConnected,
        userNFTs,
        stakedNFTs,
        userStats,
        selectedPFP,
        pfpMetadata,
        topStakers,
        loading,
        error,
        walletAddress,
        nodesStatus,
        connect,
        disconnect,
        fetchNFTs,
        fetchStakedNFTs,
        fetchStats,
        updatePFP,
        clearPFP,
        uploadCustomPFP,
        fetchTopStakers,
        checkNodesHealth
    };
}; 