import {Alert, Button, Loader, Section, useInstances, ContractSelector, useSDK, useCreateAsset, useCreateInstance} from '@manifoldxyz/studio-app-sdk-react'
import {Job, Contract, Asset, Task, StudioAppSDK} from '@manifoldxyz/studio-app-sdk'
import {AirdroppedToken} from '../types'
import {Link, useNavigate} from 'react-router-dom'
import {useEffect, useState} from 'react'
import {abi721} from 'src/lib/manifold-creator-abi'

export function HomePage() {
    const sdk = useSDK()
    const navigate = useNavigate()
    const [contract, setContract] = useState<Contract>()
    

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
        return false
      }

      console.log(extensionsOnContract)
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

      console.log("nameJobs", getNameJobs)

      const checkExtensions: Job = {
      
        title: `checkCreatorExtensions`,
        tasks: getNameJobs,
      }

      const { context } = await sdk.createJob(checkExtensions)

      console.log("context", context)

      for (const value of Object.values(context)){
        console.log(value)
        if (value.output === 'NAME OF EXTENSION'){
          return true
        }
      }

      return false
    }

    const deploySoulboundContract = async (creatorContractAddress: string,) => {
      const deploySoulbound: Job = {
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
          },]
      }
      const { context } = await sdk.createJob(deploySoulbound)

      return context.deploySoulboundExtension.output.name
      
    }

    const registerSoulboundExtension = async (creatorContractAddress: string, extensionAddress:string) => {
      const getExtensions: Job = {
        title: `Create and Register Soulbound Extension to Creator Contract`,
        tasks: [
            {
              ref: 'registerExtension',
              name: 'Register Soulbound Extension',
              description: 'Register Soulbound Extension to creator contract',
              type: 'register-extension',
              inputs: {
                creatorContractAddress: creatorContractAddress,
                extensionAddress: extensionAddress,
                creatorContractSpec: 'erc721',
              }
            },
            {
              ref: 'deploySoulboundExtension',
              name: 'Deploy Soulbound Contract',
              description: 'Deploy Soulbound Extension Contract',
              type: 'contract-deploy',
              inputs: {
                abi: abi721,
                byteCode: "",
                args: [],
              }
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

      const creatorContractAddress = contract.contractInfo[1].contractAddress
      const extensionsOnContract = await getExtensions(creatorContractAddress);
      const extensionExists = await getExtensionNames(extensionsOnContract);

      if (extensionExists || true){
        navigate(`/contract/${contract.id}`)
        return
      }

      // const extensionAddress = await deploySoulboundContract(creatorContractAddress)
      // const linkSoulboundExtension = await registerSoulboundExtension(creatorContractAddress, extensionAddress);
      // navigate(`/contract/${contract.id}`)
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