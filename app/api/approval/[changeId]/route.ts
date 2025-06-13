import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { changeId: string } }) {
  return handleApproval(request, params)
}

export async function POST(request: NextRequest, { params }: { params: { changeId: string } }) {
  return handleApproval(request, params)
}

async function handleApproval(request: NextRequest, { changeId }: { changeId: string }) {
  try {
    console.log(`Processing approval request for change ID: ${changeId}`)

    // Get the action from the query parameters
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")

    if (!action || (action !== "approve" && action !== "reject")) {
      console.error("Invalid action:", action)
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    console.log(`Action: ${action}, Change ID: ${changeId}`)

    const supabase = createClient()

    // Get the pending change
    const { data: changeData, error: changeError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("id", changeId)
      .single()

    if (changeError || !changeData) {
      console.error("Error fetching change:", changeError)
      return NextResponse.json(
        {
          success: false,
          error: changeError ? changeError.message : "Change not found",
        },
        { status: 404 },
      )
    }

    console.log("Found pending change:", JSON.stringify(changeData, null, 2))

    // Process the approval or rejection
    if (action === "approve") {
      // Update the inventory based on the change type
      if (changeData.change_type === "add") {
        // Add new item or update quantity
        const itemData = {
          part_number: changeData.part_number,
          description: changeData.description,
          current_stock: changeData.current_stock || changeData.qty,
          supplier: changeData.supplier,
          location: changeData.location,
          package: changeData.package,
          min_stock: changeData.min_stock,
          last_updated: new Date().toISOString(),
        }

        console.log("Adding item to inventory:", JSON.stringify(itemData, null, 2))

        const { error: updateError } = await supabase.from("inventory").upsert(itemData)

        if (updateError) {
          console.error("Error updating inventory:", updateError)
          return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
        }
      } else if (changeData.change_type === "delete") {
        // Delete the item
        console.log(`Deleting item with part number: ${changeData.part_number}`)

        const { error: deleteError } = await supabase
          .from("inventory")
          .delete()
          .eq("part_number", changeData.part_number)

        if (deleteError) {
          console.error("Error deleting inventory item:", deleteError)
          return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
        }
      }

      // Update the change status to approved
      const { error: statusError } = await supabase
        .from("pending_changes")
        .update({ status: "approved" })
        .eq("id", changeId)

      if (statusError) {
        console.error("Error updating change status:", statusError)
        return NextResponse.json({ success: false, error: statusError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Change approved successfully",
      })
    } else {
      // Reject the change
      const { error: rejectError } = await supabase
        .from("pending_changes")
        .update({ status: "rejected" })
        .eq("id", changeId)

      if (rejectError) {
        console.error("Error rejecting change:", rejectError)
        return NextResponse.json({ success: false, error: rejectError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Change rejected successfully",
      })
    }
  } catch (error) {
    console.error("Error processing approval:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
