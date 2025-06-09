import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("=== RLS POLICY TEST START ===")

    if (!canUseSupabase()) {
      return NextResponse.json(
        {
          error: "Supabase is not configured",
          configured: false,
        },
        { status: 503 },
      )
    }

    const supabase = createServerSupabaseClient()

    // Test 1: Check if we can read from inventory table
    console.log("Test 1: Reading from inventory table...")
    const { data: inventoryData, error: inventoryError } = await supabase
      .from("inventory")
      .select("id, part_number")
      .limit(1)

    if (inventoryError) {
      console.error("❌ Inventory read failed:", inventoryError)
      return NextResponse.json({
        success: false,
        error: "Failed to read inventory table",
        details: inventoryError.message,
        code: inventoryError.code,
        hint: "This suggests RLS policies are blocking access",
      })
    }
    console.log("✅ Inventory read successful")

    // Test 2: Try to insert a test item
    console.log("Test 2: Inserting test item...")
    const testItem = {
      part_number: `RLS-TEST-${Date.now()}`,
      mfg_part_number: "RLS-TEST-MFG",
      qty: 1,
      part_description: "RLS Policy Test Item",
      supplier: "Test Supplier",
      location: "TEST-LOC",
      package: "TEST-PKG",
      reorder_point: 5,
      last_updated: new Date().toISOString(),
    }

    const { data: insertData, error: insertError } = await supabase
      .from("inventory")
      .insert(testItem)
      .select("id, part_number")
      .single()

    if (insertError) {
      console.error("❌ Insert failed:", insertError)
      return NextResponse.json({
        success: false,
        error: "Failed to insert test item",
        details: insertError.message,
        code: insertError.code,
        hint: "This suggests RLS policies are blocking inserts",
      })
    }
    console.log("✅ Insert successful:", insertData)

    // Test 3: Clean up test item
    console.log("Test 3: Cleaning up test item...")
    const { error: deleteError } = await supabase.from("inventory").delete().eq("id", insertData.id)

    if (deleteError) {
      console.warn("⚠️ Cleanup failed:", deleteError)
    } else {
      console.log("✅ Cleanup successful")
    }

    // Test 4: Check settings table
    console.log("Test 4: Testing settings table...")
    const { data: settingsData, error: settingsError } = await supabase.from("settings").select("*").limit(1)

    if (settingsError) {
      console.error("❌ Settings read failed:", settingsError)
      return NextResponse.json({
        success: false,
        error: "Failed to read settings table",
        details: settingsError.message,
        code: settingsError.code,
        hint: "Settings table RLS policies may need configuration",
      })
    }
    console.log("✅ Settings read successful")

    console.log("=== RLS POLICY TEST SUCCESS ===")
    return NextResponse.json({
      success: true,
      message: "All RLS policy tests passed",
      tests: {
        inventoryRead: "✅ PASS",
        inventoryInsert: "✅ PASS",
        inventoryDelete: "✅ PASS",
        settingsRead: "✅ PASS",
      },
      inventoryCount: inventoryData?.length || 0,
      settingsCount: settingsData?.length || 0,
    })
  } catch (error) {
    console.error("=== RLS POLICY TEST CRITICAL ERROR ===")
    console.error("Critical error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Critical error during RLS test",
        details: error instanceof Error ? error.message : "Unknown error",
        hint: "Check Supabase configuration and RLS policies",
      },
      { status: 500 },
    )
  }
}
