export type AirdroppedToken = {
  assetId: number
  creatorContract: SimpleContract
  extensionContract: SimpleContract
  gifted: boolean
}

export type SimpleContract = {
  name: string
  address: string
  spec: string
}