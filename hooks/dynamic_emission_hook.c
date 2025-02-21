#include "hookapi.h"

int64_t hook(uint32_t reserved)
{
    // Fixed Daily Emission in CULT tokens (500,000)
    uint64_t totalEmission = 500000;

    // Get the current number of staked NFTs from hook state
    uint64_t activeStakedNFTs = hook_param(0, SBUF("active_nfts"), 0);

    // Prevent divide by zero
    if (activeStakedNFTs == 0) return 0;

    // Calculate reward per NFT
    uint64_t rewardPerNFT = totalEmission / activeStakedNFTs;

    // Check for Inner Circle NFT bonus (20% extra)
    uint8_t isInnerCircle = hook_param(1, SBUF("inner_circle"), 0);
    if (isInnerCircle) {
        rewardPerNFT = (rewardPerNFT * 120) / 100; // Add 20% bonus
    }

    // Early unstaking penalty check (25% burn)
    uint8_t isEarlyUnstake = hook_param(2, SBUF("early_unstake"), 0);
    if (isEarlyUnstake) {
        rewardPerNFT = (rewardPerNFT * 75) / 100; // Apply 25% penalty
    }

    // Emit CULT reward dynamically based on active stakers
    emit(SBUF("Daily Distribution"), SBUF("CULT"), rewardPerNFT);

    return 0;
} 