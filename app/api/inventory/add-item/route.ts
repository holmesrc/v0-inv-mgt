import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, canUseSupabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  console.log("=== ADD ITEM API CALLED ===")

  try {
    // Step 1: Check if Supabase is configured
    console.log("Step 1: Checking Supabase configuration...")
    if (!canUseSupabase()) {
      console.log("❌ Supabase not configured")
      return NextResponse.json(
        {
          error: "Supabase is not configured. Data will be stored locally only.",
          configured: false,
        },
        { status: 503 },
      )
    }
    console.log("✅ Supabase is configured")

    // Step 2: Parse request body
    console.log("Step 2: Parsing request body...")
    let item
    try {
      const requestBody = await request.json()
      item = requestBody.item
      console.log("✅ Request body parsed successfully")
      console.log("Item:", item)
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError)
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseError instanceof Error ? parseError.message : "Unknown parsing error",
        },
        { status: 400 },
      )
    }

    // Step 3: Validate item data
    console.log("Step 3: Validating item data...")
    if (!item || typeof item !== "object") {
      console.error("❌ Invalid item data:", typeof item)
      return NextResponse.json({ error: "Invalid item data - must be an object" }, { status: 400 })
    }

    if (!item["Part number"] || typeof item["Part number"] !== "string" || !item["Part number"].trim()) {
      console.error("❌ Missing part number")
      return NextResponse.json({ error: "Part number is required" }, { status: 400 })
    }
    console.log("✅ Item data is valid")

    // Step 4: Create Supabase client
    console.log("Step 4: Creating Supabase client...")
    let supabase
    try {
      supabase = createServerSupabaseClient()
      console.log("✅ Supabase client created")
    } catch (clientError) {
      console.error("❌ Error creating Supabase client:", clientError)
      return NextResponse.json(
        {
          error: "Failed to create database connection",
          details: clientError instanceof Error ? clientError.message : "Unknown client error",
        },
        { status: 500 },
      )
    }

    // Step 5: Transform item data
    console.log("Step 5: Transforming item data...")
    const transformedItem = {
      part_number: String(item["Part number"]).trim(),
      mfg_part_number: String(item["MFG Part number"] || "").trim(),
      qty: isNaN(Number(item.QTY)) ? 0 : Math.max(0, Number(item.QTY)),
      part_description: String(item["Part description"] || "").trim(),
      supplier: String(item.Supplier || "").trim(),
      location: String(item.Location || "").trim(),
      package: String(item.Package || "").trim(),
      reorder_point: isNaN(Number(item.reorderPoint)) ? 10 : Math.max(0, Number(item.reorderPoint)),
      last_updated: new Date().toISOString(),
    }
    console.log("✅ Item transformed:", transformedItem)

    // Step 6: Insert item
    console.log("Step 6: Inserting item...")
    const { data: insertedItem, error: insertError } = await supabase
      .from("inventory")
      .insert(transformedItem)
      .select("*")
      .single()

    if (insertError) {
      console.error("❌ Error inserting item:", insertError)
      return NextResponse.json(
        {
          error: "Failed to insert item",
          details: insertError.message,
          code: insertError.code,
        },
        { status: 500 },
      )
    }

    console.log("✅ Item inserted successfully:", insertedItem)

    // Step 7: Return success response
    return NextResponse.json({
      success: true,
      message: "Item added successfully",
      item: insertedItem,
    })
  } catch (error) {
    console.error("=== ADD ITEM CRITICAL ERROR ===")
    console.error("Critical error adding item:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Critical error adding item",
        details: error instanceof Error ? error.message : "Unknown critical error",
        type: error instanceof Error ? error.constructor.name : "Unknown",
      },
      { status: 500 },
    )
  }
}
