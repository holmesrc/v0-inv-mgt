"use client"

import { useState, useEffect } from "react"
import InventoryDashboard from "@/components/inventory-dashboard"
import SlackSetupGuide from "@/components/slack-setup-guide"
import SupabaseSetupGuide from "@/components/supabase-setup-guide"

export default function Home() {
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if Supabase is configured
    const checkSupabaseConfig = async () => {
      try {
        const response = await fetch("/api/excel")
        const data = await response.json()
        setSupabaseConfigured(data.configured !== false)
      } catch (error) {
        setSupabaseConfigured(false)
      }
    }

    checkSupabaseConfig()
  }, [])

  return (
    <div>
      <InventoryDashboard />
      {supabaseConfigured === false && <SupabaseSetupGuide />}
      <SlackSetupGuide />
    </div>
  )
}
