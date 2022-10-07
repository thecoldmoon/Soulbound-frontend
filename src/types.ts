export type AirdroppedToken = {
  assetId: number
  collectionId: number
  gifted: boolean
}

export type Collection = {
  name: string
  attachmentId: number
}

export type AttachmentInfo = {
  creatorContract: string
  extensionContract: string
}

export type SimpleContract = {
  name: string
  address: string
  spec: string
}