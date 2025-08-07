import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
}

const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
      })
    }

    // Get all pending batch changes
    const { data: pendingBatches, error: fetchError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("change_type", "add")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch pending batches: ${fetchError.message}`,
      })
    }

    // Filter for batch operations
    const batchOperations = pendingBatches.filter(
      (change) =>
        change.item_data?.is_batch === true ||
        change.change_type === "batch_add" ||
        (change.item_data?.batch_items && Array.isArray(change.item_data.batch_items)),
    )

    const analysisResults = []

    for (const batch of batchOperations) {
      const batchItems = batch.item_data?.batch_items || []

      const analysis = {
        id: batch.id,
        created_at: batch.created_at,
        requested_by: batch.requested_by,
        status: batch.status,
        change_type: batch.change_type,
        is_batch_flag: batch.item_data?.is_batch,
        batch_items_count: batchItems.length,
        batch_items_sample: batchItems.slice(0, 2), // Show first 2 items
        has_valid_items: batchItems.every((item) => item.part_number && String(item.part_number).trim() !== ""),
        validation_issues: [],
      }

      // Check for validation issues
      batchItems.forEach((item, index) => {
        if (!item.part_number || String(item.part_number).trim() === "") {
          analysis.validation_issues.push(`Item ${index + 1}: Missing part number`)
        }
        if (!item.part_description || String(item.part_description).trim() === "") {
          analysis.validation_issues.push(`Item ${index + 1}: Missing description`)
        }
      })

      analysisResults.push(analysis)
    }

    return NextResponse.json({
      success: true,
      total_pending_changes: pendingBatches.length,
      batch_operations_found: batchOperations.length,
      analysis: analysisResults,
    })
  } catch (error) {
    console.error("Error in batch approval test:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
      })
    }

    const body = await request.json()
    const { batchId, dryRun = true } = body

    if (!batchId) {
      return NextResponse.json({
        success: false,
        error: "Missing batchId parameter",
      })
    }

    // Get the specific batch
    const { data: pendingChange, error: fetchError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("id", batchId)
      .single()

    if (fetchError || !pendingChange) {
      return NextResponse.json({
        success: false,
        error: "Batch not found",
      })
    }

    const batchItems = pendingChange.item_data?.batch_items || []

    if (batchItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No batch items found",
      })
    }

    const simulationResults = []

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i]

      const inventoryItem = {
        part_number: String(item.part_number || "").trim(),
        mfg_part_number: String(item.mfg_part_number || "").trim(),
        qty: Number(item.qty) || 0,
        part_description: String(item.part_description || "").trim(),
        supplier: String(item.supplier || "").trim(),
        location: String(item.location || "").trim(),
        package: String(item.package || "").trim(),
        reorder_point: Number(item.reorder_point) || 10,
      }

      const result = {
        index: i,
        original_item: item,
        transformed_item: inventoryItem,
        validation_passed: true,
        validation_errors: [],
        duplicate_check: null,
      }

      // Validation checks
      if (!inventoryItem.part_number) {
        result.validation_passed = false
        result.validation_errors.push("Missing part number")
      }

      if (!inventoryItem.part_description) {
        result.validation_passed = false
        result.validation_errors.push("Missing part description")
      }

      if (inventoryItem.qty < 0) {
        result.validation_passed = false
        result.validation_errors.push("Negative quantity")
      }

      // Check for duplicates
      if (inventoryItem.part_number) {
        const { data: existingItem, error: checkError } = await supabase
          .from("inventory")
          .select("part_number, location")
          .eq("part_number", inventoryItem.part_number)
          .single()

        if (checkError && checkError.code !== "PGRST116") {
          result.duplicate_check = `Error checking: ${checkError.message}`
        } else if (existingItem) {
          result.duplicate_check = `Duplicate found at location: ${existingItem.location}`
          result.validation_passed = false
          result.validation_errors.push("Duplicate part number")
        } else {
          result.duplicate_check = "No duplicate found"
        }
      }

      simulationResults.push(result)
    }

    const validItems = simulationResults.filter((r) => r.validation_passed)
    const invalidItems = simulationResults.filter((r) => !r.validation_passed)

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      batch_id: batchId,
      total_items: batchItems.length,
      valid_items: validItems.length,
      invalid_items: invalidItems.length,
      simulation_results: simulationResults,
      summary: {
        would_succeed: invalidItems.length === 0,
        issues_found: invalidItems.map((item) => ({
          index: item.index,
          part_number: item.original_item.part_number,
          errors: item.validation_errors,
        })),
      },
    })
  } catch (error) {
    console.error("Error in batch approval simulation:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
