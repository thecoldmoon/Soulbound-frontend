import {Alert, Button, Loader, Section, useDeleteInstance, useInstances, ContractSelector, useSDK, useCreateAsset, useCreateInstance} from '@manifoldxyz/studio-app-sdk-react'
import {Job, Contract, Asset, Task} from '@manifoldxyz/studio-app-sdk'
import {AttachmentInfo} from '../types'
import {useNavigate} from 'react-router-dom'
import {useState, useEffect} from 'react'
import {abi721} from 'src/lib/manifold-creator-abi'

export function HomePage() {
    const sdk = useSDK()
    const navigate = useNavigate()
    const [contract, setContract] = useState<Contract>()
    const { mutateAsync: createInstance } = useCreateInstance<AttachmentInfo>()
    const deleteInstance = useDeleteInstance()
    const { isLoading, error, data: instances } = useInstances<AttachmentInfo>()
    
    const createAttachmentInfo = async (creatorContractAddress: string, extensionAddress: string) => {
        if (!contract || !creatorContractAddress || !extensionAddress || !instances) {
            return;
        }
        instances.forEach(function({ id, data }) { 
          if (data.creatorContract === creatorContractAddress && data.extensionContract === extensionAddress) {
              navigate(`/contract/${id}`)
              return
          }
        }); 

        // Check if instance exists
        const newToken: AttachmentInfo = {
            creatorContract: creatorContractAddress,
            extensionContract: extensionAddress,
        }

        const { id: instanceId } = await createInstance({ data: newToken })
        navigate(`/contract/${instanceId}`)
    }

    // Async Jobs
    const getExtensions = async (creatorContractAddress: string) => {
      const getExtensions: Job = {
        title: `getCreatorExtensions`,
        tasks: [
            {
              ref: 'getExtensions',
              name: 'Get Creator Extensions',
              description: 'Get registered creator contract extensions',
              type: 'contract-call',
              inputs: {
                  address: creatorContractAddress, 
                  abi: abi721,
                  method: 'getExtensions()',
                  args: [
                  ]
              },
            },
        ]
      }
    
      const { context } = await sdk.createJob(getExtensions)
    
      return context.getExtensions.output[0]
    }

    const getExtensionNames = async (extensionsOnContract: []) => {
      if (extensionsOnContract.length === 0) {
        return []
      }

      let getNameJobs: Task[] = extensionsOnContract.map((extension: string) => 
        ({
          ref: extension,
          name: 'Get Extension Name',
          description: 'Get name of registered extension',
          type: 'contract-call',
          inputs: {
              address: extension, 
              abi: abi721,
              method: 'owner',
              args: [
              ]
          },})
      );

      const checkExtensions: Job = {
      
        title: `checkCreatorExtensions`,
        tasks: getNameJobs,
      }

      const { context } = await sdk.createJob(checkExtensions)
      let extensionAddress: string[] = []

      for (const [key, value] of Object.entries(context)) {
        if (value.output[0] === '0x789564821c100B9516F567046285c89a01f25D10'){
          extensionAddress.push(key)
        }
      }

      return extensionAddress
    }

    const registerSoulboundExtension = async (creatorContractAddress: string) => {
      const getExtensions: Job = {
        title: `Create and Register Soulbound Extension to Creator Contract`,
        tasks: [
            {
              ref: 'deploySoulboundExtension',
              name: 'Deploy Soulbound Contract',
              description: 'Deploy Soulbound Extension Contract',
              type: 'contract-deploy',
              inputs: {
                abi: abi721,
                byteCode: "",
                args: [creatorContractAddress],
              }
            },
            {
              ref: 'registerExtension',
              name: 'Register Soulbound Extension',
              description: 'Register Soulbound Extension to creator contract',
              type: 'register-extension',
              adminCheck: { 
                creatorContractAddress: creatorContractAddress,
                contractSpec: 'erc721'
              },
              inputs: {
                creatorContractAddress: creatorContractAddress,
                extensionAddress: `{{deploySoulboundExtension.output.name}}`,
                creatorContractSpec: 'erc721'
              }
            },
            {
              ref: 'setApproveTransfer',
              name: 'Approval for Transfer',
              description: 'Turn on Transfer Approval for Tokens minted on Extension Contract',
              type: 'tx',
              adminCheck: { 
                creatorContractAddress: creatorContractAddress,
                contractSpec: 'erc721'
              },
              inputs: {
                address: `{{deploySoulboundExtension.output.name}}`,
                abi: abi721,
                method: 'setApproveTransfer(address,bool)',
                args: [
                    creatorContractAddress, 
                    'true',
                ]
            },
          },
        ]
      }
    
      const { context } = await sdk.createJob(getExtensions)
    
      return context.getCreatorExtensions.output
    }

    const prepareExtension = async () => {
      if (!contract) {
        return;
      }

      // Check if soulbound extension is registered
      const creatorContractAddr = contract.contractInfo[1].contractAddress
      const extensionsOnContract = await getExtensions(creatorContractAddr);
      const extensionAddresses = await getExtensionNames(extensionsOnContract);
      console.log('extensions', extensionAddresses, extensionAddresses.length === 0 )

      // Register extension if needed, else use existing extension
      let linkSoulboundExtension = extensionAddresses.length === 0 ? await registerSoulboundExtension(creatorContractAddr) : extensionsOnContract[1];
      await createAttachmentInfo(creatorContractAddr, linkSoulboundExtension)
    }

    return (
        <div>
        <Section>
            <div className="flex mb-2 justify-between">
                <div className="flex items-center space-x-6">
                    <h1 className="flex-auto text-2xl font-bold">Choose the contract you wish to mint on</h1>
                </div>
                <Button variant="primary" onClick={prepareExtension} disabled={!contract}>
                    Create
                </Button>
            </div>
            <ContractSelector
                filter="goerli"
                specFilter="erc721"
                onSelect={setContract}
                fallback={
                    <div
                        className="relative block w-full space-y-4 border-2 border-gray-300 border-dashed rounded-lg p-12 text-center"
                    >
                        <h1 className="text-xl font-bold">You have no contracts deployed yet!</h1>
                        <p className="text-lg max-w-[500px] mx-auto">To continue, jump into <a className='underline'
                                                                                                href="https://studio.manifold.xyz"
                                                                                                target="_parent">Studio</a> and
                            deploy a Creator Contract to mainnet.</p>
                    </div>
                }/>
        </Section>
        </div>
    )
}