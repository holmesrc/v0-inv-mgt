import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    console.log("Received Slack interaction request")

    // Parse the payload from Slack
    const formData = await request.formData()
    const payload = formData.get("payload")

    if (!payload || typeof payload !== "string") {
      console.error("Invalid payload received:", payload)
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const data = JSON.parse(payload)
    console.log("Parsed Slack interaction payload:", JSON.stringify(data, null, 2))

    // Handle different types of interactions
    if (data.type === "block_actions") {
      const action = data.actions[0]
      const actionId = action.action_id
      const value = action.value || ""

      console.log(`Processing action: ${actionId}, value: ${value}`)

      if (actionId.startsWith("approve_") || actionId.startsWith("reject_")) {
        const changeId = actionId.split("_")[1]
        const isApprove = actionId.startsWith("approve_")
        const action = isApprove ? "approve" : "reject"

        console.log(`Processing ${action} action for change ID: ${changeId}`)

        // Process the approval/rejection directly here
        const supabase = createClient()

        // Get the pending change
        const { data: changeData, error: changeError } = await supabase
          .from("pending_changes")
          .select("*")
          .eq("id", changeId)
          .single()

        if (changeError || !changeData) {
          console.error("Error fetching change:", changeError)
          return NextResponse.json({
            text: `Error: Could not find change with ID ${changeId}`,
            replace_original: false,
          })
        }

        console.log("Found pending change:", JSON.stringify(changeData, null, 2))

        // Process the approval or rejection
        if (isApprove) {
          // Update the inventory based on the change type
          if (changeData.change_type === "add") {
            // Add new item or update quantity
            const { error: updateError } = await supabase.from("inventory").upsert({
              part_number: changeData.part_number,
              description: changeData.description,
              quantity: changeData.quantity || changeData.current_stock,
              supplier: changeData.supplier,
              location: changeData.location,
              package: changeData.package,
              last_updated: new Date().toISOString(),
            })

            if (updateError) {
              console.error("Error updating inventory:", updateError)
              return NextResponse.json({
                text: `Error approving change: ${updateError.message}`,
                replace_original: false,
              })
            }
          } else if (changeData.change_type === "delete") {
            // Delete the item
            const { error: deleteError } = await supabase
              .from("inventory")
              .delete()
              .eq("part_number", changeData.part_number)

            if (deleteError) {
              console.error("Error deleting inventory item:", deleteError)
              return NextResponse.json({
                text: `Error approving deletion: ${deleteError.message}`,
                replace_original: false,
              })
            }
          }

          // Update the change status to approved
          const { error: statusError } = await supabase
            .from("pending_changes")
            .update({ status: "approved" })
            .eq("id", changeId)

          if (statusError) {
            console.error("Error updating change status:", statusError)
            return NextResponse.json({
              text: `Error updating change status: ${statusError.message}`,
              replace_original: false,
            })
          }

          return NextResponse.json({
            text: `✅ Change has been approved successfully!`,
            replace_original: true,
          })
        } else {
          // Reject the change
          const { error: rejectError } = await supabase
            .from("pending_changes")
            .update({ status: "rejected" })
            .eq("id", changeId)

          if (rejectError) {
            console.error("Error rejecting change:", rejectError)
            return NextResponse.json({
              text: `Error rejecting change: ${rejectError.message}`,
              replace_original: false,
            })
          }

          return NextResponse.json({
            text: `❌ Change has been rejected.`,
            replace_original: true,
          })
        }
      }

      // Handle other block actions here
      return NextResponse.json({
        text: "Action received but not processed: Unknown action type",
        replace_original: false,
      })
    }

    // Default response for other interaction types
    return NextResponse.json({
      text: "Interaction received",
      success: true,
    })
  } catch (error) {
    console.error("Error processing Slack interaction:", error)
    return NextResponse.json(
      {
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
