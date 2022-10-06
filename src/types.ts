export type AirdroppedToken = {
  assetId: number
  creatorContract: string
  extensionContract: string
  gifted: boolean
}

export type SoulboundInfo = {
  creatorContract: string
  extensionContract: string
}

export type SimpleContract = {
  name: string
  address: string
  spec: string
}