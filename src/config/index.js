console.log('Loading config with env:', {
    NETWORK: process.env.REACT_APP_XRPL_NETWORK,
    MAINNET_URL: process.env.REACT_APP_XRPL_MAINNET_URL
});

// XRPL Network Configuration
export const XRPL_CONFIG = {
    NETWORK: process.env.REACT_APP_XRPL_NETWORK || 'MAINNET',
    MAINNET: {
        wsUrl: process.env.REACT_APP_XRPL_MAINNET_URL || 'wss://xrplcluster.com',
        explorerUrl: process.env.REACT_APP_XRPL_MAINNET_EXPLORER || 'https://livenet.xrpl.org'
    },
    TESTNET: {
        wsUrl: 'wss://s.altnet.rippletest.net:51233',
        explorerUrl: 'https://testnet.xrpl.org'
    }
};

// CULT Token Configuration
export const CULT_TOKEN = {
    ISSUER: process.env.REACT_APP_CULT_TOKEN_ISSUER,
    CURRENCY: 'CULT'
};

// Staking Configuration
export const STAKING_CONFIG = {
    CONTRACT_ADDRESS: process.env.REACT_APP_STAKING_CONTRACT,
    DAILY_EMISSION: parseInt(process.env.REACT_APP_DAILY_EMISSION_YEAR_1) || 205479,
    INNER_CIRCLE_BONUS: parseInt(process.env.REACT_APP_INNER_CIRCLE_BONUS) || 20, // 20% bonus
    EARLY_UNSTAKING_PENALTY: parseInt(process.env.REACT_APP_EARLY_UNSTAKING_PENALTY) || 50, // 50% penalty
    MIN_STAKING_PERIOD: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    EMISSION_SCHEDULE: {
        YEAR_1: parseInt(process.env.REACT_APP_DAILY_EMISSION_YEAR_1) || 205479,
        YEAR_2: parseInt(process.env.REACT_APP_DAILY_EMISSION_YEAR_2) || 342466,
        YEAR_3: parseInt(process.env.REACT_APP_DAILY_EMISSION_YEAR_3) || 410958,
        YEAR_4: parseInt(process.env.REACT_APP_DAILY_EMISSION_YEAR_4) || 342466,
        YEAR_5: parseInt(process.env.REACT_APP_DAILY_EMISSION_YEAR_5) || 202740
    },
    STAKING_START_DATE: new Date(process.env.REACT_APP_STAKING_START_DATE || '2024-01-01')
};

// NFT Configuration
export const NFT_CONFIG = {
    IPFS_GATEWAY: process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
    INNER_CIRCLE_RANGE: {
        MIN: 1,
        MAX: 100
    }
}; 