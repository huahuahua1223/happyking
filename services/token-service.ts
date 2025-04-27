"use client"

import { ethers } from "ethers"

export async function launchToken(
  contract: ethers.Contract,
  spaceId: number,
  creator: string,
  name: string,
  symbol: string,
) {
  try {
    // Get the required ETH amount for liquidity
    const liquidityEthAmount = await contract.LIQUIDITY_ETH_AMOUNT()

    const tx = await contract.launchToken(spaceId, creator, name, symbol, { value: liquidityEthAmount })

    await tx.wait()

    return true
  } catch (error) {
    console.error(`Error launching token for space ${spaceId}:`, error)
    throw error
  }
}

export async function getTokenAddress(contract: ethers.Contract, spaceId: number): Promise<string | null> {
  try {
    const tokenAddress = await contract.tokens(spaceId)

    if (tokenAddress === ethers.constants.AddressZero) {
      return null
    }

    return tokenAddress
  } catch (error) {
    console.error(`Error getting token address for space ${spaceId}:`, error)
    return null
  }
}
