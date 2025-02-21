import { useState, useCallback } from 'react';
import { Client } from 'xrpl';
import * as XRPLService from '../services/XRPLService';
import { useXRPL } from './useXRPL';
import { useXaman } from './useXaman';
import { STAKING_CONFIG } from '../config';

const XRPL_NODE = process.env.REACT_APP_XRPL_MAINNET_URL || 'wss://xrplcluster.com';
const STAKING_CONTRACT = process.env.REACT_APP_STAKING_CONTRACT;

export const useStaking = () => {
    const { fetchNFTs, fetchStakedNFTs, fetchStats } = useXRPL();
    const { walletAddress, signTransaction } = useXaman();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stakingInfo, setStakingInfo] = useState({
        rewards: 0,
        penalty: 0,
        canUnstake: true
    });

    // Calculate rewards for a staked NFT
    const calculateRewards = useCallback((stakedDate, isInnerCircle) => {
        const now = new Date();
        const stakingStartDate = new Date(stakedDate);
        const stakingDays = Math.floor((now - stakingStartDate) / (24 * 60 * 60 * 1000));
        
        // Get the current staking year
        const yearsSinceStart = Math.floor(
            (now - STAKING_CONFIG.STAKING_START_DATE) / (365 * 24 * 60 * 60 * 1000)
        );
        const currentYear = Math.min(yearsSinceStart + 1, 5);
        
        // Get daily emission for current year
        const dailyEmission = STAKING_CONFIG.EMISSION_SCHEDULE[`YEAR_${currentYear}`];
        
        // Calculate base rewards
        let rewards = stakingDays * dailyEmission;
        
        // Apply Inner Circle bonus if applicable
        if (isInnerCircle) {
            rewards *= (1 + STAKING_CONFIG.INNER_CIRCLE_BONUS / 100);
        }
        
        return Math.floor(rewards);
    }, []);

    // Check if early unstaking penalty applies
    const checkEarlyUnstaking = useCallback((stakedDate) => {
        const now = new Date();
        const stakingStartDate = new Date(stakedDate);
        const stakingDuration = now - stakingStartDate;
        return stakingDuration < STAKING_CONFIG.MIN_STAKING_PERIOD;
    }, []);

    // Calculate early unstaking penalty
    const calculatePenalty = useCallback((rewards) => {
        return Math.floor(rewards * (STAKING_CONFIG.EARLY_UNSTAKING_PENALTY / 100));
    }, []);

    // Update staking info when checking or preparing to unstake
    const updateStakingInfo = useCallback(async (nftId, stakedDate, isInnerCircle) => {
        const rewards = calculateRewards(stakedDate, isInnerCircle);
        const isEarlyUnstake = checkEarlyUnstaking(stakedDate);
        const penalty = isEarlyUnstake ? calculatePenalty(rewards) : 0;

        setStakingInfo({
            rewards,
            penalty,
            canUnstake: true
        });

        return { rewards, penalty, canUnstake: true };
    }, [calculateRewards, checkEarlyUnstaking, calculatePenalty]);

    const stakeNFT = useCallback(async (nftId) => {
        setLoading(true);
        setError(null);
        
        try {
            const client = new Client(XRPL_NODE);
            await client.connect();

            // Create NFT offer to the staking contract
            const tx = {
                TransactionType: 'NFTokenCreateOffer',
                Account: window.xrpl?.address,
                NFTokenID: nftId,
                Destination: STAKING_CONTRACT,
                Amount: '0',
                Flags: 1
            };

            const prepared = await client.autofill(tx);
            const result = await client.submit(prepared);

            if (result.result.meta.TransactionResult === 'tesSUCCESS') {
                // Refresh NFT lists and stats after successful stake
                await Promise.all([
                    fetchNFTs(walletAddress),
                    fetchStakedNFTs(walletAddress),
                    fetchStats(walletAddress)
                ]);
            }

            await client.disconnect();
            return result.result.meta.TransactionResult === 'tesSUCCESS';
        } catch (err) {
            setError('Failed to stake NFT: ' + err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [fetchNFTs, fetchStakedNFTs, fetchStats, walletAddress]);

    const unstakeNFT = useCallback(async (nftId, stakedDate, isInnerCircle) => {
        setLoading(true);
        setError(null);

        try {
            // Check staking info before unstaking
            const { penalty } = await updateStakingInfo(nftId, stakedDate, isInnerCircle);
            
            const client = new Client(XRPL_NODE);
            await client.connect();

            // Create unstake transaction
            const tx = {
                TransactionType: 'NFTokenCreateOffer',
                Account: STAKING_CONTRACT,
                NFTokenID: nftId,
                Destination: window.xrpl?.address,
                Amount: '0',
                Flags: penalty > 0 ? 2 : 1 // Flag 2 indicates penalty
            };

            const prepared = await client.autofill(tx);
            const result = await client.submit(prepared);

            if (result.result.meta.TransactionResult === 'tesSUCCESS') {
                // Refresh NFT lists and stats after successful unstake
                await Promise.all([
                    fetchNFTs(walletAddress),
                    fetchStakedNFTs(walletAddress),
                    fetchStats(walletAddress)
                ]);
            }

            await client.disconnect();
            return result.result.meta.TransactionResult === 'tesSUCCESS';
        } catch (err) {
            setError('Failed to unstake NFT: ' + err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [fetchNFTs, fetchStakedNFTs, fetchStats, walletAddress, updateStakingInfo]);

    return {
        stakeNFT,
        unstakeNFT,
        loading,
        error,
        stakingInfo,
        calculateRewards,
        checkEarlyUnstaking,
        calculatePenalty,
        updateStakingInfo
    };
}; 