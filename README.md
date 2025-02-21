# CULT NFT Staking dApp

A decentralized application for staking NFTs on the XRPL Mainnet and earning CULT token rewards.

## Features

- 🎨 **NFT Staking**: Stake your XRPL NFTs to earn CULT tokens
- 💰 **Dynamic Rewards**: Fixed daily emission of 500,000 CULT tokens distributed among stakers
- 👑 **Inner Circle Bonus**: +20% rewards for Inner Circle NFT holders
- 📊 **Real-time Dashboard**: Track your staking progress and rewards
- 🏆 **Leaderboard**: Compete with other stakers
- 🖼️ **Profile Customization**: Choose your profile picture from staked NFTs
- ⚡ **No Database Required**: All data stored on-chain using XRPL NFT metadata
- 🎯 **Early Unstaking Penalty**: 25% penalty on rewards for early unstaking
- 📱 **Responsive Design**: Beautiful dark-themed UI with Orbitron font

## Prerequisites

- Node.js v16 or higher
- Xaman Wallet (formerly XUMM)
- XRPL account with some XRP for transaction fees

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cult-staking-app.git
cd cult-staking-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
REACT_APP_STAKING_CONTRACT=your_staking_contract_address
REACT_APP_XAMAN_API_KEY=your_xaman_api_key
```

## Development

Run the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Building for Production

1. Build the project:
```bash
npm run build
```

2. Deploy the `build` folder to your hosting service.

## XRPL Hook Deployment

1. Compile the Hook:
```bash
docker run --rm -v "$PWD/hooks:/hooks" xrpl-hooks/compiler dynamic_emission_hook.c
```

2. Deploy the Hook to XRPL Mainnet:
```bash
node deployHook.js
```

## Smart Contract Details

The staking contract uses XRPL Hooks to manage:
- NFT staking and unstaking
- Dynamic reward distribution
- Inner Circle bonus verification
- Early unstaking penalties

### Daily Emission Distribution

- Total daily emission: 500,000 CULT tokens
- Distribution: Equally split among all staked NFTs
- Inner Circle bonus: +20% for qualifying NFTs
- Early unstaking penalty: 25% of accumulated rewards

## Security Considerations

1. All smart contract functions are protected against reentrancy
2. Rewards calculation uses safe math to prevent overflows
3. NFT ownership verification before staking/unstaking
4. No admin privileges or backdoors
5. All critical operations are on-chain and verifiable

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please join our [Discord community](https://discord.gg/cultdao) or open an issue in this repository.

## Acknowledgments

- XRPL Foundation for the Hooks framework
- CULT DAO community
- All our contributors and stakers
