import { useState, useCallback, useEffect } from 'react';
import XamanService from '../services/XamanService';

export const useXaman = () => {
    const [walletAddress, setWalletAddress] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sdkReady, setSdkReady] = useState(false);

    // Check SDK initialization status
    useEffect(() => {
        const checkSdk = async () => {
            try {
                if (XamanService.sdk) {
                    setSdkReady(true);
                    setError(null);
                } else {
                    setSdkReady(false);
                    setError('Xaman SDK not initialized');
                }
            } catch (err) {
                console.error('❌ SDK Check Error:', err);
                setSdkReady(false);
                setError('Failed to initialize Xaman SDK');
            }
        };
        
        checkSdk();
    }, []);

    const connect = useCallback(async () => {
        if (!sdkReady) {
            setError('Xaman SDK not ready. Please check your configuration.');
            return false;
        }

        setLoading(true);
        try {
            const address = await XamanService.getConnectedAddress();
            if (address) {
                setWalletAddress(address);
                setIsConnected(true);
                setError(null);
                return true;
            }
            return false;
        } catch (err) {
            console.error('❌ Wallet Connection Error:', err);
            setError('Failed to connect wallet');
            return false;
        } finally {
            setLoading(false);
        }
    }, [sdkReady]);

    const disconnect = useCallback(async () => {
        try {
            await XamanService.disconnect();
            setWalletAddress('');
            setIsConnected(false);
            setError(null);
        } catch (err) {
            console.error('❌ Wallet Disconnect Error:', err);
            setError('Failed to disconnect wallet');
        }
    }, []);

    const signTransaction = useCallback(async (transaction) => {
        if (!isConnected) {
            setError('Wallet not connected');
            return { success: false };
        }

        if (!sdkReady) {
            setError('Xaman SDK not ready');
            return { success: false };
        }

        setLoading(true);
        try {
            const result = await XamanService.signTransaction(transaction);
            setError(null);
            return { success: true, result };
        } catch (err) {
            console.error('❌ Transaction Signing Error:', err);
            setError('Failed to sign transaction');
            return { success: false };
        } finally {
            setLoading(false);
        }
    }, [isConnected, sdkReady]);

    useEffect(() => {
        const checkConnection = async () => {
            if (sdkReady) {
                try {
                    const address = await XamanService.getConnectedAddress();
                    if (address) {
                        setWalletAddress(address);
                        setIsConnected(true);
                    }
                } catch (err) {
                    console.error('❌ Connection Check Error:', err);
                }
            }
        };
        
        checkConnection();
    }, [sdkReady]);

    return {
        walletAddress,
        isConnected,
        loading,
        error,
        sdkReady,
        connect,
        disconnect,
        signTransaction
    };
}; 