"use client"

import type { ethers } from "ethers"
import type { UserProfile } from "@/lib/types"

export async function createUserProfile(
  contract: ethers.Contract,
  nickname: string,
  username: string,
  bio: string,
  xName: string,
  tgName: string,
  avatarBlobId: string,
) {
  try {
    const tx = await contract.createProfile(nickname, username, bio, xName, tgName, avatarBlobId)

    await tx.wait()
    return true
  } catch (error) {
    console.error("Error creating user profile:", error)
    throw error
  }
}

export async function getUserProfile(contract: ethers.Contract, address: string): Promise<UserProfile | null> {
  try {
    const profile = await contract.users(address)

    if (!profile.initialized) {
      return null
    }

    return {
      nickname: profile.nickname,
      username: profile.username,
      bio: profile.bio,
      xName: profile.xName,
      tgName: profile.tgName,
      avatarBlobId: profile.avatarBlobId,
      initialized: profile.initialized,
    }
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}
