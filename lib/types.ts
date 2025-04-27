export interface UserProfile {
  nickname: string
  username: string
  bio: string
  xName: string
  tgName: string
  avatarBlobId: string
  initialized: boolean
}

export interface Space {
  creator: string
  spaceType: number
  title: string
  walrusBlobId: string
  likes: number
  heat: number
  name: string
  symbol: string
}

export interface NewsItem {
  title: string
  newsType: string
  hourlyRate: number
  durationHours: number
  expiryTimestamp: number
  publisher: string
  walrusBlobId: string
  totalBid: number
  isActive: boolean
}

export interface NFTItem {
  tokenId: number
  owner: string
  spaceId: number
  metadataUri: string
}
