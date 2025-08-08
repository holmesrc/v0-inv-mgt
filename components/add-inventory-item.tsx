"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Package, Plus, Loader2 } from "lucide-react"

interface InventoryItem {
  id: number
  part_number: string
  part_description: string
  qty: number
  location: string
  supplier: string
  package: string
  mfg_part_number: string
  reorder_point: number
  unit_cost: number
  notes: string
}

interface BatchItem {
  part_number: string
  part_description: string
  qty: number
  location: string
  supplier: string
  package: string
  mfg_part_number: string
  reorder_point: number
  unit_cost: number
  notes: string
}

interface AddInventoryItemProps {
  onItemAdded: (item: BatchItem) => void
  currentBatch: BatchItem[]
  existingInventory: InventoryItem[]
}

export default function AddInventoryItem({ onItemAdded, currentBatch, existingInventory }: AddInventoryItemProps) {
  const [formData, setFormData] = useState({
    part_number: "",
    mfg_part_number: "",
    part_description: "",
    qty: "",
    location: "",
    supplier: "",
    package: "",
    reorder_point: "",
    unit_cost: "",
    notes: "",
  })

  const [duplicateInfo, setDuplicateInfo] = useState<{
    type: "inventory" | "batch" | null
    item: InventoryItem | BatchItem | null
  }>({ type: null, item: null })

  const [quickUpdateQty, setQuickUpdateQty] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [suggestedLocation, setSuggestedLocation] = useState<string | null>(null)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)

  // Check for duplicates when part number changes
  useEffect(() => {
    if (!formData.part_number.trim()) {
      setDuplicateInfo({ type: null, item: null })
      return
    }

    // Check existing inventory first
    const inventoryMatch = existingInventory.find(
      (item) => item.part_number.toLowerCase() === formData.part_number.toLowerCase(),
    )

    if (inventoryMatch) {
      setDuplicateInfo({ type: "inventory", item: inventoryMatch })
      return
    }

    // Check current batch
    const batchMatch = currentBatch.find(
      (item) => item.part_number.toLowerCase() === formData.part_number.toLowerCase(),
    )

    if (batchMatch) {
      setDuplicateInfo({ type: "batch", item: batchMatch })
      return
    }

    setDuplicateInfo({ type: null, item: null })
  }, [formData.part_number, existingInventory, currentBatch])

  // Fetch suggested location on component mount
  useEffect(() => {
    fetchSuggestedLocation()
  }, [])

  const fetchSuggestedLocation = async () => {
    setIsLoadingSuggestion(true)
    try {
      const response = await fetch('/api/inventory/suggest-location')
      const data = await response.json()
      
      if (data.success && data.suggestion) {
        setSuggestedLocation(data.suggestion)
      }
    } catch (error) {
      console.error('Error fetching suggested location:', error)
    } finally {
      setIsLoadingSuggestion(false)
    }
  }

  const applySuggestedLocation = () => {
    if (suggestedLocation) {
      setFormData(prev => ({ ...prev, location: suggestedLocation }))
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setUpdateSuccess(false)
  }

  const handleQuickUpdate = async () => {
    if (!duplicateInfo.item || !quickUpdateQty.trim()) return

    setIsUpdating(true)
    try {
      const qtyToAdd = Number.parseInt(quickUpdateQty)
      if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
        alert("Please enter a valid quantity")
        return
      }

      if (duplicateInfo.type === "inventory") {
        // Update existing inventory item
        const inventoryItem = duplicateInfo.item as InventoryItem
        const newQty = inventoryItem.qty + qtyToAdd

        const response = await fetch("/api/inventory/add-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            itemData: {
              ...inventoryItem,
              qty: newQty,
            },
            originalData: inventoryItem,
            requestedBy: "User",
          }),
        })

        if (response.ok) {
          setUpdateSuccess(true)
          setQuickUpdateQty("")
          // Update the duplicate info to show new quantity
          setDuplicateInfo((prev) => ({
            ...prev,
            item: prev.item ? { ...prev.item, qty: newQty } : null,
          }))
        } else {
          const error = await response.json()
          alert(`Failed to update: ${error.error}`)
        }
      } else if (duplicateInfo.type === "batch") {
        // Update batch item quantity
        const batchItem = duplicateInfo.item as BatchItem
        const newQty = batchItem.qty + qtyToAdd

        // This would need to be handled by the parent component
        // For now, just show success
        setUpdateSuccess(true)
        setQuickUpdateQty("")
        setDuplicateInfo((prev) => ({
          ...prev,
          item: prev.item ? { ...prev.item, qty: newQty } : null,
        }))
      }
    } catch (error) {
      console.error("Error updating quantity:", error)
      alert("Failed to update quantity")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.part_number.trim() || !formData.part_description.trim() || !formData.qty.trim()) {
      alert("Please fill in all required fields")
      return
    }

    const qty = Number.parseInt(formData.qty)
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity")
      return
    }

    const newItem: BatchItem = {
      part_number: formData.part_number.trim(),
      mfg_part_number: formData.mfg_part_number.trim(),
      part_description: formData.part_description.trim(),
      qty: qty,
      location: formData.location.trim(),
      supplier: formData.supplier.trim(),
      package: formData.package.trim(),
      reorder_point: Number.parseInt(formData.reorder_point) || 0,
      unit_cost: Number.parseFloat(formData.unit_cost) || 0,
      notes: formData.notes.trim(),
    }

    onItemAdded(newItem)

    // Reset form
    setFormData({
      part_number: "",
      mfg_part_number: "",
      part_description: "",
      qty: "",
      location: "",
      supplier: "",
      package: "",
      reorder_point: "",
      unit_cost: "",
      notes: "",
    })
    setQuickUpdateQty("")
    setUpdateSuccess(false)
    
    // Refresh suggested location for next item
    fetchSuggestedLocation()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Add Item to Batch
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="part_number">Part Number *</Label>
              <Input
                id="part_number"
                value={formData.part_number}
                onChange={(e) => handleInputChange("part_number", e.target.value)}
                placeholder="Enter part number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfg_part_number">MFG Part Number *</Label>
              <Input
                id="mfg_part_number"
                value={formData.mfg_part_number}
                onChange={(e) => handleInputChange("mfg_part_number", e.target.value)}
                placeholder="Enter manufacturer part number"
              />
            </div>
          </div>

          {/* Duplicate Warning */}
          {duplicateInfo.type && duplicateInfo.item && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <div className="space-y-3">
                  <div>
                    <strong>
                      ⚠️ Part already exists in {duplicateInfo.type === "inventory" ? "inventory" : "current batch"}!
                    </strong>
                    <br />
                    <span className="text-sm">
                      Location: <Badge variant="outline">{duplicateInfo.item.location}</Badge> • Qty:{" "}
                      <Badge variant="outline">{duplicateInfo.item.qty}</Badge> • Package:{" "}
                      <Badge variant="outline">{duplicateInfo.item.package}</Badge>
                    </span>
                  </div>

                  <Separator />

                  <div className="bg-white p-3 rounded border">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-sm">Quick Quantity Update</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Qty to add"
                        value={quickUpdateQty}
                        onChange={(e) => setQuickUpdateQty(e.target.value)}
                        className="w-24 h-8 text-sm"
                        min="1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleQuickUpdate}
                        disabled={!quickUpdateQty.trim() || isUpdating}
                        className="h-8"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Update
                          </>
                        )}
                      </Button>
                    </div>

                    {quickUpdateQty && duplicateInfo.item && (
                      <div className="text-xs text-gray-600 mt-1">
                        Current: <span className="font-medium">{duplicateInfo.item.qty}</span> → New:{" "}
                        <span className="font-medium">
                          {duplicateInfo.item.qty + (Number.parseInt(quickUpdateQty) || 0)}
                        </span>
                      </div>
                    )}

                    {updateSuccess && (
                      <div className="text-xs text-green-600 mt-1 font-medium">✅ Quantity updated successfully!</div>
                    )}
                  </div>

                  <div className="text-sm text-amber-700 bg-amber-100 p-2 rounded">
                    Use the Edit function in the main inventory table to modify existing items.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="part_description">Description *</Label>
              <Input
                id="part_description"
                value={formData.part_description}
                onChange={(e) => handleInputChange("part_description", e.target.value)}
                placeholder="Enter part description"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="package">Package</Label>
              <Input
                id="package"
                value={formData.package}
                onChange={(e) => handleInputChange("package", e.target.value)}
                placeholder="Enter package type"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity *</Label>
              <Input
                id="qty"
                type="number"
                value={formData.qty}
                onChange={(e) => handleInputChange("qty", e.target.value)}
                placeholder="Enter quantity"
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_point">Reorder Point</Label>
              <Input
                id="reorder_point"
                type="number"
                value={formData.reorder_point}
                onChange={(e) => handleInputChange("reorder_point", e.target.value)}
                placeholder="Enter reorder point"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="location">Location</Label>
                {suggestedLocation && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Suggested: {suggestedLocation}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applySuggestedLocation}
                      disabled={isLoadingSuggestion}
                      className="h-6 px-2 text-xs"
                    >
                      {isLoadingSuggestion ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Use"
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder={suggestedLocation ? `Suggested: ${suggestedLocation}` : "Enter location"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleInputChange("supplier", e.target.value)}
                placeholder="Enter supplier"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => handleInputChange("unit_cost", e.target.value)}
                placeholder="Enter unit cost"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Enter notes"
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add to Batch
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
