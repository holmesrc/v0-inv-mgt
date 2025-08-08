import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"
import { suggestNextLocation, type LocationData } from "@/lib/location-utils"

export async function GET() {
  try {
    if (!canUseSupabase()) {
      return NextResponse.json(
        { error: "Supabase is not configured", suggestion: null },
        { status: 503 }
      )
    }

    const supabase = createServerSupabaseClient()
    const allLocations: LocationData[] = []

    // 1. Get locations from inventory
    const { data: inventory, error: inventoryError } = await supabase
      .from("inventory")
      .select("location")
      .not("location", "is", null)
      .not("location", "eq", "")

    if (inventoryError) {
      console.error("Error fetching inventory locations:", inventoryError)
    } else {
      inventory?.forEach(item => {
        if (item.location) {
          allLocations.push({ location: item.location, source: 'inventory' })
        }
      })
    }

    // 2. Get locations from pending changes
    const { data: pending, error: pendingError } = await supabase
      .from("pending_changes")
      .select("item_data")
      .eq("status", "pending")

    if (pendingError) {
      console.error("Error fetching pending locations:", pendingError)
    } else {
      pending?.forEach(change => {
        if (change.item_data) {
          // Handle single item changes
          if (change.item_data.location) {
            allLocations.push({ location: change.item_data.location, source: 'pending' })
          }
          
          // Handle batch changes
          if (change.item_data.is_batch && change.item_data.batch_items) {
            change.item_data.batch_items.forEach((item: any) => {
              if (item.location) {
                allLocations.push({ location: item.location, source: 'batch' })
              }
            })
          }
        }
      })
    }

    // 3. Suggest next location
    const suggestion = suggestNextLocation(allLocations)

    return NextResponse.json({
      success: true,
      suggestion,
      locationCount: allLocations.length,
      sources: {
        inventory: allLocations.filter(l => l.source === 'inventory').length,
        pending: allLocations.filter(l => l.source === 'pending').length,
        batch: allLocations.filter(l => l.source === 'batch').length
      }
    })

  } catch (error) {
    console.error("Error in suggest-location API:", error)
    return NextResponse.json(
      { error: "Failed to suggest location", suggestion: null },
      { status: 500 }
    )
  }
}
