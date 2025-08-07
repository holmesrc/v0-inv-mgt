import { NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function GET() {
  console.log("=== LOAD FROM DB API START ===")

  try {
    if (!canUseSupabase()) {
      return NextResponse.json({
        success: false,
        error: "Supabase is not configured",
        configured: false,
      })
    }

    const supabase = createServerSupabaseClient()

    // Load inventory directly from database
    console.log("📖 Loading inventory from database...")
    const { data: inventoryData, error: inventoryError } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: true })

    if (inventoryError) {
      console.error("❌ Error loading inventory:", inventoryError)
      return NextResponse.json({
        success: false,
        error: "Failed to load inventory from database",
        details: inventoryError.message,
      })
    }

    console.log(`✅ Loaded ${inventoryData?.length || 0} items from database`)

    // Transform database format back to UI format
    const transformedInventory = (inventoryData || []).map((item: any, index: number) => ({
      id: item.id || `item-${index + 1}`,
      "Part number": item.part_number || "",
      "MFG Part number": item.mfg_part_number || "",
      QTY: item.qty || 0,
      "Part description": item.part_description || "",
      Supplier: item.supplier || "",
      Location: item.location || "",
      Package: item.package || "",
      lastUpdated: item.last_updated ? new Date(item.last_updated) : new Date(),
      reorderPoint: item.reorder_point || 10,
    }))

    console.log("✅ Transformed inventory data for UI")

    // Try to load package note from settings
    let packageNote = ""
    try {
      const { data: settingsData } = await supabase.from("settings").select("*").eq("key", "package_note").single()

      if (settingsData?.value) {
        packageNote = settingsData.value
        console.log("✅ Loaded package note from settings")
      }
    } catch (settingsError) {
      console.warn("⚠️ Could not load package note:", settingsError)
      // Don't fail the whole operation if settings fail
    }

    return NextResponse.json({
      success: true,
      data: transformedInventory,
      packageNote,
      count: transformedInventory.length,
      source: "database",
    })
  } catch (error) {
    console.error("❌ Critical error in load from DB:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Critical error loading from database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
