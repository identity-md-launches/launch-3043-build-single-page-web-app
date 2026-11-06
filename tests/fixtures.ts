// Public API snapshots reduced to fields used by this app, captured 2026-11-06.
// Tests modify copies to exercise synthetic amounts, levels and failure states. No fixtures ship in dist.
export const accountFixture = {
  "schemaVersion": 3,
  "status": "available",
  "account": "0x798cf7770337a9283b6f2af69a8f079b3d7544dc",
  "generatedAt": "2026-11-06T09:39:40.083Z",
  "release": {
    "id": "core-sepolia-20261103",
    "protocolRevision": "staged-launch-1",
    "rewardModelRevision": "funded-stream-q128-1"
  },
  "chain": {
    "target": "sepolia",
    "chainId": "11155111",
    "confirmations": "12",
    "deploymentBlock": "12057556",
    "indexedThroughBlock": "12075733",
    "safeThroughBlock": "12075722",
    "safeBlockHash": "0x06f047815ee09da06b80b83eaf4c87e3ba2f69b289a20fbd25198b7e3da3102e",
    "safeBlockTimestamp": "2026-11-06T09:37:24.000Z"
  },
  "economy": {
    "currentRound": "371",
    "coreBlockHeight": "1140",
    "mergesOpen": true,
    "stakingPaused": false,
    "maximumLevel": 10
  },
  "rewards": {
    "claimableBaseUnits": "0",
    "remainderScaled": "0",
    "lifetimePaidBaseUnits": "0",
    "lifetimeCompoundedBaseUnits": "0"
  },
  "tokenCounts": {
    "staking": "0",
    "wallet": "6"
  },
  "tokens": [
    {
      "tokenId": "1",
      "custody": "wallet",
      "level": 1,
      "basePower": "1000",
      "nextMergeHeight": "0",
      "mergeState": "ready",
      "metadataStatus": "available"
    },
    {
      "tokenId": "2",
      "custody": "wallet",
      "level": 1,
      "basePower": "1000",
      "nextMergeHeight": "0",
      "mergeState": "ready",
      "metadataStatus": "available"
    },
    {
      "tokenId": "3",
      "custody": "wallet",
      "level": 1,
      "basePower": "1000",
      "nextMergeHeight": "0",
      "mergeState": "ready",
      "metadataStatus": "available"
    },
    {
      "tokenId": "4",
      "custody": "wallet",
      "level": 1,
      "basePower": "1000",
      "nextMergeHeight": "0",
      "mergeState": "ready",
      "metadataStatus": "available"
    },
    {
      "tokenId": "5",
      "custody": "wallet",
      "level": 1,
      "basePower": "1000",
      "nextMergeHeight": "0",
      "mergeState": "ready",
      "metadataStatus": "available"
    },
    {
      "tokenId": "6",
      "custody": "wallet",
      "level": 1,
      "basePower": "1000",
      "nextMergeHeight": "0",
      "mergeState": "ready",
      "metadataStatus": "available"
    }
  ],
  "nextCursor": null
}

export const economyFixture = {
  "schemaVersion": 3,
  "status": "available",
  "release": {
    "id": "core-sepolia-20261103",
    "protocolRevision": "staged-launch-1",
    "rewardModelRevision": "funded-stream-q128-1"
  },
  "chain": {
    "target": "sepolia",
    "chainId": "11155111",
    "confirmations": "12",
    "deploymentBlock": "12057556",
    "indexedThroughBlock": "12075728",
    "safeThroughBlock": "12075717",
    "safeBlockHash": "0x79891d7b3dd00813549d861053e587513e6f7711ae9abb48cbd68e826c4a1b72",
    "safeBlockTimestamp": "2026-11-06T09:36:24.000Z"
  },
  "asset": {
    "address": "0xd78a3956cf63164d1fa1c622ad3c66623162fa1e",
    "symbol": "SQK",
    "decimals": 18
  }
}

export const profileFixture = {
  "code": "639pun7q",
  "valid": true,
  "identity": {
    "kind": "x",
    "username": "mfBRAT_eth",
    "name": "𝖒𝖋 𝖇𝖗𝖆𝖙",
    "profileImageUrl": "https://pbs.twimg.com/profile_images/2108225844988772352/OeUhIwmW_400x400.jpg"
  },
  "standing": {
    "rank": 1,
    "aura": 5204,
    "tier": "gold",
    "next": null,
    "movement": 1
  },
  "achievements": [
    {
      "id": "clout.signed_up",
      "title": "Signed Up",
      "rarity": {
        "holders": 46592,
        "heldByBps": 10000
      },
      "active": null
    },
    {
      "id": "clout.on_discord",
      "title": "On Discord",
      "rarity": {
        "holders": 21422,
        "heldByBps": 4598
      },
      "active": null
    },
    {
      "id": "code.project_submitted",
      "title": "The Buildooooor",
      "rarity": {
        "holders": 18,
        "heldByBps": 4
      },
      "active": null
    }
  ],
  "snapshot": {
    "members": 46592,
    "computedAt": "2026-11-06T09:22:49.023Z"
  }
}

export const catalogFixture = {
  "badges": [
    {
      "id": "clout.signed_up",
      "lane": "clout",
      "title": "Signed Up",
      "description": "Verify a wallet and link your X account.",
      "instruction": "Verify a wallet and link your X account.",
      "trophy": false
    },
    {
      "id": "clout.on_discord",
      "lane": "clout",
      "title": "On Discord",
      "description": "Link a Discord account at least 365 days old to your Squeekchain profile.",
      "instruction": "Link a Discord account at least 365 days old.",
      "trophy": false
    },
    {
      "id": "clout.the_invitooor",
      "lane": "clout",
      "title": "The Invitooor",
      "description": "Invite your first friend to Squeekchain and have them complete signup.",
      "instruction": "Have your first invited friend finish wallet and X signup.",
      "trophy": false
    },
    {
      "id": "code.project_submitted",
      "lane": "code",
      "title": "The Buildooooor",
      "description": "Submit a Squeekchain project, verify your connection to it and have it approved by the team.",
      "instruction": "Submit one project with verified attribution that the team approves.",
      "trophy": false
    }
  ],
  "snapshot": {
    "members": 46592,
    "computedAt": "2026-11-06T09:22:49.023Z"
  }
}

