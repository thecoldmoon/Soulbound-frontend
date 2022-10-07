import {
    Alert,
    AssetUploader, Button,
    Loader,
    Section,
    useCreateAsset,
    useCreateInstance,
    useUpdateAssetMetadata,
    useInstance,
    useSDK
} from '@manifoldxyz/studio-app-sdk-react'
import {AirdroppedToken, Collection, AttachmentInfo} from 'src/types'
import {Link, useParams, useNavigate,} from 'react-router-dom'
import {useEffect, useState} from 'react'
import {ArrowLeftIcon} from '@heroicons/react/outline'
import {Job} from '@manifoldxyz/studio-app-sdk'
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
    const [token, setToken] = useState<AirdroppedToken>();
    const backlink = `/contract/${id}`

    const { isLoading, error, data: instance } = useInstance<Collection>(collectionId)
    const { isLoading: isAttachmentLoading, error: attachmentError, data: AttachmentInfo } = useInstance<AttachmentInfo>(id)

    //Clean up if asset not used

    useEffect(() => {
        const createToken = async () => {
            if (!instance || !instance.data || !collectionId) {
                return;
            }
    
            //Create asset to be associated with instance
            const {id: assetId, metadata} = await createAsset();

            //Update Asset Name here
            metadata.name = "Airdropped Token";
            await updateMetadata({id: assetId, data: metadata})
    
            //Create Token
            const newToken: AirdroppedToken = {
                assetId: assetId,
                collectionId: collectionId,
                gifted: false,
            }
    
            const { id: instanceId } = await createInstance({ data: newToken })
            setToken(newToken);
            setAssetIdn(assetId);
        }
        if (instance && collectionId){
            createToken()
        }
    }, [instance, collectionId, createAsset, createInstance, updateMetadata])


    const mintToAddress = async () => {
        if (!instance || !AttachmentInfo || !address || !token) {
            return
        }

        const assetId = token.assetId
        const contractAddress = AttachmentInfo.data.extensionContract

        // Prepares the job with two tasks:
        // 1. Upload the asset to Arweave
        // 2. Call the mintBase function on the creator's Manifold Creator contract
        //    with the Arweave URI generated in the previous task.
        const mintJob: Job = {
            title: `Airdrop To Address`,
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
                    ref: 'mint',
                    name: 'Mint to Address',
                    description: 'Mints the wallet of recipient',
                    type: 'tx',
                    inputs: {
                        address: contractAddress,
                        abi: abi721,
                        method: 'mint(address, string)',
                        args: [
                            address,
                            `{{upload.output.hash}}`, // 
                        ]
                    },
                },
            ]
        }

        // Run the mint job
        const {context} = await sdk.createJob(mintJob)
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
            {isLoading && <Loader />}
            {error && <Alert type="error">{error.message}</Alert>}
            {instance &&
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
