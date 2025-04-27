"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useContracts } from "@/hooks/use-contracts"
import { getUserProfile } from "@/services/user-service"
import type { UserProfile } from "@/lib/types"

export function useUserProfile() {
  const { isConnected, address } = useWallet()
  const { userProfile } = useContracts()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isConnected || !address || !userProfile) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const userProfileData = await getUserProfile(userProfile, address)
        setProfile(userProfileData)
        setError(null)
      } catch (err) {
        console.error("Error fetching user profile:", err)
        setError("Failed to load user profile")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [isConnected, address, userProfile])

  return { profile, loading, error }
}
