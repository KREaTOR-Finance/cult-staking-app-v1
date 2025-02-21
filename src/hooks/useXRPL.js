import { useState, useEffect, useCallback } from 'react';
import * as XRPLService from '../services/XRPLService';

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
    const [topStakers, setTopStakers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const connect = useCallback(async () => {
        setLoading(true);
        try {
            const connected = await XRPLService.connectToXRPL();
            setIsConnected(connected);
            setError(null);
        } catch (err) {
            setError('Failed to connect to XRPL');
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

    const fetchNFTs = useCallback(async (walletAddress) => {
        if (!isConnected || !walletAddress) return;
        setLoading(true);
        try {
            const nfts = await XRPLService.fetchUserNFTs(walletAddress);
            setUserNFTs(nfts);
            setError(null);
        } catch (err) {
            setError('Failed to fetch NFTs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [isConnected]);

    const fetchStakedNFTs = useCallback(async (walletAddress) => {
        if (!isConnected || !walletAddress) return;
        setLoading(true);
        try {
            const nfts = await XRPLService.fetchUserStakedNFTs(walletAddress);
            setStakedNFTs(nfts);
            setError(null);
        } catch (err) {
            setError('Failed to fetch staked NFTs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [isConnected]);

    const fetchStats = useCallback(async (walletAddress) => {
        if (!isConnected || !walletAddress) return;
        setLoading(true);
        try {
            const stats = await XRPLService.fetchUserStats(walletAddress);
            setUserStats(stats);
            setError(null);
        } catch (err) {
            setError('Failed to fetch user stats');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [isConnected]);

    const updatePFP = useCallback(async (walletAddress, nftId) => {
        if (!isConnected || !walletAddress) return false;
        setLoading(true);
        try {
            const success = await XRPLService.updateUserPFP(walletAddress, nftId);
            if (success) {
                setSelectedPFP(nftId);
            }
            setError(null);
            return success;
        } catch (err) {
            setError('Failed to update PFP');
            console.error(err);
            return false;
        } finally {
            setLoading(false);
        }
    }, [isConnected]);

    const fetchTopStakers = useCallback(async (timeframe = 'all') => {
        if (!isConnected) return;
        setLoading(true);
        try {
            const stakers = await XRPLService.fetchTopStakers(timeframe);
            setTopStakers(stakers);
            setError(null);
        } catch (err) {
            setError('Failed to fetch top stakers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [isConnected]);

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        isConnected,
        userNFTs,
        stakedNFTs,
        userStats,
        selectedPFP,
        topStakers,
        loading,
        error,
        connect,
        disconnect,
        fetchNFTs,
        fetchStakedNFTs,
        fetchStats,
        updatePFP,
        fetchTopStakers
    };
}; 