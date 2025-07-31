import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Debug: Fetching pending changes for location analysis...")

    // Fetch pending changes
    const { data: pendingChanges, error } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching pending changes:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log(`📋 Found ${pendingChanges?.length || 0} pending changes`)

    // Debug: Log the first few changes to see structure
    if (pendingChanges && pendingChanges.length > 0) {
      console.log("📊 Sample pending change structure:")
      console.log("First change:", JSON.stringify(pendingChanges[0], null, 2))
      if (pendingChanges.length > 1) {
        console.log("Second change:", JSON.stringify(pendingChanges[1], null, 2))
      }
    }

    // Extract locations using the same logic as the component
    const locations = []
    const debugInfo = {
      totalChanges: pendingChanges?.length || 0,
      processedChanges: [],
      extractedLocations: [],
      dataStructureAnalysis: [],
    }

    if (pendingChanges) {
      for (const change of pendingChanges) {
        const changeInfo = {
          id: change.id,
          changeType: change.change_type,
          status: change.status,
          hasItemData: !!change.item_data,
          itemDataType: typeof change.item_data,
          itemDataKeys: change.item_data ? Object.keys(change.item_data) : [],
          hasBatchItems: !!(change.item_data && change.item_data.batch_items),
          hasDirectLocation: !!(change.item_data && change.item_data.location),
          extractedFromThis: [],
        }

        // Analyze the data structure
        debugInfo.dataStructureAnalysis.push({
          id: change.id,
          item_data: change.item_data,
          item_data_type: typeof change.item_data,
          item_data_keys: change.item_data ? Object.keys(change.item_data) : null,
        })

        // Handle batch changes (batch_items array in item_data)
        if (change.item_data && change.item_data.batch_items && Array.isArray(change.item_data.batch_items)) {
          console.log(`📦 Processing batch change ${change.id} with ${change.item_data.batch_items.length} items`)
          for (const item of change.item_data.batch_items) {
            if (item.location && item.location.trim()) {
              const loc = item.location.trim()
              locations.push(loc)
              changeInfo.extractedFromThis.push(loc)
              console.log(`  ✅ Found batch location: ${loc}`)
            }
          }
        }
        // Handle individual changes (direct location field in item_data)
        else if (change.item_data && change.item_data.location && change.item_data.location.trim()) {
          const loc = change.item_data.location.trim()
          locations.push(loc)
          changeInfo.extractedFromThis.push(loc)
          console.log(`  ✅ Found individual location: ${loc}`)
        }

        debugInfo.processedChanges.push(changeInfo)
      }
    }

    debugInfo.extractedLocations = locations

    console.log("📍 Final extracted locations:", locations)
    console.log("🔍 Debug analysis complete")

    return NextResponse.json({
      success: true,
      data: {
        pendingChanges: pendingChanges || [],
        extractedLocations: locations,
        debugInfo,
      },
    })
  } catch (error) {
    console.error("❌ Error in debug pending locations:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch debug data" }, { status: 500 })
  }
}
