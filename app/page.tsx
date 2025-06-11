"use client"

import { useState, useEffect } from "react"
import InventoryDashboard from "@/components/inventory-dashboard"
import FileUpload from "@/components/file-upload"
import type { InventoryItem } from "@/types/inventory"

export default function Home() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load inventory from localStorage on mount
    const savedInventory = localStorage.getItem("inventory")
    if (savedInventory) {
      try {
        const parsedInventory = JSON.parse(savedInventory)
        setInventory(parsedInventory)
      } catch (error) {
        console.error("Error parsing saved inventory:", error)
      }
    }
    setLoading(false)
  }, [])

  const handleDataLoaded = (data: any[], note: string) => {
    const transformedData: InventoryItem[] = data.map((row, index) => ({
      id: `item-${index + 1}`,
      "Part number": row["Part number"] || "",
      "MFG Part number": row["MFG Part number"] || "",
      QTY: Number(row["QTY"]) || 0,
      "Part description": row["Part description"] || "",
      Supplier: row["Supplier"] || "",
      Location: row["Location"] || "",
      Package: row["Package"] || "",
      lastUpdated: new Date(),
      reorderPoint: 10,
    }))

    setInventory(transformedData)
    localStorage.setItem("inventory", JSON.stringify(transformedData))
    if (note) localStorage.setItem("packageNote", note)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading inventory data...</p>
        </div>
      </div>
    )
  }

  if (inventory.length === 0) {
    return <FileUpload onDataLoaded={handleDataLoaded} />
  }

  return <InventoryDashboard inventory={inventory} setInventory={setInventory} />
}
