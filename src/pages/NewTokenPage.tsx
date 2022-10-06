import {
    Alert,
    AssetUploader, Button,
    Loader,
    Section,
    useInstance,
    useSDK
} from '@manifoldxyz/studio-app-sdk-react'
import {AirdroppedToken} from 'src/types'
import {Link, useParams, useNavigate} from 'react-router-dom'
import {useEffect, useState} from 'react'
import {ArrowLeftIcon} from '@heroicons/react/outline'
import {Job} from '@manifoldxyz/studio-app-sdk'
import {abi721} from 'src/lib/manifold-creator-abi'

export function NewTokenPage() {
    const sdk = useSDK();
    let { id, tid } = useParams();
    const token_id = parseInt(tid!)

    const { isLoading, error, data: instance } = useInstance<AirdroppedToken>(token_id)

    const mintToAddress = async () => {
        if (!instance || !address) {
            return
        }

        const token = instance.data
        const assetId = token.assetId
        const contractAddress = token.extensionContract

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
                    ref: 'airdrop',
                    name: 'Airdrop to Vitalik\'s',
                    description: 'Mints the token on Vitalik\'s wallet.',
                    type: 'tx',
                    inputs: {
                        address: contractAddress,
                        abi: abi721,
                        method: 'mint(address)',
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
    }

    const [address, setAddress] = useState("");
    const backlink = `/contract/${id}`

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
            {isLoading && <Loader />}
            {error && <Alert type="error">{error.message}</Alert>}
            {instance &&
              <div>
                <label>
                    Address to drop to:
                    <input value={address} onChange={e => setAddress(e.target.value)} type='text' />
                </label>
               <Button variant="primary" onClick={mintToAddress} disabled={!address}>Airdrop to Address</Button>
               <AssetUploader assetId={instance.data.assetId} />
              </div>
            }
        </Section>
    )
}
