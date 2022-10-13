import {Button, Section, useInstances, ContractSelector, useSDK, useCreateInstance} from '@manifoldxyz/studio-app-sdk-react'
import {Job, Contract,  Task} from '@manifoldxyz/studio-app-sdk'
import {contractByteCode} from 'src/contracts/contractByteCode'
import {AttachmentInfo} from '../types'
import {useNavigate} from 'react-router-dom'
import {useState} from 'react'
import {abi721} from 'src/lib/manifold-creator-abi'
import {soulbound_abi721} from 'src/lib/soulbound-abi'

export function HomePage() {
    const sdk = useSDK()
    const navigate = useNavigate()
    const [contract, setContract] = useState<Contract>()
    const { mutateAsync: createInstance } = useCreateInstance<AttachmentInfo>()
    const { isLoading, error, data: instances } = useInstances<AttachmentInfo>()
    
    const createAttachmentInfo = async (creatorContractAddress: string, extensionAddress: string) => {
      // The function creates AttachmentInfo instance when needed. This instance is used to 
      // associate the creator contract address and the extension contract address.

      if (!creatorContractAddress || !extensionAddress) {
          return;
      }

      // Check if instance exists
      const newToken: AttachmentInfo = {
          creatorContract: creatorContractAddress,
          extensionContract: extensionAddress,
      }

      const { id: instanceId } = await createInstance({ data: newToken })
      navigate(`/ext/${instanceId}`)
    }

    const getRegisteredSoulboundExt = async (creatorContractAddress: string) => {
      // The function checks for an existing soulbound extension on the contract
      // 1. Get all extensions on the contract
      // 2. Check with the interface of every extension of it supports the soulbound interface
      //    If so, return the address of the extension. Otherwise, return empty string

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
    
      const { context: extensionContext } = await sdk.createJob(getExtensions)
      const extensionsOnContract = extensionContext.getExtensions.output[0]

      if (extensionsOnContract.length === 0) {
        return ""
      }

      let supportInterfaceJobs: Task[] = extensionsOnContract.map((extension: string) => 
        ({
          ref: extension,
          name: 'Get Extension Interfaces',
          description: 'Check interface support of registered extension',
          type: 'contract-call',
          inputs: {
              address: extension, 
              abi: soulbound_abi721,
              method: 'supportsInterface(bytes4)',
              args: ['0x54bd1f8f']
          },})
      );


      const checkExtensionInterfaces: Job = {
      
        title: `checkCreatorExtensions`,
        tasks: supportInterfaceJobs,
      }

      const { context: interfaceContext } = await sdk.createJob(checkExtensionInterfaces)

      for (const [key, value] of Object.entries(interfaceContext)) {
        if (value.output[0] === true){
          return key
        }
      }

      return ""
    }

    const registerSoulboundExtension = async (creatorContractAddress: string) => {
      // The function registers a soulbound extension on the selected creator contract
      
      const getExtensions: Job = {
        title: `Create and Register Soulbound Extension to Creator Contract`,
        tasks: [
            {
              ref: 'deploySoulboundExtension',
              name: 'Deploy Soulbound Contract',
              description: 'Deploy Soulbound Extension Contract',
              type: 'contract-deploy',
              inputs: {
                abi: soulbound_abi721,
                byteCode: contractByteCode.object,
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
                extensionAddress: `{{deploySoulboundExtension.output.contractAddress}}`,
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
                address: `{{deploySoulboundExtension.output.contractAddress}}`,
                abi: soulbound_abi721,
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
      return context.deploySoulboundExtension.output.contractAddress
    }

    const prepareExtension = async () => {
      // The function checks for an existing soulbound extension on the contract
      // 1. Checks if soulbound extension exists, if so, create extension instance with it
      // 2. If soulbound extension doesn't exist, it deploys a new one and registers it to the creator contract

      if (!contract) {
        return;
      }
  
      const creatorContractAddr = contract.contractInfo[1].contractAddress
      const soulboundAddr = await getRegisteredSoulboundExt(creatorContractAddr);

      // Register extension if needed, else use existing extension
      let linkSoulboundExtension = soulboundAddr === "" ? await registerSoulboundExtension(creatorContractAddr) : soulboundAddr;
      await createAttachmentInfo(creatorContractAddr, linkSoulboundExtension)
    }

    const selectCreatorContract = async () => {
      // The function checks for an existing instance of the extension contract
      // 1. Checks if extension instance exists
      // 2. If extension instance doesn't exist, it prepares the extension contract for the creator contract

      if (!instances || !contract) {
        return;
      }

      const creatorContractAddr = contract.contractInfo[1].contractAddress
      const instanceExists = instances.find( item => item.data.creatorContract === creatorContractAddr)
      if (instanceExists) {
        navigate(`/ext/${instanceExists.id}`)
        return
      }

      await prepareExtension()
    }

    return (
        <div>
        <Section>
            <div className="flex mb-2 justify-between">
                <div className="flex items-center space-x-6">
                    <h1 className="flex-auto text-2xl font-bold">Choose the contract you wish to mint Soulbound NFTs on</h1>
                </div>
                <Button variant="primary" onClick={selectCreatorContract} disabled={!contract}>
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