import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
}

const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

// Helper function to determine correct package type based on quantity
function getCorrectPackageType(qty: number): string {
  if (qty >= 1 && qty <= 100) {
    return "EXACT"
  } else if (qty >= 101 && qty <= 500) {
    return "ESTIMATED"
  } else if (qty > 500) {
    return "REEL"
  }
  return "EXACT" // Default fallback
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured",
        },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { changeId, action, approvedBy } = body

    console.log("Approval request received:", { changeId, action, approvedBy })

    // Validate required fields
    if (!changeId || !action || !approvedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: changeId, action, approvedBy",
        },
        { status: 400 },
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Must be 'approve' or 'reject'",
        },
        { status: 400 },
      )
    }

    // Get the pending change
    const { data: pendingChange, error: fetchError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("id", changeId)
      .eq("status", "pending")
      .single()

    if (fetchError || !pendingChange) {
      console.error("Error fetching pending change:", fetchError)
      return NextResponse.json(
        {
          success: false,
          error: "Pending change not found or already processed",
        },
        { status: 404 },
      )
    }

    console.log("Found pending change:", pendingChange)

    // Handle batch operations differently
    const isBatch = pendingChange.change_type === "batch_add" || pendingChange.item_data?.is_batch === true

    if (isBatch) {
      return await handleBatchApproval(pendingChange, action, approvedBy)
    } else {
      return await handleSingleItemApproval(pendingChange, action, approvedBy)
    }
  } catch (error) {
    console.error("Error in POST /api/inventory/approve:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function handleBatchApproval(pendingChange: any, action: string, approvedBy: string) {
  if (!supabase) {
    throw new Error("Database not configured")
  }

  const batchItems = pendingChange.item_data?.batch_items || []

  if (batchItems.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No batch items found to process",
      },
      { status: 400 },
    )
  }

  console.log(`Processing batch ${action} for ${batchItems.length} items`)

  if (action === "reject") {
    // Reject the entire batch
    const { error: updateError } = await supabase
      .from("pending_changes")
      .update({
        status: "rejected",
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq("id", pendingChange.id)

    if (updateError) {
      console.error("Error updating pending change:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Entire batch rejected successfully (${batchItems.length} items)`,
    })
  }

  // For approval, check if there are individual item statuses
  const itemStatuses = pendingChange.item_data?.item_statuses || {}
  const processedItems = []
  const failedItems = []

  // Process each item in the batch
  for (let i = 0; i < batchItems.length; i++) {
    const item = batchItems[i]
    const itemStatus = itemStatuses[i] || "pending"

    // Skip items that are already rejected or if this is a batch approval and item is individually rejected
    if (itemStatus === "rejected") {
      console.log(`Skipping item ${i + 1} (${item.part_number}) - individually rejected`)
      continue
    }

    // For batch approval, approve all pending items
    if (itemStatus === "pending" || itemStatus === "approved") {
      try {
        const newQty = Number(item.qty) || 0
        const correctPackageType = getCorrectPackageType(newQty)

        const inventoryItem = {
          part_number: String(item.part_number || "").trim(),
          mfg_part_number: String(item.mfg_part_number || "").trim(),
          qty: newQty,
          part_description: String(item.part_description || "").trim(),
          supplier: String(item.supplier || "").trim(),
          location: String(item.location || "").trim(),
          package: correctPackageType, // Auto-correct package type based on quantity
          reorder_point: Number(item.reorder_point) || 10,
        }

        console.log(`📦 Batch item ${i + 1}: ${newQty} qty → ${correctPackageType} package`)

        console.log(`Adding batch item ${i + 1}/${batchItems.length}:`, inventoryItem)

        // Validate required fields
        if (!inventoryItem.part_number) {
          failedItems.push({
            index: i,
            partNumber: "Unknown",
            error: "Missing part number",
          })
          continue
        }

        // Check for duplicates
        const { data: existingItem, error: checkError } = await supabase
          .from("inventory")
          .select("part_number")
          .eq("part_number", inventoryItem.part_number)
          .single()

        if (checkError && checkError.code !== "PGRST116") {
          console.error(`Error checking for duplicate part number ${inventoryItem.part_number}:`, checkError)
          failedItems.push({
            index: i,
            partNumber: inventoryItem.part_number,
            error: `Duplicate check failed: ${checkError.message}`,
          })
          continue
        }

        if (existingItem) {
          console.warn(`Duplicate part number found: ${inventoryItem.part_number}`)
          failedItems.push({
            index: i,
            partNumber: inventoryItem.part_number,
            error: "Part number already exists in inventory",
          })
          continue
        }

        const { data, error } = await supabase.from("inventory").insert(inventoryItem).select().single()

        if (error) {
          console.error(`Error adding batch item ${i + 1}:`, error)
          failedItems.push({
            index: i,
            partNumber: inventoryItem.part_number,
            error: error.message,
          })
        } else {
          processedItems.push(data)
          console.log(`Successfully added item ${i + 1}: ${inventoryItem.part_number}`)
        }
      } catch (itemError) {
        console.error(`Exception adding batch item ${i + 1}:`, itemError)
        failedItems.push({
          index: i,
          partNumber: item.part_number || "Unknown",
          error: itemError instanceof Error ? itemError.message : "Unknown error",
        })
      }
    }
  }

  console.log(`Batch processing complete: ${processedItems.length} successful, ${failedItems.length} failed`)

  // Update the item statuses to reflect what was actually processed
  const updatedItemStatuses = pendingChange.item_data?.item_statuses || {}
  for (let i = 0; i < batchItems.length; i++) {
    const itemStatus = updatedItemStatuses[i] || "pending"

    // If item was pending and we successfully processed it, mark as approved
    if (itemStatus === "pending") {
      const wasProcessed = processedItems.some(
        (item) => item.part_number === String(batchItems[i].part_number || "").trim(),
      )
      const wasFailed = failedItems.some((item) => item.index === i)

      if (wasProcessed) {
        updatedItemStatuses[i] = "approved"
      } else if (wasFailed) {
        updatedItemStatuses[i] = "rejected"
      }
    }
  }

  const updatedItemData = {
    ...pendingChange.item_data,
    item_statuses: updatedItemStatuses,
  }

  // Update the pending change status and item statuses
  const { error: updateError } = await supabase
    .from("pending_changes")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      item_data: updatedItemData,
    })
    .eq("id", pendingChange.id)

  if (updateError) {
    console.error("Error updating pending change:", updateError)
    return NextResponse.json(
      {
        success: false,
        error: updateError.message,
      },
      { status: 500 },
    )
  }

  if (failedItems.length > 0) {
    const errorMessage = `Batch partially processed: ${processedItems.length}/${batchItems.length} items added successfully. Failed items: ${failedItems.map((f) => `${f.partNumber} (${f.error})`).join(", ")}`

    return NextResponse.json({
      success: true, // Still success because some items were processed
      message: errorMessage,
      partialSuccess: true,
      processedItems: processedItems.length,
      failedItems: failedItems.length,
      inventoryResults: processedItems,
    })
  }

  return NextResponse.json({
    success: true,
    message: `Batch approved successfully! ${processedItems.length} items added to inventory.`,
    inventoryResults: processedItems,
    itemsProcessed: processedItems.length,
  })
}

