export const XRPL_CONFIG = {
  NETWORK: process.env.REACT_APP_XRPL_NETWORK || 'mainnet',
  MAINNET: {
    wsUrl: 'wss://xrplcluster.com',
    explorer: 'https://livenet.xrpl.org'
  },
  TESTNET: {
    wsUrl: 'wss://s.altnet.rippletest.net:51233',
    explorer: 'https://testnet.xrpl.org'
  }
};

export const XAMAN_CONFIG = {
  API_KEY: process.env.REACT_APP_XAMAN_API_KEY,
  API_URL: 'https://xumm.app/api/v1',
  ENVIRONMENT: process.env.NODE_ENV === 'development' ? 'dev' : 'prod'
};

export const CULT_TOKEN = {
  name: 'CULT',
  issuer: process.env.REACT_APP_CULT_TOKEN_ISSUER,
  currency: 'CULT',
  decimals: 6
};

export const STAKING_CONFIG = {
  CONTRACT_ADDRESS: process.env.REACT_APP_STAKING_CONTRACT,
  DAILY_EMISSION: parseInt(process.env.REACT_APP_DAILY_EMISSION || '500000'),
  INNER_CIRCLE_BONUS: parseInt(process.env.REACT_APP_INNER_CIRCLE_BONUS || '20'),
  EARLY_UNSTAKE_PENALTY: parseInt(process.env.REACT_APP_EARLY_UNSTAKE_PENALTY || '25'),
  MIN_STAKE_DURATION: parseInt(process.env.REACT_APP_MIN_STAKE_DURATION || '7'),
  minStakeAmount: 100,
  maxStakeAmount: 10000000,
  earlyUnlockPenalty: 0.5, // 50%
  pools: [
    {
      duration: 60,
      apy: 5,
      minStake: 100
    },
    {
      duration: 180,
      apy: 10,
      minStake: 500
    },
    {
      duration: 365,
      apy: 15,
      minStake: 1000
    }
  ]
};

export const APP_CONFIG = {
  maxTransactionTimeout: 60000, // 60 seconds
  defaultGasLimit: '300000',
  defaultStakingDuration: 30, // days
  minStakeAmount: 100,
  networkFee: 0.000012 // XRP
};

export const UI_CONFIG = {
  IPFS_GATEWAY: process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  REFRESH_INTERVAL: 30000, // 30 seconds
  MAX_ITEMS_PER_PAGE: 10,
  NOTIFICATION_DURATION: 5000 // 5 seconds
};

export const ERROR_MESSAGES = {
  CONNECT_WALLET: 'Please connect your wallet to continue',
  NO_NFTS: 'No NFTs found in your wallet',
  STAKE_FAILED: 'Failed to stake NFT. Please try again.',
  UNSTAKE_FAILED: 'Failed to unstake NFT. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INSUFFICIENT_BALANCE: 'Insufficient balance for transaction.',
  EARLY_UNSTAKE: 'Early unstaking will incur a 25% penalty on rewards.'
};

export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: 'Wallet connected successfully',
  NFT_STAKED: 'NFT staked successfully',
  NFT_UNSTAKED: 'NFT unstaked successfully',
  REWARDS_CLAIMED: 'Rewards claimed successfully'
};

export const EVENTS = {
  STAKE: 'NFT_STAKED',
  UNSTAKE: 'NFT_UNSTAKED',
  REWARD: 'REWARD_DISTRIBUTED',
  PENALTY: 'PENALTY_APPLIED'
};

export const TIMEFRAMES = {
  ALL: 'all',
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day'
}; 