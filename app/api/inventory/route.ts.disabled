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
  console.log("=== INVENTORY SYNC DEBUG START ===")

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
    let requestBody
    try {
      requestBody = await request.json()
      console.log("✅ Request body parsed successfully")
      console.log("Request body keys:", Object.keys(requestBody))
      console.log("Inventory items count:", requestBody.inventory?.length || 0)
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

    const { inventory, packageNote, filename } = requestBody

    // Step 3: Validate inventory data
    console.log("Step 3: Validating inventory data...")
    if (!inventory || !Array.isArray(inventory)) {
      console.error("❌ Invalid inventory data:", typeof inventory)
      return NextResponse.json({ error: "Invalid inventory data - must be an array" }, { status: 400 })
    }

    if (inventory.length === 0) {
      console.error("❌ Empty inventory array")
      return NextResponse.json({ error: "Cannot sync empty inventory" }, { status: 400 })
    }
    console.log("✅ Inventory data is valid")

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

    // Step 5: Test database connection with more detailed error handling
    console.log("Step 5: Testing database connection...")
    try {
      const { data: testData, error: testError } = await supabase.from("inventory").select("id").limit(1)

      if (testError) {
        console.error("❌ Database connection test failed:", testError)

        // Check for specific error types
        if (testError.message.includes("relation") && testError.message.includes("does not exist")) {
          return NextResponse.json(
            {
              error: "Database table 'inventory' does not exist",
              details: "Please run the SQL scripts to create the required tables",
              hint: "Run scripts/003-fix-table-structure.sql in your Supabase dashboard",
            },
            { status: 500 },
          )
        }

        if (testError.message.includes("permission denied")) {
          return NextResponse.json(
            {
              error: "Database permission denied",
              details: "The service role key doesn't have permission to access the inventory table",
              hint: "Check your Supabase RLS policies and service role permissions",
            },
            { status: 500 },
          )
        }

        return NextResponse.json(
          {
            error: "Database connection failed",
            details: testError.message,
            code: testError.code,
            hint: testError.hint,
          },
          { status: 500 },
        )
      }
      console.log("✅ Database connection successful")
    } catch (connectionError) {
      console.error("❌ Database connection error:", connectionError)
      return NextResponse.json(
        {
          error: "Database connection error",
          details: connectionError instanceof Error ? connectionError.message : "Unknown connection error",
        },
        { status: 500 },
      )
    }

    // Step 6: Clear existing inventory
    console.log("Step 6: Clearing existing inventory...")
    try {
      const { error: deleteError } = await supabase
        .from("inventory")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      if (deleteError) {
        console.error("❌ Error clearing existing inventory:", deleteError)
        return NextResponse.json(
          {
            error: "Failed to clear existing inventory",
            details: deleteError.message,
            code: deleteError.code,
            hint: deleteError.hint,
          },
          { status: 500 },
        )
      }
      console.log("✅ Existing inventory cleared")
    } catch (deleteError) {
      console.error("❌ Exception during inventory deletion:", deleteError)
      return NextResponse.json(
        {
          error: "Exception during inventory deletion",
          details: deleteError instanceof Error ? deleteError.message : "Unknown deletion error",
        },
        { status: 500 },
      )
    }

    // Step 7: Transform inventory data with better validation
    console.log("Step 7: Transforming inventory data...")
    let inventoryData
    try {
      inventoryData = inventory.map((item: any, index: number) => {
        // More thorough validation
        const partNumber = item["Part number"]
        if (!partNumber || typeof partNumber !== "string" || partNumber.trim() === "") {
          throw new Error(`Item at index ${index} has invalid or missing part number: "${partNumber}"`)
        }

        return {
          part_number: String(partNumber).trim(),
          mfg_part_number: String(item["MFG Part number"] || "").trim(),
          qty: isNaN(Number(item.QTY)) ? 0 : Math.max(0, Number(item.QTY)),
          part_description: String(item["Part description"] || "").trim(),
          supplier: String(item.Supplier || "").trim(),
          location: String(item.Location || "").trim(),
          package: String(item.Package || "").trim(),
          reorder_point: isNaN(Number(item.reorderPoint)) ? 10 : Math.max(0, Number(item.reorderPoint)),
          last_updated: new Date().toISOString(),
        }
      })

      console.log("✅ Inventory data transformed successfully")
      console.log("Sample transformed item:", inventoryData[0])
      console.log("Total items to insert:", inventoryData.length)
    } catch (transformError) {
      console.error("❌ Error transforming inventory data:", transformError)
      console.error("Problem item sample:", inventory.slice(0, 3))
      return NextResponse.json(
        {
          error: "Failed to transform inventory data",
          details: transformError instanceof Error ? transformError.message : "Unknown transformation error",
        },
        { status: 500 },
      )
    }

    // Step 8: Insert new inventory data with better error handling
    console.log("Step 8: Inserting new inventory data...")
    try {
      const { data: insertedData, error: inventoryError } = await supabase
        .from("inventory")
        .insert(inventoryData)
        .select("id")

      if (inventoryError) {
        console.error("❌ Error inserting inventory:", inventoryError)

        // Provide specific guidance based on error type
        let errorMessage = "Failed to save inventory"
        let hint = ""

        if (inventoryError.message.includes("duplicate key")) {
          errorMessage = "Duplicate part numbers detected"
          hint = "Check for duplicate part numbers in your data"
        } else if (inventoryError.message.includes("violates check constraint")) {
          errorMessage = "Data validation failed"
          hint = "Check that all numeric values are valid"
        } else if (inventoryError.message.includes("permission denied")) {
          errorMessage = "Permission denied for insert operation"
          hint = "Check your Supabase RLS policies and service role permissions"
        }

        return NextResponse.json(
          {
            error: errorMessage,
            details: inventoryError.message,
            code: inventoryError.code,
            hint: hint || inventoryError.hint,
          },
          { status: 500 },
        )
      }

      console.log("✅ Inventory inserted successfully")
      console.log("Inserted items count:", insertedData?.length || 0)
    } catch (insertError) {
      console.error("❌ Exception during inventory insertion:", insertError)
      return NextResponse.json(
        {
          error: "Exception during inventory insertion",
          details: insertError instanceof Error ? insertError.message : "Unknown insertion error",
        },
        { status: 500 },
      )
    }

    // Step 9: Save package note (optional)
    if (packageNote) {
      console.log("Step 9: Saving package note...")
      try {
        // Clear existing notes
        const { error: deleteNoteError } = await supabase
          .from("package_notes")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")

        if (deleteNoteError) {
          console.warn("⚠️ Warning: Could not clear existing package notes:", deleteNoteError)
        }

        // Insert new note
        const { error: noteError } = await supabase.from("package_notes").insert({
          note: packageNote,
          filename: filename || "inventory.xlsx",
        })

        if (noteError) {
          console.warn("⚠️ Warning: Could not save package note:", noteError)
          // Don't fail the whole operation for package note issues
        } else {
          console.log("✅ Package note saved successfully")
        }
      } catch (noteError) {
        console.warn("⚠️ Exception saving package note:", noteError)
        // Don't fail the whole operation for package note issues
      }
    }

    console.log("=== INVENTORY SYNC SUCCESS ===")
    return NextResponse.json({
      success: true,
      message: "Inventory saved successfully",
      count: inventoryData.length,
    })
  } catch (error) {
    console.error("=== INVENTORY SYNC CRITICAL ERROR ===")
    console.error("Critical error saving inventory:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Critical error during inventory sync",
        details: error instanceof Error ? error.message : "Unknown critical error",
        type: error instanceof Error ? error.constructor.name : "Unknown",
      },
      { status: 500 },
    )
  }
}
