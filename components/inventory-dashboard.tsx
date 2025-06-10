"use client"

// components/inventory-dashboard.tsx
// This is a placeholder.  A complete component would be much more complex.
// This example focuses solely on the requested update to handleAddItem.

import { useState, useEffect, useCallback } from "react"
import type { InventoryItem, InventoryStats, InventoryFilter } from "@/types"
import { loadInventory, saveInventory, calculateInventoryStats, filterInventory } from "@/lib/inventory-utils"
import InventoryTable from "@/components/inventory-table"
import InventoryFilters from "@/components/inventory-filters"
import InventoryStatsCards from "@/components/inventory-stats-cards"
import Header from "@/components/header"
import { useSession } from "next-auth/react"

const InventoryDashboard = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: 0,
    averageValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<InventoryFilter>({
    searchTerm: "",
    supplier: "",
    location: "",
  })
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const { data: session } = useSession()

  const loadInventoryFromDatabase = useCallback(async () => {
    setLoading(true)
    try {
      const loadedInventory = await loadInventory()
      setInventory(loadedInventory)
      console.log("✅ Inventory loaded successfully!")
    } catch (e: any) {
      setError(`Failed to load inventory: ${e.message}`)
      console.error("❌ Failed to load inventory:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveInventoryToDatabase = async (updatedInventory: InventoryItem[]) => {
    setLoading(true)
    try {
      await saveInventory(updatedInventory)
      setInventory(updatedInventory) // Optimistically update local state
      console.log("✅ Inventory saved successfully!")
    } catch (e: any) {
      setError(`Failed to save inventory: ${e.message}`)
      console.error("❌ Failed to save inventory:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventoryFromDatabase()
  }, [loadInventoryFromDatabase])

  useEffect(() => {
    const newStats = calculateInventoryStats(inventory)
    setStats(newStats)
  }, [inventory])

  useEffect(() => {
    const newFilteredInventory = filterInventory(inventory, filters)
    setFilteredInventory(newFilteredInventory)
  }, [inventory, filters])

  const handleFilterChange = (newFilters: InventoryFilter) => {
    setFilters(newFilters)
  }

  const updateInventoryItem = async (id: string, updates: Partial<Omit<InventoryItem, "id" | "lastUpdated">>) => {
    setInventory((prevInventory) => {
      const updatedInventory = prevInventory.map((item) =>
        item.id === id ? { ...item, ...updates, lastUpdated: new Date() } : item,
      )
      saveInventoryToDatabase(updatedInventory) // Save to database
      return updatedInventory
    })
  }

  const deleteInventoryItem = async (id: string) => {
    setInventory((prevInventory) => {
      const updatedInventory = prevInventory.filter((item) => item.id !== id)
      saveInventoryToDatabase(updatedInventory) // Save to database
      return updatedInventory
    })
  }

  const addInventoryItem = async (newItem: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => {
    console.log("🚀 addInventoryItem called with:", newItem, "by", requester)

    try {
      // Transform to database format for approval
      const itemData = {
        part_number: String(newItem["Part number"]).trim(),
        mfg_part_number: String(newItem["MFG Part number"] || "").trim(),
        qty: isNaN(Number(newItem.QTY)) ? 0 : Math.max(0, Number(newItem.QTY)),
        part_description: String(newItem["Part description"] || "").trim(),
        supplier: String(newItem.Supplier || "").trim(),
        location: String(newItem.Location || "").trim(),
        package: String(newItem.Package || "").trim(),
        reorder_point: isNaN(Number(newItem.reorderPoint)) ? 10 : Math.max(0, Number(newItem.reorderPoint)),
      }

      // Submit for approval instead of adding directly
      const response = await fetch("/api/inventory/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType: "add",
          itemData,
          requestedBy: requester,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          alert("✅ Item submitted for approval! An approval request has been sent to the inventory alerts channel.")

          // Send Slack approval request
          await fetch("/api/slack/send-approval-request", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              changeType: "add",
              itemData,
              requestedBy: requester,
              changeId: result.data.id,
            }),
          })
        } else {
          throw new Error(result.error || "Failed to submit for approval")
        }
      } else {
        throw new Error("Failed to submit change for approval")
      }
    } catch (error) {
      console.error("❌ Error submitting item for approval:", error)
      setError(`Failed to submit item for approval: ${error instanceof Error ? error.message : "Unknown error"}`)
      throw error
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Header />
      <InventoryStatsCards stats={stats} loading={loading} />
      <InventoryFilters filters={filters} onFilterChange={handleFilterChange} />
      {error && <div className="text-red-500">{error}</div>}
      <InventoryTable
        inventory={filteredInventory}
        loading={loading}
        updateInventoryItem={updateInventoryItem}
        deleteInventoryItem={deleteInventoryItem}
        addInventoryItem={addInventoryItem}
        requester={session?.user?.email || "Unknown"}
      />
    </div>
  )
}

export default InventoryDashboard
