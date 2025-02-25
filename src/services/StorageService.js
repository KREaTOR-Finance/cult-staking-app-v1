// StorageService.js - Utility functions for local storage management

const STORAGE_KEYS = {
    SELECTED_PFP: 'selectedPFP',
    PFP_METADATA: 'pfpMetadata',
    WALLET_ADDRESS: 'walletAddress',
    PFP_CACHE_PREFIX: 'pfp_img_cache_'
};

/**
 * Save the selected NFT ID as profile picture for the given wallet
 * @param {string} walletAddress - The user's wallet address
 * @param {string} nftId - The ID of the selected NFT
 * @param {object} nftMetadata - Metadata about the NFT to persist (image URL, name, etc.)
 */
export const saveSelectedPFP = (walletAddress, nftId, nftMetadata) => {
    try {
        // Store the selected NFT ID in both localStorage and sessionStorage for redundancy
        localStorage.setItem(STORAGE_KEYS.SELECTED_PFP + '_' + walletAddress, nftId);
        sessionStorage.setItem(STORAGE_KEYS.SELECTED_PFP + '_' + walletAddress, nftId);
        
        // Store the NFT metadata to display even if NFT is no longer in wallet
        if (nftMetadata) {
            const metadataString = JSON.stringify(nftMetadata);
            localStorage.setItem(
                STORAGE_KEYS.PFP_METADATA + '_' + walletAddress, 
                metadataString
            );
            sessionStorage.setItem(
                STORAGE_KEYS.PFP_METADATA + '_' + walletAddress, 
                metadataString
            );
            
            // Also cache the image URL for immediate access
            if (nftMetadata.image) {
                localStorage.setItem(
                    STORAGE_KEYS.PFP_CACHE_PREFIX + nftId,
                    nftMetadata.image
                );
                sessionStorage.setItem(
                    STORAGE_KEYS.PFP_CACHE_PREFIX + nftId,
                    nftMetadata.image
                );
            }
        }

        return true;
    } catch (error) {
        console.error('Error saving selected PFP:', error);
        // Try sessionStorage as fallback if localStorage fails
        try {
            sessionStorage.setItem(STORAGE_KEYS.SELECTED_PFP + '_' + walletAddress, nftId);
            
            if (nftMetadata) {
                sessionStorage.setItem(
                    STORAGE_KEYS.PFP_METADATA + '_' + walletAddress, 
                    JSON.stringify(nftMetadata)
                );
                
                if (nftMetadata.image) {
                    sessionStorage.setItem(
                        STORAGE_KEYS.PFP_CACHE_PREFIX + nftId,
                        nftMetadata.image
                    );
                }
            }
            return true;
        } catch (sessionError) {
            console.error('Error saving to sessionStorage:', sessionError);
            return false;
        }
    }
};

/**
 * Get the selected NFT ID for the given wallet
 * @param {string} walletAddress - The user's wallet address
 * @returns {string|null} The selected NFT ID or null if none selected
 */
export const getSelectedPFP = (walletAddress) => {
    try {
        // Try localStorage first
        const pfp = localStorage.getItem(STORAGE_KEYS.SELECTED_PFP + '_' + walletAddress);
        if (pfp) return pfp;
        
        // Fall back to sessionStorage if localStorage fails
        return sessionStorage.getItem(STORAGE_KEYS.SELECTED_PFP + '_' + walletAddress);
    } catch (error) {
        console.error('Error getting selected PFP from localStorage:', error);
        // Try sessionStorage as fallback
        try {
            return sessionStorage.getItem(STORAGE_KEYS.SELECTED_PFP + '_' + walletAddress);
        } catch (sessionError) {
            console.error('Error getting from sessionStorage:', sessionError);
            return null;
        }
    }
};

/**
 * Get the metadata for the selected NFT
 * @param {string} walletAddress - The user's wallet address
 * @returns {object|null} The NFT metadata or null if not found
 */
export const getSelectedPFPMetadata = (walletAddress) => {
    try {
        // Try localStorage first
        const metadataString = localStorage.getItem(STORAGE_KEYS.PFP_METADATA + '_' + walletAddress);
        if (metadataString) return JSON.parse(metadataString);
        
        // Fall back to sessionStorage
        const sessionMetadataString = sessionStorage.getItem(STORAGE_KEYS.PFP_METADATA + '_' + walletAddress);
        return sessionMetadataString ? JSON.parse(sessionMetadataString) : null;
    } catch (error) {
        console.error('Error getting PFP metadata from localStorage:', error);
        // Try sessionStorage as fallback
        try {
            const sessionMetadataString = sessionStorage.getItem(STORAGE_KEYS.PFP_METADATA + '_' + walletAddress);
            return sessionMetadataString ? JSON.parse(sessionMetadataString) : null;
        } catch (sessionError) {
            console.error('Error getting from sessionStorage:', sessionError);
            return null;
        }
    }
};

/**
 * Clear the selected PFP for the given wallet
 * @param {string} walletAddress - The user's wallet address
 */
export const clearSelectedPFP = (walletAddress) => {
    try {
        // Get the NFT ID before clearing to also clear the image cache
        const nftId = getSelectedPFP(walletAddress);
        
        // Clear from localStorage
        localStorage.removeItem(STORAGE_KEYS.SELECTED_PFP + '_' + walletAddress);
        localStorage.removeItem(STORAGE_KEYS.PFP_METADATA + '_' + walletAddress);
        
        // Clear from sessionStorage
        sessionStorage.removeItem(STORAGE_KEYS.SELECTED_PFP + '_' + walletAddress);
        sessionStorage.removeItem(STORAGE_KEYS.PFP_METADATA + '_' + walletAddress);
        
        // Also clear the image cache if we have an NFT ID
        if (nftId) {
            localStorage.removeItem(STORAGE_KEYS.PFP_CACHE_PREFIX + nftId);
            sessionStorage.removeItem(STORAGE_KEYS.PFP_CACHE_PREFIX + nftId);
        }
        
        return true;
    } catch (error) {
        console.error('Error clearing selected PFP:', error);
        return false;
    }
};

/**
 * Save the current wallet address
 * @param {string} walletAddress - The user's wallet address
 */
export const saveWalletAddress = (walletAddress) => {
    try {
        localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, walletAddress);
        sessionStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, walletAddress);
        return true;
    } catch (error) {
        console.error('Error saving wallet address to localStorage:', error);
        // Try sessionStorage as fallback
        try {
            sessionStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, walletAddress);
            return true;
        } catch (sessionError) {
            console.error('Error saving to sessionStorage:', sessionError);
            return false;
        }
    }
};

/**
 * Get the saved wallet address
 * @returns {string|null} The saved wallet address or null if not found
 */
export const getWalletAddress = () => {
    try {
        // Try localStorage first
        const address = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
        if (address) return address;
        
        // Fall back to sessionStorage
        return sessionStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
    } catch (error) {
        console.error('Error getting wallet address from localStorage:', error);
        // Try sessionStorage as fallback
        try {
            return sessionStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
        } catch (sessionError) {
            console.error('Error getting from sessionStorage:', sessionError);
            return null;
        }
    }
}; 