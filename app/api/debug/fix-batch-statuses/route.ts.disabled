import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
}

const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

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

    console.log("🔧 Starting batch status fix...")

    // Get all approved batch changes
    const { data: approvedBatches, error: fetchError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("status", "approved")
      .or("change_type.eq.batch_add,item_data->>is_batch.eq.true")

    if (fetchError) {
      console.error("Error fetching approved batches:", fetchError)
      return NextResponse.json(
        {
          success: false,
          error: fetchError.message,
        },
        { status: 500 },
      )
    }

    console.log(`Found ${approvedBatches.length} approved batches to check`)

    const fixedBatches = []
    const alreadyCorrect = []

    for (const batch of approvedBatches) {
      const batchItems = batch.item_data?.batch_items || []
      const currentItemStatuses = batch.item_data?.item_statuses || {}

      if (batchItems.length === 0) {
        console.log(`Skipping batch ${batch.id} - no items found`)
        continue
      }

      console.log(`\n📦 Processing batch ${batch.id} with ${batchItems.length} items`)

      let needsUpdate = false
      const updatedItemStatuses = { ...currentItemStatuses }

      // Check each item in the batch
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i]
        const currentStatus = currentItemStatuses[i] || "pending"
        const partNumber = String(item.part_number || "").trim()

        if (!partNumber) {
          console.log(`  Item ${i + 1}: No part number, skipping`)
          continue
        }

        // Check if this item exists in inventory
        const { data: inventoryItem, error: checkError } = await supabase
          .from("inventory")
          .select("part_number, qty")
          .eq("part_number", partNumber)
          .single()

        if (checkError && checkError.code !== "PGRST116") {
          console.error(`  Item ${i + 1} (${partNumber}): Error checking inventory:`, checkError)
          continue
        }

        if (inventoryItem) {
          // Item exists in inventory, should be marked as approved
          if (currentStatus !== "approved") {
            console.log(`  ✅ Item ${i + 1} (${partNumber}): Found in inventory, updating status to approved`)
            updatedItemStatuses[i] = "approved"
            needsUpdate = true
          } else {
            console.log(`  ✓ Item ${i + 1} (${partNumber}): Already marked as approved`)
          }
        } else {
          // Item doesn't exist in inventory
          if (currentStatus === "pending") {
            console.log(`  ⏳ Item ${i + 1} (${partNumber}): Not in inventory, keeping as pending`)
          } else if (currentStatus === "approved") {
            console.log(`  ⚠️ Item ${i + 1} (${partNumber}): Marked approved but not in inventory, keeping as approved`)
          } else {
            console.log(`  ❌ Item ${i + 1} (${partNumber}): Status is ${currentStatus}`)
          }
        }
      }

      if (needsUpdate) {
        // Update the batch with corrected item statuses
        const updatedItemData = {
          ...batch.item_data,
          item_statuses: updatedItemStatuses,
        }

        const { error: updateError } = await supabase
          .from("pending_changes")
          .update({
            item_data: updatedItemData,
          })
          .eq("id", batch.id)

        if (updateError) {
          console.error(`Error updating batch ${batch.id}:`, updateError)
        } else {
          console.log(`✅ Updated batch ${batch.id} with corrected statuses`)
          fixedBatches.push({
            id: batch.id,
            itemCount: batchItems.length,
            updatedStatuses: updatedItemStatuses,
          })
        }
      } else {
        console.log(`✓ Batch ${batch.id} already has correct statuses`)
        alreadyCorrect.push(batch.id)
      }
    }

    console.log("\n🎯 Batch status fix complete!")
    console.log(`Fixed: ${fixedBatches.length} batches`)
    console.log(`Already correct: ${alreadyCorrect.length} batches`)

    return NextResponse.json({
      success: true,
      message: `Batch status fix complete! Fixed ${fixedBatches.length} batches, ${alreadyCorrect.length} were already correct.`,
      fixedBatches,
      alreadyCorrect,
      totalProcessed: approvedBatches.length,
    })
  } catch (error) {
    console.error("Error in batch status fix:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
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

    // Get analysis of current batch statuses
    const { data: approvedBatches, error: fetchError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("status", "approved")
      .or("change_type.eq.batch_add,item_data->>is_batch.eq.true")

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          error: fetchError.message,
        },
        { status: 500 },
      )
    }

    const analysis = []

    for (const batch of approvedBatches) {
      const batchItems = batch.item_data?.batch_items || []
      const itemStatuses = batch.item_data?.item_statuses || {}

      const statusCounts = { pending: 0, approved: 0, rejected: 0, inInventory: 0 }

      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i]
        const status = itemStatuses[i] || "pending"
        const partNumber = String(item.part_number || "").trim()

        statusCounts[status as keyof typeof statusCounts]++

        // Check if item is actually in inventory
        if (partNumber) {
          const { data: inventoryItem } = await supabase
            .from("inventory")
            .select("part_number")
            .eq("part_number", partNumber)
            .single()

          if (inventoryItem) {
            statusCounts.inInventory++
          }
        }
      }

      analysis.push({
        id: batch.id,
        requestedBy: batch.requested_by,
        createdAt: batch.created_at,
        totalItems: batchItems.length,
        statusCounts,
        needsFix: statusCounts.inInventory > statusCounts.approved,
      })
    }

    return NextResponse.json({
      success: true,
      analysis,
      totalBatches: approvedBatches.length,
      batchesNeedingFix: analysis.filter((a) => a.needsFix).length,
    })
  } catch (error) {
    console.error("Error in batch status analysis:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
