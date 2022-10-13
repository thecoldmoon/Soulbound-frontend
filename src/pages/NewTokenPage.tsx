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
import {useEffect, useState, useCallback} from 'react'
import {ArrowLeftIcon} from '@heroicons/react/outline'
import {Job, JobProgress} from '@manifoldxyz/studio-app-sdk'
import {abi721} from 'src/lib/manifold-creator-abi'
import {soulbound_abi721} from 'src/lib/soulbound-abi'
import { createToken } from 'typescript'

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

    const createToken = useCallback(async (edition: Number) => {
        if (!collectionInfo || !collectionInfo.data) {
            return;
        }

        //Create asset to be associated with instance
        const {id: assetId, metadata} = await createAsset();
        const new_Edition = collectionInfo.data.edition + 1;

        console.log("createtoken", collectionInfo.data.edition, new_Edition)
        //Update Asset Name here
        metadata.name = collectionInfo.data.name +" #"+ String(edition);
        console.log("createtokenname", metadata.name)
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
        // Prepares the job with two tasks:
        // 1. Upload the asset to Arweave
        // 2. Call the mintBase function on the creator's Manifold Creator contract
        //    with the Arweave URI generated in the previous task.

        if (!attachmentInfo || !collectionInfo || !address || !token) {
            return
        }

        const assetId = token.assetId
        const contractAddress = attachmentInfo.data.extensionContract
        console.log('minting', collectionInfo.data.name, address)

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
        const {context} = await submitJob(mintJob)
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
