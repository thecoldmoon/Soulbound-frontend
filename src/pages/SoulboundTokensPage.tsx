import {Alert, AssetUploader, Button, ButtonLink, Loader, Section, useInstance, useInstances, useSDK, useCreateAsset, useCreateInstance} from '@manifoldxyz/studio-app-sdk-react'
import {Job, Asset} from '@manifoldxyz/studio-app-sdk'
import {AttachmentInfo, AirdroppedToken, Collection} from 'src/types'
import {Link, useParams, useNavigate} from 'react-router-dom'
import {useEffect, useState, useCallback} from 'react'
import {ArrowLeftIcon} from '@heroicons/react/outline'
import {abi721} from 'src/lib/manifold-creator-abi'

export function SoulboundTokensPage() {
    const navigate = useNavigate()
    const params = useParams<{ id: string }>()
    const id = parseInt(params.id!)

    const sdk = useSDK()
    const { isLoading: loadingSB, error: errorSB, data: instance } = useInstance<AttachmentInfo>(id)
    const { isLoading: loadingTokens, error: errorTokens, data: instances } = useInstances<Collection>()
    const { mutateAsync: createInstance } = useCreateInstance<Collection>()

    const [collectionMap, setCollectionMap] = useState<Map<string, number>>(new Map<string, number>())
    const [collectionName, setCollectionName] = useState('')
    const [collection, setCollection] = useState('')
    const [collections, setCollections] = useState<Collection[]>()

    const people = [
        {
            name: 'Calvin Hawkins',
            email: 'calvin.hawkins@example.com',
            image:
            'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        {
            name: 'Kristen Ramos',
            email: 'kristen.ramos@example.com',
            image:
            'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        {
            name: 'Ted Fox',
            email: 'ted.fox@example.com',
            image:
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
    ]   

    useEffect(() => {
        const fetch = async () => {
            if (!instances) return;
            var valid_collections: Collection[] = []
            var map: Map<string, number> = new Map<string, number>()
            instances.forEach(function({ id, data }) { 
                    if (data.attachmentId === id){
                        map.set(data.name, id);
                        valid_collections.push(data)
                    }
            });  
            setCollectionMap(map)
            setCollections(valid_collections)
        }

        if (instances) {
            fetch();
        }
    }, [instances, sdk])

    const createNewCollection = async () => {

        // Check if instance exists

        const newCollection: Collection = {
            name: collectionName,
            attachmentId: id,
        }

        const { id: instanceId } = await createInstance({ data: newCollection })
        navigate(`/contract/${id}/collection/${instanceId}`)
        
    }
    
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
                adminCheck: { 
                    creatorContractAddress: instance.data.creatorContract,
                    contractSpec: 'erc721'
                },
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
    
        return context.getOwners.output[0]
    }

    const downloadOwnersCSV = async () => {
        const fetched_owners = await getTokenOwners();
        if (!fetched_owners) return;
        //define the heading for each row of the data  
        var csv = 'Owner Address\n';  
                    
        //merge the data with CSV  
        fetched_owners.forEach(function(row: string) { 
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
            <div className="grid grid-cols-3">
                <div className="col-span-2 mb-2 ">
                    <h3 className="flex-auto text-2xl font-bold">Select or create a collection to add a token</h3>
                    {(loadingTokens || loadingSB) && <Loader />}
                    {errorTokens && <Alert type="error">{errorTokens.message}</Alert>}
                    {errorSB && <Alert type="error">{errorSB.message}</Alert>}
                    {instances && (
                        <div>
                        {collections && collections.map((coln) => (
                            <h1>{coln.name}</h1>
                            ))}
                        </div>
                    )}
                    <ul className="divide-y divide-gray-200">
                    {people.map((person) => (
                        <Button onClick={() => setCollection(person.email)} className="block py-4 border-b border-gray first:border-t hover:bg-gray-100 truncate">
                            <li key={person.email} className={person.email === collection ? "bg-sky-500/25 py-4 flex" : "py-4 flex"}>
                                <img className="h-10 w-10 rounded-full" src={person.image} alt="" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">{person.name}</p>
                                    <p className="text-sm text-gray-500">{person.email}</p>
                                </div>
                            </li>
                        </Button>
                    ))}
                    </ul>
                </div>
                <div className="col mb-2 ">
                    <div className="mb-5 justify-right">
                            {collection !== "" && (
                                <div>
                                    <ButtonLink  variant='secondary' to={`contract/:${id}/collection/${collectionMap.get(collection)}`}>
                                        + Add token to collection
                                    </ButtonLink>
                                    <Button variant='secondary' onClick={downloadOwnersCSV} disabled={collection === ""}>
                                        Download CSV of current owners of collection
                                    </Button>
                                </div>
                    )}
                            <div>
                                <label>
                                    New Collection Name:
                                    <input value={collectionName} onChange={e => setCollectionName(e.target.value)} type='text' />
                                </label>
                                <Button  variant="primary" onClick={createNewCollection} disabled={collectionName === ""}>
                                    + Create new collection
                                </Button>
                            </div>
                    </div>
                </div>
            </div>
        </Section>
    )
}