import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function POST(request: Request) {
  const logs: string[] = []
  const log = (message: string) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    logs.push(logMessage)
  }

  try {
    log("=== DETAILED SYNC DEBUG START ===")

    const { inventory, packageNote } = await request.json()
    log(`Received ${inventory?.length || 0} items to sync`)

    if (!canUseSupabase()) {
      log("❌ Supabase not configured")
      return NextResponse.json({ success: false, error: "Supabase not configured", logs })
    }
    log("✅ Supabase is configured")

    const supabase = createServerSupabaseClient()
    log("✅ Supabase client created")

    // Test connection
    log("Testing database connection...")
    const { data: testData, error: testError } = await supabase.from("inventory").select("count").limit(1)

    if (testError) {
      log(`❌ Connection test failed: ${testError.message}`)
      return NextResponse.json({ success: false, error: testError.message, logs })
    }
    log("✅ Database connection successful")

    // Check current inventory count
    const { count: currentCount, error: countError } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })

    if (countError) {
      log(`❌ Count check failed: ${countError.message}`)
    } else {
      log(`📊 Current inventory count: ${currentCount}`)
    }

    // Clear existing inventory
    log("Clearing existing inventory...")
    const { error: deleteError } = await supabase
      .from("inventory")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")

    if (deleteError) {
      log(`❌ Delete failed: ${deleteError.message}`)
      return NextResponse.json({ success: false, error: deleteError.message, logs })
    }
    log("✅ Existing inventory cleared")

    // Transform data
    log("Transforming inventory data...")
    const inventoryData = inventory.map((item: any, index: number) => {
      if (!item["Part number"]) {
        throw new Error(`Item at index ${index} missing part number`)
      }
      return {
        part_number: String(item["Part number"]).trim(),
        mfg_part_number: String(item["MFG Part number"] || "").trim(),
        qty: Math.max(0, Number(item.QTY) || 0),
        part_description: String(item["Part description"] || "").trim(),
        supplier: String(item.Supplier || "").trim(),
        location: String(item.Location || "").trim(),
        package: String(item.Package || "").trim(),
        reorder_point: Math.max(0, Number(item.reorderPoint) || 10),
        last_updated: new Date().toISOString(),
      }
    })
    log(`✅ Transformed ${inventoryData.length} items`)

    // Insert new data
    log("Inserting new inventory data...")
    const { data: insertedData, error: insertError } = await supabase
      .from("inventory")
      .insert(inventoryData)
      .select("id")

    if (insertError) {
      log(`❌ Insert failed: ${insertError.message}`)
      log(`Insert error code: ${insertError.code}`)
      log(`Insert error details: ${insertError.details}`)
      return NextResponse.json({
        success: false,
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        logs,
      })
    }
    log(`✅ Inserted ${insertedData?.length || 0} items`)

    // Verify the insert
    log("Verifying insert...")
    const { count: newCount, error: verifyError } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })

    if (verifyError) {
      log(`⚠️ Verification failed: ${verifyError.message}`)
    } else {
      log(`📊 New inventory count: ${newCount}`)
    }

    log("=== DETAILED SYNC DEBUG SUCCESS ===")
    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      itemsProcessed: inventoryData.length,
      itemsInserted: insertedData?.length || 0,
      finalCount: newCount,
      logs,
    })
  } catch (error) {
    log(`❌ Critical error: ${error instanceof Error ? error.message : "Unknown error"}`)
    log(`Error stack: ${error instanceof Error ? error.stack : "No stack"}`)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      logs,
    })
  }
}
