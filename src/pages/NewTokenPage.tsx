import {
    Alert,
    AssetUploader, Button,
    Loader,
    Section,
    useSDK,
    useCreateAsset,
    useInstances,
    useCreateInstance,
    useUpdateAssetMetadata,
    useUpdateInstance,
    useInstance,
    useSubmitJob
} from '@manifoldxyz/studio-app-sdk-react'
import {AirdroppedToken, Collection, AttachmentInfo} from 'src/types'
import {Link, useParams} from 'react-router-dom'
import {useEffect, useState, useCallback} from 'react'
import {ArrowLeftIcon} from '@heroicons/react/outline'
import {Job} from '@manifoldxyz/studio-app-sdk'
import {soulbound_abi721} from 'src/lib/soulbound-abi'

export function NewTokenPage() {
    const params = useParams<{ collection: string , id: string}>()
    const collectionId = parseInt(params.collection!)
    const id = parseInt(params.id!)

    const { mutateAsync: createAsset } = useCreateAsset()
    const { mutateAsync: createInstance } = useCreateInstance<AirdroppedToken>()

    const [address, setAddress] = useState("");
    const [mintSuccess, setMintSuccess] = useState(false);
    const [assetIdn, setAssetIdn] = useState<number>(0);
    const [tokenId, setTokenId] = useState<number>(0);
    const [token, setToken] = useState<AirdroppedToken>();

    const { mutateAsync: updateCollectionInstance }  = useUpdateInstance<Collection>()
    const { mutateAsync: updateTokenInstance }  = useUpdateInstance<AirdroppedToken>()
    const { mutateAsync: updateMetadata } = useUpdateAssetMetadata()

    const { isLoading: isAttachmentLoading, error: attachmentError, data: attachmentInfo } = useInstance<AttachmentInfo>(id)
    const { isLoading: isCollectionLoading, error: collectionError, data: collectionInfo } = useInstance<Collection>(collectionId)
    const { isLoading: loadingTokens, error: errorTokens, data: instances } = useInstances<AirdroppedToken>()

    const sdk = useSDK();
    const {error: submitError, submit: submitJob} = useSubmitJob();
    const backlink = `/ext/${id}`

    const createToken = useCallback(async (edition: Number) => {
        // The function creates a new token instance for this collection

        if (!collectionInfo || !collectionInfo.data) {
            return;
        }

        //Create asset to be associated with instance
        const {id: assetId, metadata} = await createAsset();

        //Update Asset Name here
        metadata.name = collectionInfo.data.name +" #"+ String(edition);
        await updateMetadata({id: assetId, data: metadata})

        //Create Token
        const newToken: AirdroppedToken = {
            assetId: assetId,
            collectionId: collectionId,
            gifted: false,
        }

        const { id: tokenId } = await createInstance({ data: newToken })
        setToken(newToken);
        setAssetIdn(assetId);
        setTokenId(tokenId);
    },[collectionInfo, createAsset, createInstance, updateMetadata, collectionId])

    useEffect(() => {
        const shouldCreateNewToken = () => {
            // Check if new token should be created
            // 1. If instances not fetched, wait until fetched
            // 2. If instances fetched, check if there is a unclaimed token in this collection

            if (!instances) return false
            const instanceExists = instances.find( item => item.data.gifted === false && item.data.collectionId === collectionId)
            if (!instanceExists) return true
            setTokenId(instanceExists.id);
            setToken(instanceExists.data);
            setAssetIdn(instanceExists.data.assetId);
            return false
        }
        if (collectionInfo && collectionInfo.data && collectionId) {
            
            // Checks if an unused gifted in this collection exists, if not, create one
            const createNewToken = shouldCreateNewToken();
            if (createNewToken  && !token) {
                createToken(collectionInfo.data.edition+1);
            }
        }
    }, [collectionInfo, collectionId, instances, createToken, token])

    const mintToAddress = async () => {
        // The function prepares the minting job and submits it to the blockchain
        // 1. Check if asset inputs are valid, check if address is valid
        // 2. Submit job 1) Upload the asset to Arweave, 2) Call the mint function

        if (!attachmentInfo || !collectionInfo || !address || !token || !assetIdn) {
            return
        }
        const asset = await sdk.fetchAsset(assetIdn)

        if (!asset.metadata.description || !asset.metadata.description) {
            alert("Please fill in the description and name of the token before minting");
            return;
        }
        if (!address.startsWith('0x') || address.length !== 42) {
            alert("Not a valid address");
            return;
        }

        const contractAddress = attachmentInfo.data.extensionContract

        const mintJob: Job = {
            title: `Airdrop To Address`,
            tasks: [
                {
                    ref: 'upload',
                    name: 'Upload Asset to Arweave',
                    description: 'Uploads the asset to decentralized, forever storage',
                    type: 'arweave-upload',
                    inputs: {
                        assetId: assetIdn
                    }
                },
                {
                    ref: 'airdrop',
                    name: 'Airdrop to Receiver',
                    description: "Mints the token on receiver's wallet.",
                    type: 'tx',
                    inputs: {
                        address: contractAddress,
                        abi: soulbound_abi721,
                        method: 'mint(string,address,string)',
                        args: [
                            collectionInfo.data.name,
                            address,
                            `{{upload.output.hash}}`, // 
                        ]
                    },
                },
            ]
        }

        // Run the mint job
        await submitJob(mintJob)
        await updateCollectionInstance({ id: collectionId, data: {edition: collectionInfo.data.edition+1}})
        await updateTokenInstance({ id: tokenId, data: {gifted: true}})
        setMintSuccess(true);
        await createToken(collectionInfo.data.edition+2);
    }

    return (
        <Section>
            <div className="flex mb-2 justify-between">
                <div className="flex items-center space-x-6">
                    <Link to={backlink}>
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                    <h1 className="flex-auto text-2xl font-bold">Create token</h1>
                </div>
            </div>
            {mintSuccess && <Alert type="success" title="Success">Token minted successfully!</Alert>} 
            {submitError && <Alert type="error" title="Error">There was an error minting the token. Please try again.</Alert>}
            {loadingTokens && <Loader />}
            {errorTokens && <Alert type="error">{errorTokens.message}</Alert>}
            {isAttachmentLoading && <Loader />}
            {attachmentError && <Alert type="error">{attachmentError.message}</Alert>}
            {isCollectionLoading && <Loader />}
            {collectionError && <Alert type="error">{collectionError.message}</Alert>}
            {collectionInfo &&
              <div>
                <label>
                    Address to drop to:
                    <input value={address} onChange={e => setAddress(e.target.value)} type='text' />
                </label>
               <Button variant="primary" onClick={mintToAddress} disabled={!address}>Airdrop to Address</Button>
               <AssetUploader assetId={assetIdn} />
              </div>
            }
        </Section>
    )
}