async function handleSingleItemApproval(pendingChange: any, action: string, approvedBy: string) {
  if (!supabase) {
    throw new Error("Database not configured")
  }

  const originalId = pendingChange.original_data?.id as string | undefined

  if (action === "reject") {
    // Just update the status to rejected
    const { error: updateError } = await supabase
      .from("pending_changes")
      .update({
        status: "rejected",
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq("id", pendingChange.id)

    if (updateError) {
      console.error("Error updating pending change:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Change rejected successfully",
    })
  }

  // Handle approval - apply the change to the inventory
  const inventoryResults = []

  if (pendingChange.change_type === "add") {
    // Handle regular single item add
    const inventoryItem = {
      part_number: String(pendingChange.item_data.part_number || "").trim(),
      mfg_part_number: String(pendingChange.item_data.mfg_part_number || "").trim(),
      qty: Number(pendingChange.item_data.qty) || 0,
      part_description: String(pendingChange.item_data.part_description || "").trim(),
      supplier: String(pendingChange.item_data.supplier || "").trim(),
      location: String(pendingChange.item_data.location || "").trim(),
      package: String(pendingChange.item_data.package || "").trim(),
      reorder_point: Number(pendingChange.item_data.reorder_point) || 10,
    }

    const { data, error } = await supabase.from("inventory").insert(inventoryItem).select().single()

    if (error) {
      console.error("Error adding inventory item:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to add item: ${error.message}`,
        },
        { status: 500 },
      )
    }
    inventoryResults.push(data)
  } else if (pendingChange.change_type === "update") {
    // Update existing item with smart package type adjustment
    const newQty = Number(pendingChange.item_data.qty) || 0
    const correctPackageType = getCorrectPackageType(newQty)

    const updateData = {
      qty: newQty,
      reorder_point: Number(pendingChange.item_data.reorder_point) || 10,
      location: String(pendingChange.item_data.location || "").trim(),
      supplier: String(pendingChange.item_data.supplier || "").trim(),
      package: correctPackageType, // Auto-update package based on new quantity
      mfg_part_number: String(pendingChange.item_data.mfg_part_number || "").trim(),
      part_description: String(pendingChange.item_data.part_description || "").trim(),
    }

    console.log(`📦 Auto-updating package type: ${newQty} qty → ${correctPackageType} package`)

    // For updates, we need to be more specific about which item to update
    // Use the original data to identify the exact item, including location if there are duplicates
    const originalPartNumber = pendingChange.original_data.part_number
    const originalLocation = pendingChange.original_data.location

    console.log(`Updating item: ${originalPartNumber} at location: ${originalLocation}`)

    let updateQuery = supabase.from("inventory").update(updateData)

    if (originalId) {
      // Use the exact primary key when we have it
      updateQuery = updateQuery.eq("id", originalId)
    } else {
      // Fall back to part_number + location
      updateQuery = updateQuery
        .eq("part_number", originalPartNumber)
        .eq("location", originalLocation)
    }

    const { data, error } = await updateQuery.select().maybeSingle()

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to update item: ${error.message}` },
        { status: 500 },
      )
    }
    if (!data) {
      return NextResponse.json(
        { success: false, error: "No matching item found to update." },
        { status: 404 },
      )
    }
    inventoryResults.push(data)
  } else if (pendingChange.change_type === "delete") {
    // Delete item - also handle potential duplicates
    const originalPartNumber = pendingChange.original_data.part_number
    const originalLocation = pendingChange.original_data.location

    console.log(`Deleting item: ${originalPartNumber} at location: ${originalLocation}`)

    let deleteQuery = supabase.from("inventory").delete()

    if (originalId) {
      deleteQuery = deleteQuery.eq("id", originalId)
    } else {
      deleteQuery = deleteQuery
        .eq("part_number", originalPartNumber)
        .eq("location", originalLocation)
    }

    const { error } = await deleteQuery

    if (error) {
      console.error("Error deleting inventory item:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to delete item: ${error.message}`,
        },
        { status: 500 },
      )
    }
  }

  // Update the pending change status
  const { error: updateError } = await supabase
    .from("pending_changes")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq("id", pendingChange.id)

  if (updateError) {
    console.error("Error updating pending change:", updateError)
    return NextResponse.json(
      {
        success: false,
        error: updateError.message,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    message: `Change approved and applied successfully. ${inventoryResults.length} item(s) processed.`,
    inventoryResults,
    itemsProcessed: inventoryResults.length,
  })
}
