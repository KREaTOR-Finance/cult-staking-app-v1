#include "hookapi.h"

// Hook parameters
#define HOOK_PARAM_ACTIVE_NFTS "active_nfts"
#define HOOK_PARAM_INNER_CIRCLE "inner_circle"
#define HOOK_PARAM_EARLY_UNSTAKE "early_unstake"
#define HOOK_PARAM_STAKE_TIME "stake_time"
#define HOOK_PARAM_CURRENT_YEAR "staking_year"

// Constants for yearly emissions (with 6 decimal places)
#define DAILY_EMISSION_YEAR_1 205479000000  // 205,479 CULT (75M / 365)
#define DAILY_EMISSION_YEAR_2 342466000000  // 342,466 CULT (125M / 365)
#define DAILY_EMISSION_YEAR_3 410958000000  // 410,958 CULT (150M / 365)
#define DAILY_EMISSION_YEAR_4 342466000000  // 342,466 CULT (125M / 365)
#define DAILY_EMISSION_YEAR_5 202740000000  // 202,740 CULT (74M / 365)

#define INNER_CIRCLE_BONUS 120      // 20% bonus (100 + 20)
#define EARLY_UNSTAKE_PENALTY 75    // 25% penalty (100 - 25)
#define MIN_STAKE_DURATION 604800   // 7 days in seconds

// Hook state keys
#define STATE_KEY_TOTAL_STAKED "total_staked"
#define STATE_KEY_NFT_INFO "nft_info:"
#define STATE_KEY_REWARDS "rewards:"
#define STATE_KEY_YEARLY_EMISSION "yearly_emission:"

// Function to get daily emission based on year
uint64_t get_daily_emission(uint64_t year) {
    switch(year) {
        case 1: return DAILY_EMISSION_YEAR_1;
        case 2: return DAILY_EMISSION_YEAR_2;
        case 3: return DAILY_EMISSION_YEAR_3;
        case 4: return DAILY_EMISSION_YEAR_4;
        case 5: return DAILY_EMISSION_YEAR_5;
        default: return 0; // No emissions after year 5
    }
}

int64_t hook(uint32_t reserved) {
    // Get transaction type
    uint8_t txtype[16];
    int64_t txtype_len = otxn_type(txtype, 16);
    if (txtype_len < 0) rollback(SBUF("Error getting transaction type"), txtype_len);

    // Get current staking year
    uint64_t current_year = hook_param(0, SBUF(HOOK_PARAM_CURRENT_YEAR), 0);
    if (current_year < 1 || current_year > 5) {
        rollback(SBUF("Invalid staking year"), -1);
    }

    // Get daily emission for current year
    uint64_t daily_emission = get_daily_emission(current_year);

    // Handle NFTokenCreateOffer (Staking)
    if (BUFFER_EQUAL_16(txtype, "NFTokenCreateOffer")) {
        // Verify this is a staking operation (selling NFT to contract)
        uint8_t flags[4];
        otxn_field(flags, 4, sfFlags);
        if (!(flags[0] & tfSellNFToken)) {
            rollback(SBUF("Invalid staking operation"), -1);
        }

        // Get NFT ID
        uint8_t nft_id[32];
        otxn_field(nft_id, 32, sfNFTokenID);

        // Store staking timestamp
        uint32_t now = ledger_last_time();
        state_set(SBUF(STATE_KEY_NFT_INFO), &now, sizeof(uint32_t));

        // Increment total staked count
        int64_t total_staked = state_foreign_get(SBUF(STATE_KEY_TOTAL_STAKED));
        total_staked++;
        state_foreign_set(SBUF(STATE_KEY_TOTAL_STAKED), &total_staked, sizeof(int64_t));

        // Calculate reward per NFT
        uint64_t reward_per_nft = total_staked > 0 ? daily_emission / total_staked : 0;
        
        // Check for Inner Circle NFT
        uint8_t is_inner_circle = hook_param(1, SBUF(HOOK_PARAM_INNER_CIRCLE), 0);
        if (is_inner_circle) {
            reward_per_nft = (reward_per_nft * INNER_CIRCLE_BONUS) / 100;
        }

        // Store reward rate for this NFT
        state_set(SBUF(STATE_KEY_REWARDS), &reward_per_nft, sizeof(uint64_t));

        // Emit staking event
        emit(SBUF("NFT Staked"), &reward_per_nft, sizeof(uint64_t));
        accept(SBUF("NFT staked successfully"), 0);
    }

    // Handle NFTokenAcceptOffer (Unstaking)
    if (BUFFER_EQUAL_16(txtype, "NFTokenAcceptOffer")) {
        // Get NFT ID
        uint8_t nft_id[32];
        otxn_field(nft_id, 32, sfNFTokenID);

        // Get staking timestamp
        uint32_t stake_time;
        state_get(&stake_time, sizeof(uint32_t), SBUF(STATE_KEY_NFT_INFO));

        // Calculate staking duration
        uint32_t now = ledger_last_time();
        uint32_t duration = now - stake_time;

        // Get accumulated rewards
        uint64_t rewards;
        state_get(&rewards, sizeof(uint64_t), SBUF(STATE_KEY_REWARDS));

        // Apply early unstaking penalty if needed
        if (duration < MIN_STAKE_DURATION) {
            rewards = (rewards * EARLY_UNSTAKE_PENALTY) / 100;
            emit(SBUF("Early Unstake Penalty"), &rewards, sizeof(uint64_t));
        }

        // Decrement total staked count
        int64_t total_staked = state_foreign_get(SBUF(STATE_KEY_TOTAL_STAKED));
        total_staked--;
        state_foreign_set(SBUF(STATE_KEY_TOTAL_STAKED), &total_staked, sizeof(int64_t));

        // Clear NFT state
        state_set(SBUF(STATE_KEY_NFT_INFO), 0, 0);
        state_set(SBUF(STATE_KEY_REWARDS), 0, 0);

        // Emit unstaking event
        emit(SBUF("NFT Unstaked"), &rewards, sizeof(uint64_t));
        accept(SBUF("NFT unstaked successfully"), 0);
    }

    // Handle daily reward distribution
    if (BUFFER_EQUAL_16(txtype, "Payment")) {
        // Verify this is a CULT token transaction
        uint8_t currency[20];
        otxn_field(currency, 20, sfCurrency);
        if (!BUFFER_EQUAL_20(currency, "CULT")) {
            rollback(SBUF("Invalid currency for rewards"), -1);
        }

        // Get total staked NFTs
        int64_t total_staked = state_foreign_get(SBUF(STATE_KEY_TOTAL_STAKED));
        if (total_staked == 0) rollback(SBUF("No staked NFTs"), -1);

        // Calculate and distribute rewards
        uint64_t reward_per_nft = daily_emission / total_staked;

        // Store daily emission data
        state_set(SBUF(STATE_KEY_YEARLY_EMISSION), &daily_emission, sizeof(uint64_t));

        // Emit reward distribution event
        emit(SBUF("Daily Reward Distribution"), &reward_per_nft, sizeof(uint64_t));
        accept(SBUF("Rewards distributed successfully"), 0);
    }

    // Reject any other transaction types
    rollback(SBUF("Unsupported transaction type"), -1);
} 