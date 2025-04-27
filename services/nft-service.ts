"use client"

import type { ethers } from "ethers"
import type { NFTItem } from "@/lib/types"

export async function mintNFT(contract: ethers.Contract, creator: string, spaceId: number, metadataUri: string) {
  try {
    const tx = await contract.mintNFT(creator, spaceId, metadataUri)
    const receipt = await tx.wait()

    // Find the NFTMinted event to get the tokenId
    const event = receipt.events?.find((e) => e.event === "NFTMinted")
    if (event && event.args) {
      return {
        tokenId: event.args.tokenId.toNumber(),
        success: true,
      }
    }

    return { success: true }
  } catch (error) {
    console.error(`Error minting NFT for space ${spaceId}:`, error)
    throw error
  }
}

export async function getNFTsByOwner(contract: ethers.Contract, owner: string): Promise<NFTItem[]> {
  try {
    // This is a simplified approach - in a real app, you'd use events or a subgraph
    const balance = await contract.balanceOf(owner)
    const nfts: NFTItem[] = []

    for (let i = 0; i < balance.toNumber(); i++) {
      try {
        const tokenId = await contract.tokenOfOwnerByIndex(owner, i)
        const metadataUri = await contract.tokenURI(tokenId)

        // In a real implementation, you'd need to get the spaceId from somewhere
        // This is just a placeholder
        nfts.push({
          tokenId: tokenId.toNumber(),
          owner,
          spaceId: 0, // Placeholder
          metadataUri,
        })
      } catch (err) {
        console.error(`Error getting NFT at index ${i} for owner ${owner}:`, err)
      }
    }

    return nfts
  } catch (error) {
    console.error(`Error getting NFTs for owner ${owner}:`, error)
    return []
  }
}
