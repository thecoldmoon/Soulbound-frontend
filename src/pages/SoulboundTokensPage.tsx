import {Alert, AssetUploader, Button, ButtonLink, Loader, Section, useInstance, useSDK} from '@manifoldxyz/studio-app-sdk-react'
import {Job, Asset} from '@manifoldxyz/studio-app-sdk'
import {AirdroppedToken} from 'src/types'
import {Link, useParams, useNavigate} from 'react-router-dom'
import {useEffect, useState} from 'react'
import {abi721} from 'src/lib/manifold-creator-abi'

export function SoulboundTokensPage() {
    const navigate = useNavigate()
    const params = useParams<{ id: string }>()
    const id = parseInt(params.id!)

    const [owners, setOwners] = useState([])
    const { isLoading, error, data: instance } = useInstance<AirdroppedToken>(id)
    const sdk = useSDK()

    // Manifold Implenetation
    const airdropToAddress = async () => {
        if (!instance) {
            return
        }

        const token = instance.data
        const assetId = token.assetId
        const contractAddress = token.extensionContract.address

        // Prepares the job with two tasks:
        // 1. Upload the asset to Arweave
        // 2. Call the mintBase function on the creator's Manifold Creator contract
        //    with the Arweave URI generated in the previous task.
        const mintJob: Job = {
            title: `Airdrop token to Address`,
            tasks: [
                {
                    ref: 'airdrop',
                    name: 'Airdrop to Address',
                    description: 'Mints the token on new owner wallet.',
                    type: 'tx',
                    inputs: {
                        address: contractAddress,
                        abi: abi721,
                        method: 'mint(address)',
                        args: [
                            '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // vitalik.eth
                        ]
                    },
                },
            ]
        }

        // Run the mint job
        await sdk.createJob(mintJob)
    }


    // PLAN FOR NOW:
    // 1. Connect to contract
    // 2. Check if extension is registered, if not, deploy and register contract
    //   {
    //     ref: 'registerExtension',
    //     name: 'Register the Soulbound Extension',
    //     description: 'Registers the extension on your Creator Contract',
    //     type: 'register-extension',
    //     adminCheck: { // Checks if the creator is an admin of the contract
    //       creatorContractAddress: creatorContractAddress,
    //       contractSpec: creatorContractSpec
    //     },
    //     inputs: {
    //       creatorContractAddress,
    //       extensionAddress,
    //       creatorContractSpec
    //     },
    //   }
    // 2. Function to add to collection, function to download CSV

    useEffect(() => {
        // Get all Owners
    }, [])

    const downloadOwnersCSV = async () => {
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
                    <h1 className="flex-auto text-2xl font-bold">Your tokens</h1>
                    <ButtonLink variant="primary" to="/token/new">
                        + New token
                    </ButtonLink>
                    <Button className="pb-4" variant="primary" onClick={downloadOwnersCSV}>
                        Download CSV of current owners
                    </Button>
                </div>
            </div>
            {isLoading && <Loader />}
            {error && <Alert type="error">{error.message}</Alert>}
            {instance &&
              <div>
               <Button className="pb-4" variant="primary" onClick={airdropToAddress}>Airdrop to New Owner</Button>
               <AssetUploader assetId={instance.data.assetId} />
              </div>
            }
        </Section>
    )
}