"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Plus, AlertTriangle, Package, Zap } from "lucide-react"
import type { InventoryItem } from "@/types/inventory"

interface AddInventoryItemProps {
  onAddItem: (item: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => Promise<void>
  packageTypes: string[]
  suppliers: string[]
  locations: string[]
  defaultReorderPoint: number
  inventory: InventoryItem[]
}

export default function AddInventoryItem({
  onAddItem,
  packageTypes,
  suppliers,
  locations,
  defaultReorderPoint,
  inventory,
}: AddInventoryItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    partNumber: "",
    mfgPartNumber: "",
    quantity: "",
    description: "",
    supplier: "",
    location: "",
    package: "",
    reorderPoint: defaultReorderPoint.toString(),
    requester: "",
  })
  const [batchItems, setBatchItems] = useState<Array<Omit<InventoryItem, "id" | "lastUpdated">>>([])
  const [duplicateWarning, setDuplicateWarning] = useState<{
    type: "inventory" | "batch"
    existingItem: InventoryItem | Omit<InventoryItem, "id" | "lastUpdated">
    batchIndex?: number
  } | null>(null)
  const [quickUpdateQuantity, setQuickUpdateQuantity] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<string>("")

  // Helper function to determine correct package type based on quantity
  const getCorrectPackageType = (qty: number): string => {
    if (qty >= 1 && qty <= 100) {
      return "EXACT"
    } else if (qty >= 101 && qty <= 500) {
      return "ESTIMATED"
    } else if (qty > 500) {
      return "REEL"
    }
    return "EXACT" // Default fallback
  }

  // Function to lookup part information from web
  const lookupPartInfo = async (partNumber: string) => {
    if (!partNumber.trim() || partNumber.length < 3) {
      return
    }

    setIsLookingUp(true)
    setLookupStatus("🌐 Searching REAL Digikey and Mouser websites...")

    try {
      const response = await fetch('/api/part-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partNumber: partNumber.trim() }),
      })

      const result = await response.json()

      if (result.success && result.data.found) {
        const { mfgPartNumber, description, supplier } = result.data
        
        // Auto-populate fields only if they're currently empty
        setFormData(prev => ({
          ...prev,
          mfgPartNumber: prev.mfgPartNumber || mfgPartNumber || "",
          description: prev.description || description || "",
          supplier: prev.supplier || supplier || "",
        }))

        setLookupStatus(`🎉 Found REAL data from ${result.data.source}!`)
        
        // Clear status after 4 seconds for success
        setTimeout(() => setLookupStatus(""), 4000)
      } else {
        setLookupStatus("❌ Not found on Digikey or Mouser - enter manually")
        setTimeout(() => setLookupStatus(""), 4000)
      }
    } catch (error) {
      console.error('Part lookup failed:', error)
      setLookupStatus("💥 Search failed - check connection and try again")
      setTimeout(() => setLookupStatus(""), 4000)
    } finally {
      setIsLookingUp(false)
    }
  }

  // Check for duplicates when part number changes
  useEffect(() => {
    if (formData.partNumber.trim()) {
      // Check inventory first
      const existingInInventory = inventory.find(
        (item) => item["Part number"].toLowerCase() === formData.partNumber.toLowerCase().trim(),
      )

      if (existingInInventory) {
        setDuplicateWarning({
          type: "inventory",
          existingItem: existingInInventory,
        })
        return
      }

      // Check current batch
      const existingInBatch = batchItems.findIndex(
        (item) => item["Part number"].toLowerCase() === formData.partNumber.toLowerCase().trim(),
      )

      if (existingInBatch !== -1) {
        setDuplicateWarning({
          type: "batch",
          existingItem: batchItems[existingInBatch],
          batchIndex: existingInBatch,
        })
        return
      }
    }

    // Clear warning if no duplicates
    setDuplicateWarning(null)
  }, [formData.partNumber, inventory, batchItems])

  // Auto-lookup part information when part number changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.partNumber.trim() && formData.partNumber.length >= 3 && !duplicateWarning) {
        lookupPartInfo(formData.partNumber)
      }
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timeoutId)
  }, [formData.partNumber, duplicateWarning])

  // Auto-suggest package type based on quantity
  useEffect(() => {
    const qty = Number(formData.quantity)
    if (qty > 0 && !formData.package) {
      const suggestedPackage = getCorrectPackageType(qty)
      setFormData((prev) => ({ ...prev, package: suggestedPackage }))
    }
  }, [formData.quantity, formData.package])

  const resetForm = () => {
    setFormData({
      partNumber: "",
      mfgPartNumber: "",
      quantity: "",
      description: "",
      supplier: "",
      location: "",
      package: "",
      reorderPoint: defaultReorderPoint.toString(),
      requester: "",
    })
    setDuplicateWarning(null)
    setQuickUpdateQuantity("")
    setError(null)
    setIsLookingUp(false)
    setLookupStatus("")
  }

  const handleAddToBatch = () => {
    if (!formData.partNumber.trim()) {
      setError("Part number is required")
      return
    }

    if (!formData.requester.trim() || formData.requester.toLowerCase() === "current user") {
      setError("Please provide a valid requester name")
      return
    }

    const qty = Number(formData.quantity) || 0
    const correctPackage = getCorrectPackageType(qty)

    const newItem: Omit<InventoryItem, "id" | "lastUpdated"> = {
      "Part number": formData.partNumber.trim(),
      "MFG Part number": formData.mfgPartNumber.trim(),
      QTY: qty,
      "Part description": formData.description.trim(),
      Supplier: formData.supplier.trim(),
      Location: formData.location.trim(),
      Package: correctPackage, // Auto-correct package type
      reorderPoint: Number(formData.reorderPoint) || defaultReorderPoint,
    }

    setBatchItems((prev) => [...prev, newItem])
    resetForm()
    setError(null)
  }

  const handleQuickUpdate = async () => {
    if (!duplicateWarning || !quickUpdateQuantity.trim()) {
      setError("Please enter a quantity to add")
      return
    }

    const additionalQty = Number(quickUpdateQuantity)
    if (isNaN(additionalQty) || additionalQty <= 0) {
      setError("Please enter a valid positive number")
      return
    }

    if (!formData.requester.trim() || formData.requester.toLowerCase() === "current user") {
      setError("Please provide a valid requester name")
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      if (duplicateWarning.type === "inventory") {
        const existingItem = duplicateWarning.existingItem as InventoryItem
        const newQuantity = existingItem.QTY + additionalQty

        // Submit update for approval
        const response = await fetch("/api/inventory/pending", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changeType: "update",
            itemData: {
              part_number: existingItem["Part number"],
              mfg_part_number: existingItem["MFG Part number"],
              qty: newQuantity,
              part_description: existingItem["Part description"],
              supplier: existingItem.Supplier,
              location: existingItem.Location,
              package: getCorrectPackageType(newQuantity), // Auto-correct package
              reorder_point: existingItem.reorderPoint || defaultReorderPoint,
            },
            originalData: {
              part_number: existingItem["Part number"],
              mfg_part_number: existingItem["MFG Part number"],
              qty: existingItem.QTY,
              part_description: existingItem["Part description"],
              supplier: existingItem.Supplier,
              location: existingItem.Location,
              package: existingItem.Package,
              reorder_point: existingItem.reorderPoint || defaultReorderPoint,
            },
            requestedBy: formData.requester.trim(),
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            // Send Slack notification
            try {
              await fetch("/api/slack/send-approval-request", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  changeType: "update",
                  itemData: {
                    part_number: existingItem["Part number"],
                    qty: newQuantity,
                  },
                  originalData: {
                    part_number: existingItem["Part number"],
                    qty: existingItem.QTY,
                  },
                  requestedBy: formData.requester.trim(),
                  changeId: result.data.id,
                }),
              })
            } catch (slackError) {
              console.error("Failed to send Slack notification:", slackError)
            }

            alert(
              `✅ Quantity update submitted for approval!\n\n${existingItem["Part number"]}: ${existingItem.QTY} → ${newQuantity} units\n\nRequested by: ${formData.requester}`,
            )
            setQuickUpdateQuantity("")
            // Don't close the dialog - let user make more updates if needed
          } else {
            throw new Error(result.error || "Failed to submit update")
          }
        } else {
          throw new Error("Failed to submit update for approval")
        }
      } else if (duplicateWarning.type === "batch") {
        // Update batch item
        const batchIndex = duplicateWarning.batchIndex!
        const existingBatchItem = batchItems[batchIndex]
        const newQuantity = existingBatchItem.QTY + additionalQty

        const updatedBatchItems = [...batchItems]
        updatedBatchItems[batchIndex] = {
          ...existingBatchItem,
          QTY: newQuantity,
          Package: getCorrectPackageType(newQuantity), // Auto-correct package
        }

        setBatchItems(updatedBatchItems)
        alert(
          `✅ Batch item updated!\n\n${existingBatchItem["Part number"]}: ${existingBatchItem.QTY} → ${newQuantity} units`,
        )
        setQuickUpdateQuantity("")
        // Don't close the dialog - let user make more updates if needed
      }
    } catch (error) {
      console.error("Quick update failed:", error)
      setError(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSubmitBatch = async () => {
    if (batchItems.length === 0) {
      setError("No items in batch to submit")
      return
    }

    if (!formData.requester.trim() || formData.requester.toLowerCase() === "current user") {
      setError("Please provide a valid requester name")
      return
    }

    try {
      const response = await fetch("/api/inventory/batch-pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchItems,
          requestedBy: formData.requester.trim(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Send Slack notification for batch
          try {
            await fetch("/api/slack/send-batch-approval-request", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                batchItems,
                requestedBy: formData.requester.trim(),
                changeId: result.data.id,
              }),
            })
          } catch (slackError) {
            console.error("Failed to send Slack notification:", slackError)
          }

          alert(`✅ Batch of ${batchItems.length} items submitted for approval!\n\nRequested by: ${formData.requester}`)
          setBatchItems([])
          resetForm()
          setIsOpen(false)
        } else {
          throw new Error(result.error || "Failed to submit batch")
        }
      } else {
        throw new Error("Failed to submit batch for approval")
      }
    } catch (error) {
      console.error("Batch submission failed:", error)
      setError(`Failed to submit batch: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const removeBatchItem = (index: number) => {
    setBatchItems((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Add Item to Batch
          </DialogTitle>
          <DialogDescription>
            Add items to your batch, then submit all for approval at once. Batch contains {batchItems.length} item(s).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Add Item Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partNumber">Part Number *</Label>
                <div className="relative">
                  <Input
                    id="partNumber"
                    value={formData.partNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, partNumber: e.target.value }))}
                    placeholder="Enter part number"
                    className={duplicateWarning ? "border-orange-300 bg-orange-50" : ""}
                  />
                  {isLookingUp && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                {lookupStatus && (
                  <p className="text-xs mt-1 text-blue-600">{lookupStatus}</p>
                )}
              </div>
              <div>
                <Label htmlFor="mfgPartNumber">MFG Part Number *</Label>
                <Input
                  id="mfgPartNumber"
                  value={formData.mfgPartNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mfgPartNumber: e.target.value }))}
                  placeholder="Enter manufacturer part number"
                />
              </div>
            </div>

            {/* Duplicate Warning */}
            {duplicateWarning && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div>
                      <strong className="text-orange-800">
                        ⚠️ Part{" "}
                        {duplicateWarning.type === "inventory"
                          ? "already exists in inventory"
                          : "already in current batch"}
                        !
                      </strong>
                      <br />
                      <span className="text-sm">
                        Location: <strong>{duplicateWarning.existingItem.Location}</strong> • Qty:{" "}
                        <strong>{duplicateWarning.existingItem.QTY}</strong> • Package:{" "}
                        <strong>{duplicateWarning.existingItem.Package}</strong>
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Quick Quantity Update</span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label htmlFor="quickUpdate" className="text-xs">
                            Qty to add
                          </Label>
                          <Input
                            id="quickUpdate"
                            type="number"
                            min="1"
                            value={quickUpdateQuantity}
                            onChange={(e) => setQuickUpdateQuantity(e.target.value)}
                            placeholder="e.g., 50"
                            className="h-8"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={handleQuickUpdate}
                          disabled={isUpdating || !quickUpdateQuantity.trim() || !formData.requester.trim()}
                          className="h-8"
                        >
                          {isUpdating ? "Updating..." : "Update"}
                        </Button>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Current: <strong>{duplicateWarning.existingItem.QTY}</strong> → New:{" "}
                        <strong>{duplicateWarning.existingItem.QTY + (Number(quickUpdateQuantity) || 0)}</strong>
                      </div>
                    </div>

                    <div className="text-sm text-orange-700 bg-orange-100 p-2 rounded">
                      Use the Edit function in the main inventory table to modify existing items.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  value={formData.reorderPoint}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reorderPoint: e.target.value }))}
                  placeholder={`Default: ${defaultReorderPoint}`}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Part Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter part description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  value={formData.supplier}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, supplier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier} value={supplier}>
                        {supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="package">Package Type</Label>
              <Select
                value={formData.package}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, package: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-suggested based on quantity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXACT">EXACT (1-100 units)</SelectItem>
                  <SelectItem value="ESTIMATED">ESTIMATED (101-500 units)</SelectItem>
                  <SelectItem value="REEL">REEL (500+ units)</SelectItem>
                  <SelectItem value="KIT">KIT</SelectItem>
                  <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                  {packageTypes
                    .filter((pkg) => !["EXACT", "ESTIMATED", "REEL", "KIT", "CUSTOM"].includes(pkg))
                    .map((packageType) => (
                      <SelectItem key={packageType} value={packageType}>
                        {packageType}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formData.quantity && formData.package && (
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const qty = Number(formData.quantity)
                    const suggested = getCorrectPackageType(qty)
                    const isCorrect = formData.package === suggested
                    const isExcluded = ["KIT", "KITS", "CUSTOM"].some((excluded) =>
                      formData.package.toUpperCase().includes(excluded),
                    )

                    if (isExcluded) {
                      return `✅ Custom package type: ${formData.package}`
                    } else if (isCorrect) {
                      return `✅ Correct package type for ${qty} units`
                    } else {
                      return `⚠️ Suggested: ${suggested} for ${qty} units`
                    }
                  })()}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="requester">Requester Name *</Label>
              <Input
                id="requester"
                value={formData.requester}
                onChange={(e) => setFormData((prev) => ({ ...prev, requester: e.target.value }))}
                placeholder="Enter your name"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Required for all changes that need approval</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleAddToBatch} className="w-full" disabled={!formData.partNumber.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add to Batch
            </Button>
          </div>

          {/* Right Column - Batch Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Current Batch ({batchItems.length} items)</h3>
              {batchItems.length > 0 && (
                <Button onClick={handleSubmitBatch} disabled={!formData.requester.trim()}>
                  Submit Batch for Approval
                </Button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {batchItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No items in batch yet</p>
                  <p className="text-sm">Add items using the form on the left</p>
                </div>
              ) : (
                batchItems.map((item, index) => (
                  <div key={index} className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{item["Part number"]}</div>
                      <Button size="sm" variant="outline" onClick={() => removeBatchItem(index)}>
                        Remove
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>MFG: {item["MFG Part number"]}</div>
                      <div>Qty: {item.QTY}</div>
                      <div>Description: {item["Part description"]}</div>
                      <div className="flex gap-4">
                        <span>Supplier: {item.Supplier}</span>
                        <span>Location: {item.Location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.Package}</Badge>
                        <span>Reorder: {item.reorderPoint}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
