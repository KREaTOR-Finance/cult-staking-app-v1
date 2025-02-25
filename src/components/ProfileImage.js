import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useXRPL } from '../hooks/useXRPL';

const ProfileImage = ({ walletAddress, size = 'normal' }) => {
    const { selectedPFP, pfpMetadata } = useXRPL();
    const [imageLoadError, setImageLoadError] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const imgRef = useRef(null);
    
    // Determine size class
    const sizeClass = size === 'small' ? 'profile-image-sm' : 
                     size === 'large' ? 'profile-image-lg' : '';
    
    // Clean up function to prevent memory leaks with image loading
    const cleanupImage = useCallback(() => {
        if (imgRef.current) {
            imgRef.current.onload = null;
            imgRef.current.onerror = null;
            imgRef.current = null;
        }
    }, []);
    
    // Try to get image from cache with improved reliability
    const tryGetCachedImage = useCallback((nftId) => {
        if (!nftId) return null;
        try {
            // First try localStorage cache
            const cache = localStorage.getItem(`pfp_img_cache_${nftId}`);
            if (cache) return cache;
            
            // If no localStorage cache but we have metadata, use that
            if (pfpMetadata && pfpMetadata.id === nftId && pfpMetadata.image) {
                return pfpMetadata.image;
            }
            
            // If we have a sessionStorage backup, use that
            const sessionCache = sessionStorage.getItem(`pfp_img_cache_${nftId}`);
            return sessionCache || null;
        } catch (e) {
            console.error('Error accessing image cache:', e);
            return null;
        }
    }, [pfpMetadata]);
    
    // Prefetch and cache image with improved reliability
    const prefetchAndCacheImage = useCallback((imageUrl, nftId) => {
        if (!imageUrl || !nftId) {
            return;
        }
        
        // Immediately set the image URL to avoid delay in UI
        setProfileImage(imageUrl);
        
        // Clean up any existing image ref
        cleanupImage();
        
        // Create new image object
        const img = new Image();
        imgRef.current = img;
        
        img.onload = () => {
            try {
                // Cache in both localStorage and sessionStorage for redundancy
                localStorage.setItem(`pfp_img_cache_${nftId}`, imageUrl);
                sessionStorage.setItem(`pfp_img_cache_${nftId}`, imageUrl);
            } catch (e) {
                console.error('Error caching image URL:', e);
                // Try sessionStorage as fallback if localStorage fails
                try {
                    sessionStorage.setItem(`pfp_img_cache_${nftId}`, imageUrl);
                } catch (sessionError) {
                    console.error('Error caching in sessionStorage:', sessionError);
                }
            }
            
            // Clean up after successful load
            img.onload = null;
            img.onerror = null;
        };
        
        img.onerror = () => {
            // Clean up after error
            img.onload = null;
            img.onerror = null;
            setImageLoadError(true);
        };
        
        img.src = imageUrl;
    }, [cleanupImage]);
    
    // Remove failed image from cache
    const removeFromImageCache = useCallback((nftId) => {
        try {
            localStorage.removeItem(`pfp_img_cache_${nftId}`);
            sessionStorage.removeItem(`pfp_img_cache_${nftId}`);
        } catch (e) {
            console.error('Error removing image from cache:', e);
        }
    }, []);
    
    useEffect(() => {
        // Reset error state when NFT selection changes
        setImageLoadError(false);
        
        // If no selected PFP, clear the image
        if (!selectedPFP) {
            setProfileImage(null);
            return;
        }
        
        // Try to load from cache first
        const cachedImage = tryGetCachedImage(selectedPFP);
        if (cachedImage) {
            setProfileImage(cachedImage);
            return;
        }
        
        // Determine what image to show
        if (selectedPFP && pfpMetadata && pfpMetadata.image) {
            // Prefetch and cache the image
            prefetchAndCacheImage(pfpMetadata.image, selectedPFP);
            // Set image immediately to avoid delay
            setProfileImage(pfpMetadata.image);
        } else {
            setProfileImage(null);
        }
        
        // Clean up function to run when component unmounts or dependencies change
        return () => {
            cleanupImage();
        };
    }, [selectedPFP, pfpMetadata, prefetchAndCacheImage, tryGetCachedImage, cleanupImage]);
    
    const handleImageError = useCallback(() => {
        setImageLoadError(true);
        
        // Remove from cache if it failed to load
        if (selectedPFP) {
            removeFromImageCache(selectedPFP);
        }
        
        // Set profile image to null to show the initial
        setProfileImage(null);
    }, [selectedPFP, removeFromImageCache]);
    
    // Get initial for fallback
    const getInitial = (address) => {
        return address ? address.charAt(0).toUpperCase() : 'R';
    };
    
    if (profileImage && !imageLoadError) {
        return (
            <img 
                src={profileImage}
                alt="Profile"
                className={`profile-nft-image ${sizeClass}`}
                onError={handleImageError}
                loading="lazy"
            />
        );
    }
    
    // Fallback to initial
    return (
        <span className={`profile-initial ${sizeClass}`}>
            {getInitial(walletAddress)}
        </span>
    );
};

export default ProfileImage; 