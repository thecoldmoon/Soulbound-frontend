import {
    Alert,
    AssetUploader, Button,
    Loader,
    Section,
    useCreateAsset,
    useInstances,
    useCreateInstance,
    useUpdateAssetMetadata,
    useUpdateInstance,
    useInstance,
    useSubmitJob,
    useSDK
} from '@manifoldxyz/studio-app-sdk-react'
import {AirdroppedToken, Collection, AttachmentInfo} from 'src/types'
import {Link, useParams, useNavigate,} from 'react-router-dom'
import {useEffect, useState} from 'react'
import {ArrowLeftIcon} from '@heroicons/react/outline'
import {Job, JobProgress} from '@manifoldxyz/studio-app-sdk'
import {abi721} from 'src/lib/manifold-creator-abi'

export function NewTokenPage() {
    const sdk = useSDK();
    const params = useParams<{ collection: string , id: string}>()
    const collectionId = parseInt(params.collection!)
    const id = parseInt(params.id!)
    const { mutateAsync: updateMetadata } = useUpdateAssetMetadata()
    const { mutateAsync: createAsset } = useCreateAsset()
    const { mutateAsync: createInstance } = useCreateInstance<AirdroppedToken>()
    const [address, setAddress] = useState("");
    const [mintSuccess, setMintSuccess] = useState(false);
    const [assetIdn, setAssetIdn] = useState<number>(0);
    const [tokenId, setTokenId] = useState<number>(0);
    const [token, setToken] = useState<AirdroppedToken>();
    const backlink = `/contract/${id}`

    const { mutateAsync: updateCollectionInstance }  = useUpdateInstance<Collection>()
    const { mutateAsync: updateTokenInstance }  = useUpdateInstance<AirdroppedToken>()
    const { isLoading: isAttachmentLoading, error: attachmentError, data: attachmentInfo } = useInstance<AttachmentInfo>(id)
    const { isLoading: isCollectionLoading, error: collectionError, data: collectionInfo } = useInstance<Collection>(collectionId)
    const { isLoading: loadingTokens, error: errorTokens, data: instances } = useInstances<AirdroppedToken>()

    //Clean up if asset not used

    const {
        isProcessing,     // if job is still happening
        isSuccess,        // if job was successful or not
        progress,         // contains most recent progress event
        result,           // result of your job
        error,            // error object
        submit: submitJob,          // handler to pass job to invoke
    } = useSubmitJob();

    const onProgress = (progress: JobProgress) => {
        console.log(progress.stage) // 'start-task' | 'complete-task'
        console.log(progress.result)
        console.log(progress.task.ref)
        console.log(progress.context)
    }

    useEffect(() => {
        console.log('Attahcment Info', attachmentInfo)
        console.log('Collection Info', collectionInfo)
        console.log('error', error)
    }, [error, collectionInfo, attachmentInfo])

    useEffect(() => {
        const createToken = async () => {
            if (!collectionInfo || !collectionInfo.data || !collectionInfo) {
                return;
            }
    
            //Create asset to be associated with instance
            const {id: assetId, metadata} = await createAsset();

            //Update Asset Name here
            metadata.name = collectionInfo.data.name +" #"+ String(collectionInfo.data.edition+1);
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
        }
        if (collectionInfo && collectionInfo.data && collectionInfo && collectionId) {
            //Check if an unused gifted in this collection exists, if not, create one
            const tokenExists = existsUnusedTokens();
            if (!tokenExists) {
            createToken();
            }
        }
    }, [collectionInfo, createAsset, createInstance, updateMetadata, collectionId])


    const existsUnusedTokens = () => {
        if (!instances) return true
        const instanceExists = instances.find( item => item.data.gifted === false && item.data.collectionId === collectionId)
        if (!instanceExists) return false
        setToken(instanceExists.data);
        setAssetIdn(instanceExists.data.assetId);
        return true
    }

    const mintToAddress = async () => {
        if (!attachmentInfo || !collectionInfo || !address || !token) {
            return
        }

        const assetId = token.assetId
        const contractAddress = attachmentInfo.data.extensionContract
        console.log('minting', assetId, token, collectionInfo, address)

        // Prepares the job with two tasks:
        // 1. Upload the asset to Arweave
        // 2. Call the mintBase function on the creator's Manifold Creator contract
        //    with the Arweave URI generated in the previous task.
        const mintJob: Job = {
            title: `Airdrop To Address`,
            onProgress,
            tasks: [
                {
                    ref: 'upload',
                    name: 'Upload Asset to Arweave',
                    description: 'Uploads the asset to decentralized, forever storage',
                    type: 'arweave-upload',
                    inputs: {
                        assetId
                    }
                },
                {
                    ref: 'airdrop',
                    name: 'Airdrop to Vitalik\'s',
                    description: 'Mints the token on Vitalik\'s wallet.',
                    type: 'tx',
                    inputs: {
                        address: contractAddress,
                        abi: abi721,
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
        const {context} = await submitJob(mintJob)
        await updateCollectionInstance({ id, data: {edition: collectionInfo.data.edition+1}})
        await updateTokenInstance({ id: tokenId, data: {gifted: true}})
        setMintSuccess(true);
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
            {mintSuccess && <Alert type="success" title="Success">Token minted successfully! Go back to previous page to mint again</Alert>} 
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
