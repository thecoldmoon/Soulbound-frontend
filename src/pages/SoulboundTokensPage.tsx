import {Alert, AssetUploader, Button, ButtonLink, Loader, Section, useInstance, useInstances, useSDK, useSubmitJob, useCreateInstance} from '@manifoldxyz/studio-app-sdk-react'
import {Job, JobProgress} from '@manifoldxyz/studio-app-sdk'
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

    const {
        isProcessing,     // if job is still happening
        isSuccess,        // if job was successful or not
        progress,         // contains most recent progress event
        result,           // result of your job
        error,            // error object
        submit: submitJob            // handler to pass job to invoke
    } = useSubmitJob();

    const onProgress = (progress: JobProgress) => {
        console.log(progress.stage) // 'start-task' | 'complete-task'
        console.log(progress.result)
        console.log(progress.task.ref)
        console.log(progress.context)
    }
       

    useEffect(() => {
        const fetch = async () => {
            if (!instances) return;
            var valid_collections: Collection[] = []
            var map: Map<string, number> = new Map<string, number>()
            instances.forEach(function({ id:tid, data }) { 
                    if (data.attachmentId === id){
                        map.set(data.name, tid);
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

    useEffect(() => {
        console.log('Collections:', collections)
        console.log('error', error)
    }, [collections, error])

    const createNewCollection = async () => {

        // Check if instance exists

        const newCollection: Collection = {
            name: collectionName,
            attachmentId: id,
            edition: 0,
        }

        const { id: instanceId } = await createInstance({ data: newCollection })
        navigate(`/contract/${id}/collection/${instanceId}`)
        
    }
    
    const getTokenOwners = async () => {
        if (!instance || !instance.data) {
            return;
        }

        //TODO: Add collection name

        const getTokenOwners: Job = {
        title: `Get Collection Owners`,
        // onProgress,
        tasks: [
            {
                ref: 'getOwners',
                name: 'Get Collection Owners',
                description: 'Get Collection Owners',
                type: 'contract-call',
                inputs: {
                    address: instance.data.extensionContract, 
                    abi: abi721,
                    method: 'getTokenOwners',
                    args: [
                    ]
                },
            },
        ]
        }
    
        const { context } = await sdk.createJob(getTokenOwners);
    
        return context.getOwners.output
    }

    const downloadOwnersCSV = async () => {
        const fetched_owners = await getTokenOwners();
        console.log('fetched_owners', fetched_owners)
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
                            <Button onClick={() => setCollection(coln.name)} className="block flex py-4 pr-20 border-b border-gray first:border-t hover:bg-gray-100">
                            <li key={coln.name} className={coln.name === collection ? "bg-sky-500/25 pr-40 py-4 w-600 flex" : "py-4 pr-20 w-600 flex"}>
                                <div className="ml-1 w-10">
                                    <p className="text-sm font-medium text-gray-900 py-4">{coln.name}</p>
                                </div>
                            </li>
                        </Button>
                            ))}
                        {collections && collections.length === 0 && <Alert type="info">No collections found, try adding a new one.</Alert>}
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
                                    <input value={collectionName} onChange={e => setCollectionName(e.target.value)} type='text' />
                                </label>
                                <Button  variant="primary" onClick={createNewCollection} disabled={collectionName === ""}>
                                    + Create new collection
                                </Button>
                            </div>
                            {collection !== "" && (
                                <div>
                                    <Button variant='secondary' onClick={downloadOwnersCSV}>
                                        Download CSV of all owners of collection
                                    </Button>
                                    <ButtonLink  variant='secondary' to={`/contract/${id}/collection/${collectionMap.get(collection)}`}>
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