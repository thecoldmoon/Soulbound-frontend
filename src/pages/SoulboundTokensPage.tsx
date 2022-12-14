import {Alert, Button, ButtonLink, Loader, Section, useInstance, useInstances, useSDK, useSubmitJob, useCreateInstance} from '@manifoldxyz/studio-app-sdk-react'
import {Job} from '@manifoldxyz/studio-app-sdk'
import {AttachmentInfo, Collection} from 'src/types'
import {Link, useParams, useNavigate} from 'react-router-dom'
import {useEffect, useState} from 'react'
import {ArrowLeftIcon} from '@heroicons/react/outline'
import {soulbound_abi721} from 'src/lib/soulbound-abi'
import { ContractSpec } from '@manifoldxyz/studio-app-sdk/dist/types/domain'

export function SoulboundTokensPage() {
    const navigate = useNavigate()
    const params = useParams<{ id: string }>()
    const id = parseInt(params.id!)

    const sdk = useSDK()
    const { isLoading: loadingAttachment, error: attachmentError, data: attachmentInstance} = useInstance<AttachmentInfo>(id)
    const { isLoading: collectionsLoading, error: collectionError, data: collectionInstances } = useInstances<Collection>()
    const { mutateAsync: createInstance } = useCreateInstance<Collection>()

    const [collectionMap, setCollectionMap] = useState<Map<string, number>>(new Map<string, number>())
    const [newCollectionName, setNewCollectionName] = useState('')
    const [csvAvailable, setCSVAvailable] = useState(true)
    const [collection, setCollection] = useState('')
    const {error: submitError, submit: submitJob} = useSubmitJob();
       

    useEffect(() => {
        const getExistingCollectionInstances = (map: Map<string, number>) => {
             // The function fetches all existing collection instances and adds them to the map
            if (!collectionInstances) return;
            collectionInstances.forEach(function({ id:tid, data }) { 
                    if (data.attachmentId === id){
                        map.set(data.name, tid);
                    }
            });  
        }
        const syncCollections = async () => {
            // The function syncs contract collections with the collection instances:
            // 1. Gather existing collection instances from sdk
            // 2. Fetch all collections from the contract and update existing instances

            var map: Map<string, number> = new Map<string, number>()
            getExistingCollectionInstances(map);

            // Fetch Collections
            if (!collectionInstances || !attachmentInstance || !collectionMap) return;
            const getCollectionsOnContract: Job = {
                title: `Get Collection Owners`,
                tasks: [
                    {
                        ref: 'getCollectionsOnContract',
                        name: 'Get Collections on Soulbound Extension',
                        description: 'Get Collections on Soulbound Extension',
                        type: 'contract-call',
                        inputs: {
                            address: attachmentInstance.data.extensionContract, 
                            abi: soulbound_abi721,
                            method: 'getCollections()',
                            args:[],
                        },
                    },
                ]
            }
            
            const { context } = await sdk.createJob(getCollectionsOnContract);
            if (!context || context.error) {
                alert('Error fetching collections on contract');
                return;
            }

            const collectionNames = context.getCollectionsOnContract.output[0];
            const collectionEditions = context.getCollectionsOnContract.output[1];

            // Create new collection instance if doesn't exist for fetched collection
            for (let i = 0; i < collectionNames.length; i++) {
                const collectionName = collectionNames[i];
                if (map.has(collectionName)){
                    continue
                }
        
                const newCollection: Collection = {
                    name: collectionName,
                    attachmentId: id,
                    edition: collectionEditions[i],
                }
                const { id: instanceId } = await createInstance({ data: newCollection })
                map.set(collectionName, instanceId);
            }
            setCollectionMap(map)
        }

        if (collectionInstances) {
            syncCollections();
        }
    }, [collectionInstances, sdk, id, attachmentInstance, createInstance])

    const createNewCollection = async () => {
        // The functions prepares a new collection instance upon new collection request
        // 1. Alert user if collection name already exists
        // 2. Prepare CSV with fetched collection owners

        if (collectionMap.has(newCollectionName)){
            alert('Collection already exists!')
            return
        }

        const newCollection: Collection = {
            name: newCollectionName,
            attachmentId: id,
            edition: 0,
        }

        const { id: instanceId } = await createInstance({ data: newCollection })
        navigate(`/ext/${id}/collection/${instanceId}`)
        
    }
    
    const getTokenOwnersForCollection = async () => {
        // The function fetches all token owners for a collection from the sdk

        if (!attachmentInstance|| !attachmentInstance.data) {
            return;
        }
        const contractSpec: ContractSpec = 'erc721'

        const getTokenOwnersForCollection: Job = {
        title: `Get Collection Owners`,
        tasks: [
            {
                ref: 'getOwners',
                name: 'Get Collection Owners',
                description: 'Get Collection Owners',
                adminCheck: {
                    creatorContractAddress: attachmentInstance.data.creatorContract,
                    contractSpec: contractSpec,
                },
                type: 'contract-call',
                inputs: {
                    address: attachmentInstance.data.extensionContract, 
                    abi: soulbound_abi721,
                    method: 'getTokenOwnersForCollection(string)',
                    args:[collection],
                },
            },
        ]
        }
    
        const { context} = await sdk.createJob(getTokenOwnersForCollection);

        if (!context || context.error) {
            alert('Error fetching collection owners');
            return;
        }
    
        return context.getOwners.output[0]
    }

    const downloadOwnersCSV = async () => {
        // The functions prepares and exports the owners of a collection to a CSV file
        // 1. Alert user when there are no owners for collection
        // 2. Prepare CSV with fetched collection owners

        const fetched_owners = await getTokenOwnersForCollection();

        //If no owners were fetched, send alert message
        if (!fetched_owners || fetched_owners.length === 0) {
            setCSVAvailable(false);
            return;
        }

        //Define the heading for each row of the data  
        var csv = 'Owner Address\n';  
        setCSVAvailable(true);

        //Merge the data with CSV  
        fetched_owners.forEach(function(row: string) { 
                csv += row + "\n";  
        });  

        var hiddenElement = document.createElement('a');  
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);  
        hiddenElement.target = '_blank';  
            
        //Provide the name for the CSV file to be downloaded  
        hiddenElement.download = collection+'_owners.csv';  
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
            <div className="grid grid-cols-3">
                <div className="col-span-2 mb-2 ">
                    <h3 className="flex-auto text-2xl font-bold">Select or create a collection to add a token</h3>
                    {!csvAvailable && <Alert type="info">No owners were found for this collection. Try another one </Alert>}
                    {collectionMap && Array.from(collectionMap.keys()).length === 0 && <Alert type="info">No collections found, try adding a new one.</Alert>}
                    {(collectionsLoading || loadingAttachment) && <Loader />}
                    {collectionError && <Alert type="error">{collectionError.message}</Alert>}
                    {attachmentError && <Alert type="error">{attachmentError.message}</Alert>}
                    {collectionInstances && (
                        <div>
                        {collectionMap && Array.from(collectionMap.keys()).map((coln) => (
                            <Button onClick={() => setCollection(coln)} className="block flex py-4 pr-20 border-b border-gray first:border-t hover:bg-gray-100">
                            <li key={coln} className={coln === collection ? "bg-sky-500/25 pr-40 py-4 w-600 flex" : "py-4 pr-20 w-600 flex"}>
                                <div className="ml-1 w-10">
                                    <p className="text-sm font-medium text-gray-900 py-4">{coln}</p>
                                </div>
                            </li>
                        </Button>
                            ))}
                        </div>
                    )}
                    <ul className="divide-y divide-gray-200">
                    </ul>
                </div>
                <div className="col mb-2 ">
                    <div className="mb-5 justify-right">
                            <div>
                                <label>
                                    New Collection Name:
                                    <input value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} type='text' />
                                </label>
                                <Button  variant="primary" onClick={createNewCollection} disabled={newCollectionName === ""}>
                                    + Create new collection
                                </Button>
                            </div>
                            {collection !== "" && (
                                <div>
                                    <Button variant='secondary' onClick={downloadOwnersCSV}>
                                        Download CSV of all owners of collection
                                    </Button>
                                    <ButtonLink  variant='secondary' to={`/ext/${id}/collection/${collectionMap.get(collection)}`}>
                                        + Add token to collection
                                    </ButtonLink>
                                </div>
                            )}
                    </div>
                </div>
            </div>
        </Section>
    )
}