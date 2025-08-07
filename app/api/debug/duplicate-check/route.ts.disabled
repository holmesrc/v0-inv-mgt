import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function GET() {
  const logs: string[] = []
  const log = (message: string) => {
    console.log(message)
    logs.push(message)
  }

  try {
    log("=== DUPLICATE CHECK START ===")

    if (!canUseSupabase()) {
      return NextResponse.json({
        success: false,
        error: "Supabase not configured",
        logs,
      })
    }

    const supabase = createServerSupabaseClient()

    // Check for duplicate part numbers in database
    log("Checking for duplicate part numbers in database...")
    const { data: allItems, error: fetchError } = await supabase
      .from("inventory")
      .select("id, part_number, created_at")
      .order("part_number")

    if (fetchError) {
      log(`❌ Error fetching inventory: ${fetchError.message}`)
      return NextResponse.json({
        success: false,
        error: fetchError.message,
        logs,
      })
    }

    log(`📊 Total items in database: ${allItems?.length || 0}`)

    // Group by part number to find duplicates
    const partNumberGroups: { [key: string]: any[] } = {}
    allItems?.forEach((item) => {
      if (!partNumberGroups[item.part_number]) {
        partNumberGroups[item.part_number] = []
      }
      partNumberGroups[item.part_number].push(item)
    })

    // Find duplicates
    const duplicates = Object.entries(partNumberGroups).filter(([partNumber, items]) => items.length > 1)

    log(`🔍 Found ${duplicates.length} part numbers with duplicates`)

    const duplicateDetails = duplicates.map(([partNumber, items]) => ({
      partNumber,
      count: items.length,
      ids: items.map((item) => item.id),
      createdDates: items.map((item) => item.created_at),
    }))

    // Check for recent duplicates (created within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const recentDuplicates = duplicateDetails.filter((dup) => dup.createdDates.some((date) => date > oneHourAgo))

    log(`⏰ Found ${recentDuplicates.length} part numbers with recent duplicates`)

    // Get unique part numbers count
    const uniquePartNumbers = Object.keys(partNumberGroups).length
    log(`📋 Unique part numbers: ${uniquePartNumbers}`)

    return NextResponse.json({
      success: true,
      totalItems: allItems?.length || 0,
      uniquePartNumbers,
      duplicateCount: duplicates.length,
      recentDuplicateCount: recentDuplicates.length,
      duplicateDetails: duplicateDetails.slice(0, 10), // First 10 for brevity
      recentDuplicates: recentDuplicates.slice(0, 5), // First 5 recent ones
      logs,
    })
  } catch (error) {
    log(`❌ Critical error: ${error instanceof Error ? error.message : "Unknown error"}`)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      logs,
    })
  }
}
