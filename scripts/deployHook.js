require('dotenv').config();
const { Client, Wallet } = require('xrpl');
const fs = require('fs');
const path = require('path');

// Emission schedule (CULT tokens per day)
const EMISSION_SCHEDULE = {
    YEAR_1: 205479, // 75M / 365
    YEAR_2: 342466, // 125M / 365
    YEAR_3: 410958, // 150M / 365
    YEAR_4: 342466, // 125M / 365
    YEAR_5: 202740  // 74M / 365
};

async function deployHook() {
    const client = new Client(process.env.REACT_APP_XRPL_WSS_URL);
    
    try {
        console.log('Connecting to XRPL...');
        await client.connect();

        // Load the compiled hook binary
        const hookBinary = fs.readFileSync(
            path.join(__dirname, '../hooks/cult_staking_hook.wasm')
        );

        // Create wallet from provided secret
        const wallet = Wallet.fromSecret(process.env.XRPL_HOOK_DEPLOYER_SECRET);

        console.log('Deploying hook from address:', wallet.address);

        // Calculate current staking year based on deployment date
        const startDate = new Date('2024-01-01'); // Assuming staking starts Jan 1, 2024
        const now = new Date();
        const yearsPassed = now.getFullYear() - startDate.getFullYear();
        const currentYear = Math.min(Math.max(1, yearsPassed + 1), 5);

        // Prepare hook deployment transaction
        const tx = {
            TransactionType: 'SetHook',
            Account: wallet.address,
            Hooks: [{
                Hook: {
                    CreateCode: hookBinary.toString('hex'),
                    HookOn: {
                        NFTokenCreateOffer: true,
                        NFTokenAcceptOffer: true,
                        Payment: true
                    },
                    HookApiVersion: 0,
                    HookNamespace: 'CULT NFT Staking',
                    HookParameters: [
                        {
                            name: 'staking_year',
                            value: currentYear.toString()
                        },
                        {
                            name: 'daily_emission_year_1',
                            value: EMISSION_SCHEDULE.YEAR_1.toString()
                        },
                        {
                            name: 'daily_emission_year_2',
                            value: EMISSION_SCHEDULE.YEAR_2.toString()
                        },
                        {
                            name: 'daily_emission_year_3',
                            value: EMISSION_SCHEDULE.YEAR_3.toString()
                        },
                        {
                            name: 'daily_emission_year_4',
                            value: EMISSION_SCHEDULE.YEAR_4.toString()
                        },
                        {
                            name: 'daily_emission_year_5',
                            value: EMISSION_SCHEDULE.YEAR_5.toString()
                        },
                        {
                            name: 'inner_circle_bonus',
                            value: process.env.REACT_APP_INNER_CIRCLE_BONUS
                        },
                        {
                            name: 'early_unstake_penalty',
                            value: process.env.REACT_APP_EARLY_UNSTAKE_PENALTY
                        },
                        {
                            name: 'min_stake_duration',
                            value: process.env.REACT_APP_MIN_STAKE_DURATION
                        }
                    ]
                }
            }]
        };

        // Submit transaction
        const prepared = await client.autofill(tx);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            console.log('Hook deployed successfully!');
            console.log('Transaction hash:', result.result.hash);
            console.log('Hook account:', wallet.address);
            console.log('Current staking year:', currentYear);
            console.log('Daily emission for current year:', EMISSION_SCHEDULE[`YEAR_${currentYear}`]);
        } else {
            console.error('Hook deployment failed:', result.result.meta.TransactionResult);
        }

    } catch (error) {
        console.error('Error deploying hook:', error);
    } finally {
        await client.disconnect();
    }
}

deployHook().catch(console.error); 