// components/inventory-dashboard.tsx
// This is a placeholder.  A complete component would be much more complex.
// This example focuses solely on the requested update to handleAddItem.

import type { InventoryItem } from "@/types"

const InventoryDashboard = () => {
  const loadPendingChanges = async () => {
    console.log("Loading pending changes (placeholder)")
    // In a real implementation, this would fetch pending changes from an API
  }

  const handleAddItem = async (newItem: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => {
    try {
      console.log("📝 Submitting item for approval:", newItem, "by", requester)

      // Submit for approval instead of adding directly
      const response = await fetch("/api/inventory/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType: "add",
          itemData: {
            part_number: newItem["Part number"],
            mfg_part_number: newItem["MFG Part number"],
            qty: newItem.QTY,
            part_description: newItem["Part description"],
            supplier: newItem.Supplier,
            location: newItem.Location,
            package: newItem.Package,
            reorder_point: newItem.reorderPoint,
          },
          originalData: null,
          requestedBy: requester,
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("✅ Item submitted for approval")

        // Send Slack notification
        await fetch("/api/slack/send-approval-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changeType: "add",
            itemData: newItem,
            requestedBy: requester,
            changeId: result.data.id,
          }),
        })

        // Refresh pending changes
        loadPendingChanges()
      } else {
        throw new Error(result.error || "Failed to submit for approval")
      }
    } catch (error) {
      console.error("❌ Error submitting item for approval:", error)
      throw error
    }
  }

  return (
    <div>
      <h1>Inventory Dashboard</h1>
      <p>This is a placeholder for the inventory dashboard.</p>
      {/* Add item form or button would go here, triggering handleAddItem */}
    </div>
  )
}

export default InventoryDashboard
