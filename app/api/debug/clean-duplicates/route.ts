import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function POST() {
  const logs: string[] = []
  const log = (message: string) => {
    console.log(message)
    logs.push(message)
  }

  try {
    log("=== DUPLICATE CLEANUP START ===")

    if (!canUseSupabase()) {
      return NextResponse.json({
        success: false,
        error: "Supabase not configured",
        logs,
      })
    }

    const supabase = createServerSupabaseClient()

    // Get all items ordered by part_number and created_at
    log("Fetching all inventory items...")
    const { data: allItems, error: fetchError } = await supabase
      .from("inventory")
      .select("*")
      .order("part_number")
      .order("created_at", { ascending: false }) // Most recent first

    if (fetchError) {
      log(`❌ Error fetching inventory: ${fetchError.message}`)
      return NextResponse.json({
        success: false,
        error: fetchError.message,
        logs,
      })
    }

    log(`📊 Total items found: ${allItems?.length || 0}`)

    // Group by part number and keep only the most recent one
    const uniqueItems: { [key: string]: any } = {}
    const itemsToDelete: string[] = []

    allItems?.forEach((item) => {
      if (!uniqueItems[item.part_number]) {
        // First occurrence (most recent due to ordering)
        uniqueItems[item.part_number] = item
        log(`✅ Keeping: ${item.part_number} (ID: ${item.id})`)
      } else {
        // Duplicate - mark for deletion
        itemsToDelete.push(item.id)
        log(`🗑️ Marking for deletion: ${item.part_number} (ID: ${item.id})`)
      }
    })

    log(`📋 Unique items to keep: ${Object.keys(uniqueItems).length}`)
    log(`🗑️ Duplicate items to delete: ${itemsToDelete.length}`)

    if (itemsToDelete.length === 0) {
      log("✅ No duplicates found - database is clean!")
      return NextResponse.json({
        success: true,
        message: "No duplicates found",
        itemsKept: Object.keys(uniqueItems).length,
        itemsDeleted: 0,
        logs,
      })
    }

    // Delete duplicates in batches
    log("Deleting duplicate items...")
    const batchSize = 100
    let deletedCount = 0

    for (let i = 0; i < itemsToDelete.length; i += batchSize) {
      const batch = itemsToDelete.slice(i, i + batchSize)
      const { error: deleteError } = await supabase.from("inventory").delete().in("id", batch)

      if (deleteError) {
        log(`❌ Error deleting batch: ${deleteError.message}`)
        throw deleteError
      }

      deletedCount += batch.length
      log(`✅ Deleted batch of ${batch.length} items (total: ${deletedCount})`)
    }

    // Verify final count
    const { count: finalCount, error: countError } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })

    if (countError) {
      log(`⚠️ Could not verify final count: ${countError.message}`)
    } else {
      log(`📊 Final inventory count: ${finalCount}`)
    }

    log("=== DUPLICATE CLEANUP COMPLETE ===")

    return NextResponse.json({
      success: true,
      message: "Duplicates cleaned successfully",
      itemsKept: Object.keys(uniqueItems).length,
      itemsDeleted: deletedCount,
      finalCount,
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
