export const CHAIN_INFO = {
  name: "EduChain Testnet",
  nativeCurrency: {
    name: "EDU",
    symbol: "EDU",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.open-campus-codex.gelato.digital"],
    },
    public: {
      http: ["https://rpc.open-campus-codex.gelato.digital"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://opencampus-codex.blockscout.com/",
    },
  },
  chainId: 656476,
}

export const CONTRACT_ADDRESSES = {
  HKNFT: "0x27db9293c3132438D707E6D31d8cE81bD42aa5Cd",
  TokenLaunch: "0x0BB4a098BE2CEb99E36860aFB2A3412577Fe666a",
  UserProfile: "0x902e38f46b50D31B4F3B4960c63bf32516079860",
  News: "0xDaBfb9A90b13a7d7C7884812eCe2D9f422eB8181",
  Space: "0x6D9186AE3F3D762569bEC482DADa37A02b370550",
}

export enum SpaceType {
  TEXT = 0,
  MEME = 1,
  VIDEO = 2,
}

export const SPACE_TYPE_LABELS = {
  [SpaceType.TEXT]: "文字",
  [SpaceType.MEME]: "Meme",
  [SpaceType.VIDEO]: "视频",
}

// 添加Walrus服务URL常量
/*
export const PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space/v1/blobs"
export const AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space/v1/blobs/"
*/

export const PUBLISHER_URL = "https://publisher.testnet.walrus.atalma.io/v1/blobs"
export const AGGREGATOR_URL = "https://aggregator.testnet.walrus.atalma.io/v1/blobs"
