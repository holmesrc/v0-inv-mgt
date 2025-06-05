import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    if (!canUseSupabase()) {
      return NextResponse.json(
        {
          error: "Supabase is not configured. Please set up your environment variables.",
          configured: false,
        },
        { status: 503 },
      )
    }

    const supabase = createServerSupabaseClient()

    const { data: inventory, error } = await supabase.from("inventory").select("*").order("part_number")

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
    }

    // Transform data back to the expected format
    const transformedData = inventory.map((item) => ({
      id: item.id,
      "Part number": item.part_number,
      "MFG Part number": item.mfg_part_number,
      QTY: item.qty,
      "Part description": item.part_description,
      Supplier: item.supplier,
      Location: item.location,
      Package: item.package,
      reorderPoint: item.reorder_point,
      lastUpdated: new Date(item.last_updated),
    }))

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: transformedData.length,
    })
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json(
      {
        error: "Supabase configuration error",
        configured: false,
      },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canUseSupabase()) {
      return NextResponse.json(
        {
          error: "Supabase is not configured. Data will be stored locally only.",
          configured: false,
        },
        { status: 503 },
      )
    }

    const { inventory, packageNote, filename } = await request.json()
    const supabase = createServerSupabaseClient()

    // Clear existing inventory
    await supabase.from("inventory").delete().neq("id", "00000000-0000-0000-0000-000000000000")

    // Transform and insert new inventory data
    const inventoryData = inventory.map((item: any) => ({
      part_number: item["Part number"],
      mfg_part_number: item["MFG Part number"],
      qty: item.QTY,
      part_description: item["Part description"],
      supplier: item.Supplier,
      location: item.Location,
      package: item.Package,
      reorder_point: item.reorderPoint || 10,
    }))

    const { error: inventoryError } = await supabase.from("inventory").insert(inventoryData)

    if (inventoryError) {
      console.error("Error inserting inventory:", inventoryError)
      return NextResponse.json({ error: "Failed to save inventory" }, { status: 500 })
    }

    // Save package note if provided
    if (packageNote) {
      await supabase.from("package_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("package_notes").insert({ note: packageNote, filename: filename || "inventory.xlsx" })
    }

    return NextResponse.json({
      success: true,
      message: "Inventory saved successfully",
      count: inventoryData.length,
    })
  } catch (error) {
    console.error("Error saving inventory:", error)
    return NextResponse.json(
      {
        error: "Supabase configuration error",
        configured: false,
      },
      { status: 503 },
    )
  }
}
