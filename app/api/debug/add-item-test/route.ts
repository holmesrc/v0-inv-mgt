import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function POST(request: Request) {
  const logs: string[] = []
  const log = (message: string) => {
    console.log(message)
    logs.push(message)
  }

  try {
    log("=== ADD ITEM TEST START ===")

    const { testItem } = await request.json()
    log(`Testing with item: ${JSON.stringify(testItem)}`)

    if (!canUseSupabase()) {
      log("❌ Supabase not configured")
      return NextResponse.json({ success: false, error: "Supabase not configured", logs })
    }
    log("✅ Supabase is configured")

    const supabase = createServerSupabaseClient()
    log("✅ Supabase client created")

    // Test 1: Check current inventory count
    log("Test 1: Checking current inventory count...")
    const { count: beforeCount, error: countError } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })

    if (countError) {
      log(`❌ Count check failed: ${countError.message}`)
      return NextResponse.json({ success: false, error: countError.message, logs })
    }
    log(`✅ Current inventory count: ${beforeCount}`)

    // Test 2: Transform the test item
    log("Test 2: Transforming test item...")
    const transformedItem = {
      part_number: String(testItem["Part number"]).trim(),
      mfg_part_number: String(testItem["MFG Part number"] || "").trim(),
      qty: Math.max(0, Number(testItem.QTY) || 0),
      part_description: String(testItem["Part description"] || "").trim(),
      supplier: String(testItem.Supplier || "").trim(),
      location: String(testItem.Location || "").trim(),
      package: String(testItem.Package || "").trim(),
      reorder_point: Math.max(0, Number(testItem.reorderPoint) || 10),
      last_updated: new Date().toISOString(),
    }
    log(`✅ Transformed item: ${JSON.stringify(transformedItem)}`)

    // Test 3: Insert the test item
    log("Test 3: Inserting test item...")
    const { data: insertedData, error: insertError } = await supabase
      .from("inventory")
      .insert([transformedItem])
      .select("*")

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
    log(`✅ Item inserted successfully: ${JSON.stringify(insertedData[0])}`)

    // Test 4: Verify the insert
    log("Test 4: Verifying insert...")
    const { count: afterCount, error: verifyCountError } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })

    if (verifyCountError) {
      log(`❌ Verification count failed: ${verifyCountError.message}`)
    } else {
      log(`✅ New inventory count: ${afterCount}`)
      log(`✅ Count increased by: ${(afterCount || 0) - (beforeCount || 0)}`)
    }

    // Test 5: Read back the specific item
    log("Test 5: Reading back the inserted item...")
    const { data: readBackData, error: readBackError } = await supabase
      .from("inventory")
      .select("*")
      .eq("part_number", transformedItem.part_number)
      .order("created_at", { ascending: false })
      .limit(1)

    if (readBackError) {
      log(`❌ Read back failed: ${readBackError.message}`)
    } else if (readBackData && readBackData.length > 0) {
      log(`✅ Item read back successfully: ${JSON.stringify(readBackData[0])}`)
    } else {
      log(`⚠️ Item not found when reading back`)
    }

    // Test 6: Clean up (delete the test item)
    log("Test 6: Cleaning up test item...")
    if (insertedData && insertedData.length > 0) {
      const { error: deleteError } = await supabase.from("inventory").delete().eq("id", insertedData[0].id)

      if (deleteError) {
        log(`⚠️ Could not clean up test item: ${deleteError.message}`)
      } else {
        log(`✅ Test item cleaned up successfully`)
      }
    }

    log("=== ADD ITEM TEST SUCCESS ===")
    return NextResponse.json({
      success: true,
      message: "Add item test completed successfully",
      beforeCount,
      afterCount,
      insertedItem: insertedData[0],
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
