export type AirdroppedToken = {
  assetId: number
  collectionId: number
  gifted: boolean
}

export type Collection = {
  name: string
  edition: number
  attachmentId: number
}

export type AttachmentInfo = {
  creatorContract: string
  extensionContract: string
}