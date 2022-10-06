import {Alert, AssetUploader, Button, ButtonLink, Loader, Section, useInstance, useInstances, useSDK, useCreateAsset, useCreateInstance} from '@manifoldxyz/studio-app-sdk-react'
import {Job, Asset} from '@manifoldxyz/studio-app-sdk'
import {SoulboundInfo, AirdroppedToken} from 'src/types'
import {Link, useParams, useNavigate} from 'react-router-dom'
import {useEffect, useState, useCallback} from 'react'
import {ArrowLeftIcon} from '@heroicons/react/outline'
import {abi721} from 'src/lib/manifold-creator-abi'

export function SoulboundTokensPage() {
    const navigate = useNavigate()
    const params = useParams<{ id: string }>()
    const id = parseInt(params.id!)

    const sdk = useSDK()
    const [owners, setOwners] = useState([])
    const { isLoading: loadingSB, error: errorSB, data: instance } = useInstance<SoulboundInfo>(id)
    const { mutateAsync: createAsset } = useCreateAsset()
    const { mutateAsync: createInstance } = useCreateInstance<AirdroppedToken>()
    const { isLoading: loadingTokens, error: errorTokens, data: instances } = useInstances<AirdroppedToken>()

    const [assets, setAssets] = useState<Asset[]>()

    useEffect(() => {
        const fetch = async () => {
            if (!instances) return;
            const assts = await Promise.all(
                instances.map(({ id, data }) => sdk.fetchAsset(data.assetId))
            );
            setAssets(assts)
        }

        if (instances) {
            fetch();
        }
    }, [instances, sdk])

    // When the create button is clicked, we use the create hooks
    // to create the asset and create the instance referencing the asset.
    const createToken = async () => {
        if (!instance || !instance.data) {
            return;
        }

        //Create asset to be associated with instance
        const {id: assetId} = await createAsset();

        const newToken: AirdroppedToken = {
            assetId: assetId,
            creatorContract: instance.data.creatorContract,
            extensionContract: instance.data.extensionContract,
            gifted: false,
        }

        const { id: instanceId } = await createInstance({ data: newToken })
        navigate(`/contract/${id}/token/${instanceId}`)
    }

    useEffect(() => {
        // Load token owners
        const getTokenOwners = async () => {
            if (!instance || !instance.data) {
                return;
            }
            const getTokenOwners: Job = {
            title: `Get Collection Owners`,
            tasks: [
                {
                    ref: 'getOwners',
                    name: 'Get Collection Owners',
                    description: 'Get Collection Owners',
                    type: 'contract-call',
                    inputs: {
                        address: instance.data.extensionContract, 
                        abi: abi721,
                        method: 'getTokenOwners()',
                        args: [
                        ]
                    },
                },
            ]
            }
        
            const { context } = await sdk.createJob(getTokenOwners)
            console.log('output', context.getOwners)
        
            return context.getOwners.output[0]
        }
        // Get all Owners
        const fetch = async () => {
            if (!instance) return;
            const fetched_owners = await getTokenOwners();
            console.log(fetched_owners)
            setOwners(fetched_owners)
        }

        if (instance) {
            fetch();
        }
        // Fetch all collections
    }, [instance, sdk])

    

    const downloadOwnersCSV = async () => {
        if (!owners) return;
        //define the heading for each row of the data  
        var csv = 'Owner Address\n';  
                    
        //merge the data with CSV  
        owners.forEach(function(row) { 
                csv += row + "\n";  
        });  

        //display the created CSV data on the web browser   
        document.write(csv);  

        var hiddenElement = document.createElement('a');  
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);  
        hiddenElement.target = '_blank';  
            
        //provide the name for the CSV file to be downloaded  
        hiddenElement.download = 'owners.csv';  
        hiddenElement.click();  
    }

    return (
        <Section>
            <div className="flex mb-2 justify-between">
                <div className="flex items-center space-x-6">
                    <Link to='/'>
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                    <h1 className="flex-auto text-2xl font-bold">Collections</h1>
                </div>
            </div>
            <div className="flex mb-2 justify-between">
                <div className="flex items-center space-x-6">
                    <Button  variant="primary" onClick={createToken}>
                        + New token
                    </Button>
                    <Button variant="primary" onClick={downloadOwnersCSV} disabled={!instance}>
                        Download CSV of current owners
                    </Button>
                </div>
            </div>
            {(loadingTokens || loadingSB) && <Loader />}
            {errorTokens && <Alert type="error">{errorTokens.message}</Alert>}
            {errorSB && <Alert type="error">{errorSB.message}</Alert>}
            {instances && (
                <div>
                {assets && assets.map((asset) => (
                    <Link key={asset.id} to={`/token/${asset.id}`} className="block py-2 border-b border-gray first:border-t hover:bg-gray-100 truncate">
                    <h1>{asset.metadata.name}</h1>
                    </Link>
                    ))}
                </div>
            )}
        </Section>
    )
}