import {Alert, Button, Loader, Section, useDeleteInstance, useInstances, ContractSelector, useSDK, useCreateAsset, useCreateInstance} from '@manifoldxyz/studio-app-sdk-react'
import {Job, JobProgress, Contract, Asset, Task} from '@manifoldxyz/studio-app-sdk'
import {contractByteCode} from 'src/contracts/contractByteCode'
import {AttachmentInfo} from '../types'
import {useNavigate} from 'react-router-dom'
import {useState, useEffect} from 'react'
import {abi721} from 'src/lib/manifold-creator-abi'

export function HomePage() {
    const sdk = useSDK()
    const navigate = useNavigate()
    const [contract, setContract] = useState<Contract>()
    const { mutateAsync: createInstance } = useCreateInstance<AttachmentInfo>()
    const { mutateAsync: deleteInstance } = useDeleteInstance()
    const { isLoading, error, data: instances } = useInstances<AttachmentInfo>()

    const onProgress = (progress: JobProgress) => {
      console.log(progress.stage) // 'start-task' | 'complete-task'
      console.log(progress.result)
      console.log(progress.task.ref)
      console.log(progress.context)
  }

    useEffect(() => {
      const fetch = async () => {
          if (!instances) return
          instances.forEach(function({ id:id_instance, data }) { 
            deleteInstance({ id:id_instance})
          });  
      }

      if (instances) {
          console.log("instances", instances)
          fetch()
      }
  }, [instances, sdk])
    
    const createAttachmentInfo = async (creatorContractAddress: string, extensionAddress: string) => {
        console.log("createAttachmentInfo")
        if (!contract || !creatorContractAddress || !extensionAddress || !instances) {
            return;
        }

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
        return ""
      }

      let getNameJobs: Task[] = extensionsOnContract.map((extension: string) => 
        ({
          ref: extension,
          name: 'Get Extension Names',
          description: 'Get name of registered extension',
          type: 'contract-call',
          inputs: {
              address: extension, 
              abi: abi721,
              method: 'supportsInterface(bytes4)',
              args: ['0x736f756c']
          },})
      );

      const checkExtensions: Job = {
      
        title: `checkCreatorExtensions`,
        tasks: getNameJobs,
      }

      const { context } = await sdk.createJob(checkExtensions)
      console.log("extensionsOnContract:", context)

      // Change to verify extension type
      for (const [key, value] of Object.entries(context)) {
        if (value.output[0] === true){
          return key
        }
      }

      return ""
    }

    const registerSoulboundExtension = async (creatorContractAddress: string) => {
      console.log("registerSoulboundExtension")
      const getExtensions: Job = {
        title: `Create and Register Soulbound Extension to Creator Contract`,
        onProgress,
        tasks: [
            {
              ref: 'deploySoulboundExtension',
              name: 'Deploy Soulbound Contract',
              description: 'Deploy Soulbound Extension Contract',
              type: 'contract-deploy',
              inputs: {
                abi: abi721,
                byteCode: contractByteCode.object,
                args: [],
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
    
      // TODO: Change to return extension address
      return context.deploySoulboundExtension.output.name
    }

    const prepareExtension = async () => {
      if (!contract) {
        return;
      }
      const creatorContractAddr = contract.contractInfo[1].contractAddress
      const extensionsOnContract = await getExtensions(creatorContractAddr);
      console.log("extensionsOnContract", extensionsOnContract)
      const soulboundAddr = await getExtensionNames(extensionsOnContract);
      console.log("extensionsNames", soulboundAddr)

      // Register extension if needed, else use existing extension
      let linkSoulboundExtension = soulboundAddr === "" ? await registerSoulboundExtension(creatorContractAddr) : soulboundAddr;
      await createAttachmentInfo(creatorContractAddr, linkSoulboundExtension)
    }

    const prepareAttachmentInfo = async () => {
      if (!instances || !contract) {
        return;
      }

      // Check if soulbound extension is registered with contract AND has instance
      const creatorContractAddr = contract.contractInfo[1].contractAddress
      const instanceExists = instances.find( item => item.data.creatorContract === creatorContractAddr)
      console.log('Extension Exists', instanceExists)
      if (instanceExists) {
        navigate(`/contract/${instanceExists.id}`)
        return
      }

      // Check if soulbound extension is registered with contract, but no instance
      await prepareExtension()
    }

    return (
        <div>
        <Section>
            <div className="flex mb-2 justify-between">
                <div className="flex items-center space-x-6">
                    <h1 className="flex-auto text-2xl font-bold">Choose the contract you wish to mint Soulbound NFTs on</h1>
                </div>
                <Button variant="primary" onClick={prepareAttachmentInfo} disabled={!contract}>
                    Select
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