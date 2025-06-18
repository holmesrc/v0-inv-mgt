"use client"
import { useState, useRef, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, AlertTriangle, X, Package, User } from "lucide-react"
import type { InventoryItem } from "@/types/inventory"

interface AddInventoryItemProps {
  onAddItem: (item: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => void
  packageTypes: string[]
  suppliers: string[]
  locations: string[]
  defaultReorderPoint: number
  inventory: InventoryItem[] // Add this line
}

interface BatchItem extends Omit<InventoryItem, "id" | "lastUpdated"> {
  batchId: string
}

export default function AddInventoryItem({
  onAddItem,
  packageTypes,
  suppliers,
  locations,
  defaultReorderPoint,
  inventory, // Add this line
}: AddInventoryItemProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [requesterName, setRequesterName] = useState("")
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [currentItem, setCurrentItem] = useState({
    partNumber: "",
    mfgPartNumber: "",
    qty: 0,
    description: "",
    supplier: "",
    location: "",
    package: "",
    reorderPoint: defaultReorderPoint,
  })

  // Track if we're using custom input values
  const [useCustomSupplier, setUseCustomSupplier] = useState(false)
  const [useCustomLocation, setUseCustomLocation] = useState(false)
  const [useCustomPackage, setUseCustomPackage] = useState(false)

  // Refs for input fields
  const supplierInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const packageInputRef = useRef<HTMLInputElement>(null)

  // Debug logging for locations
  useEffect(() => {
    console.log("AddInventoryItem received locations:", locations)
  }, [locations])

  // Aggressive deduplication with debugging
  const uniquePackageTypes = useMemo(() => {
    const cleaned = packageTypes
      .filter((type) => type && typeof type === "string" && type.trim().length > 0)
      .map((type) => type.trim().toUpperCase())
    const uniqueSet = new Set(cleaned)
    const uniqueArray = Array.from(uniqueSet).sort()
    return uniqueArray
  }, [packageTypes])

  const uniqueSuppliers = useMemo(() => {
    const cleaned = suppliers
      .filter((supplier) => supplier && typeof supplier === "string" && supplier.trim().length > 0)
      .map((supplier) => supplier.trim())
    const uniqueSet = new Set(cleaned)
    return Array.from(uniqueSet).sort()
  }, [suppliers])

  const uniqueLocations = useMemo(() => {
    const cleaned = locations
      .filter((location) => location && typeof location === "string" && location.trim().length > 0)
      .map((location) => location.trim())

    const uniqueLocations = Array.from(new Set(cleaned))

    const sortedLocations = uniqueLocations.sort((a, b) => {
      const extractParts = (loc: string) => {
        const match = loc.match(/^([A-Za-z]*)(\d*)(?:[^A-Za-z0-9]*([A-Za-z]*)(\d*))?/)
        if (!match) return { prefix1: loc, num1: 0, prefix2: "", num2: 0 }

        const [, prefix1 = "", numStr1 = "", prefix2 = "", numStr2 = ""] = match
        const num1 = numStr1 ? Number.parseInt(numStr1, 10) : 0
        const num2 = numStr2 ? Number.parseInt(numStr2, 10) : 0

        return { prefix1, num1, prefix2, num2 }
      }

      const partsA = extractParts(a)
      const partsB = extractParts(b)

      if (partsA.prefix1 !== partsB.prefix1) {
        return partsA.prefix1.localeCompare(partsB.prefix1)
      }

      if (partsA.num1 !== partsB.num1) {
        return partsA.num1 - partsB.num1
      }

      if (partsA.prefix2 !== partsB.prefix2) {
        return partsA.prefix2.localeCompare(partsB.prefix2)
      }

      if (partsA.num2 !== partsB.num2) {
        return partsA.num2 - partsB.num2
      }

      return a.localeCompare(b)
    })

    return sortedLocations
  }, [locations])

  const resetCurrentItem = () => {
    setCurrentItem({
      partNumber: "",
      mfgPartNumber: "",
      qty: 0,
      description: "",
      supplier: "",
      location: "",
      package: "",
      reorderPoint: defaultReorderPoint,
    })
    setUseCustomSupplier(false)
    setUseCustomLocation(false)
    setUseCustomPackage(false)
  }

  const resetAll = () => {
    setRequesterName("")
    setBatchItems([])
    resetCurrentItem()
    setError(null)
    setSuccess(null)
  }

  const addToBatch = () => {
    // Validate current item
    if (!currentItem.partNumber.trim()) {
      setError("Part number is required")
      return
    }

    // Check for duplicate part numbers in batch
    const isDuplicate = batchItems.some((item) => item["Part number"] === currentItem.partNumber.trim())
    if (isDuplicate) {
      setError("This part number is already in the batch")
      return
    }

    // NEW: Check for duplicate part numbers in existing inventory
    const existsInInventory = inventory?.some(
      (item) => item["Part number"].toLowerCase() === currentItem.partNumber.trim().toLowerCase(),
    )
    if (existsInInventory) {
      setError(
        `Part number "${currentItem.partNumber.trim()}" already exists in inventory. Use the Edit function to modify existing items.`,
      )
      return
    }

    const newBatchItem: BatchItem = {
      batchId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      "Part number": currentItem.partNumber.trim(),
      "MFG Part number": currentItem.mfgPartNumber,
      QTY: currentItem.qty,
      "Part description": currentItem.description,
      Supplier: currentItem.supplier,
      Location: currentItem.location,
      Package: currentItem.package,
      reorderPoint: currentItem.reorderPoint,
    }

    setBatchItems((prev) => [...prev, newBatchItem])
    resetCurrentItem()
    setError(null)
    setSuccess(`Added ${newBatchItem["Part number"]} to batch (${batchItems.length + 1} items total)`)

    // Clear success message after 2 seconds
    setTimeout(() => setSuccess(null), 2000)
  }

  const removeFromBatch = (batchId: string) => {
    setBatchItems((prev) => prev.filter((item) => item.batchId !== batchId))
  }

  const submitBatch = async () => {
    if (!requesterName.trim()) {
      setError("Requester name is required")
      return
    }

    if (requesterName.trim().toLowerCase() === "current user") {
      setError("'Current User' is not a valid requester name. Please enter your actual name.")
      return
    }

    if (batchItems.length === 0) {
      setError("No items to submit. Add at least one item to the batch.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`🚀 Submitting batch of ${batchItems.length} items for requester: ${requesterName}`)

      // Submit each item individually (they'll each create separate pending changes)
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i]
        console.log(`📤 Submitting item ${i + 1}/${batchItems.length}: ${item["Part number"]}`)

        const itemForSubmission: Omit<InventoryItem, "id" | "lastUpdated"> = {
          "Part number": item["Part number"],
          "MFG Part number": item["MFG Part number"],
          QTY: item.QTY,
          "Part description": item["Part description"],
          Supplier: item.Supplier,
          Location: item.Location,
          Package: item.Package,
          reorderPoint: item.reorderPoint,
        }

        await onAddItem(itemForSubmission, requesterName.trim())

        // Small delay between submissions to avoid overwhelming the system
        if (i < batchItems.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      console.log("✅ All items submitted successfully")
      setSuccess(`Successfully submitted ${batchItems.length} items for approval!`)

      // Reset everything after successful submission
      setTimeout(() => {
        resetAll()
        setOpen(false)
      }, 2000)
    } catch (error) {
      console.error("❌ Error submitting batch:", error)
      setError(error instanceof Error ? error.message : "Failed to submit batch for approval")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setCurrentItem((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSelectChange = (field: string, value: string) => {
    if (value === "custom") {
      if (field === "supplier") {
        setUseCustomSupplier(true)
        setTimeout(() => supplierInputRef.current?.focus(), 100)
      } else if (field === "location") {
        setUseCustomLocation(true)
        setTimeout(() => locationInputRef.current?.focus(), 100)
      } else if (field === "package") {
        setUseCustomPackage(true)
        setTimeout(() => packageInputRef.current?.focus(), 100)
      }
    } else {
      handleInputChange(field, value)
      if (field === "supplier") setUseCustomSupplier(false)
      else if (field === "location") setUseCustomLocation(false)
      else if (field === "package") setUseCustomPackage(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) {
          resetAll()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Inventory Items</DialogTitle>
          <DialogDescription>
            Add one or more inventory items. All items will be submitted under the same requester name.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Requester Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Requester Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="requester">Requester Name *</Label>
                <Input
                  id="requester"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  All items in this batch will be submitted under this name for approval tracking.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current Item Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Add Item to Batch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partNumber">Part Number *</Label>
                  <Input
                    id="partNumber"
                    value={currentItem.partNumber}
                    onChange={(e) => handleInputChange("partNumber", e.target.value)}
                    placeholder="e.g., 490-12158-ND"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mfgPartNumber">MFG Part Number *</Label>
                  <Input
                    id="mfgPartNumber"
                    value={currentItem.mfgPartNumber}
                    onChange={(e) => handleInputChange("mfgPartNumber", e.target.value)}
                    placeholder="e.g., CAP KIT CER 5.1PF-47PF"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity *</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="0"
                    value={currentItem.qty}
                    onChange={(e) => handleInputChange("qty", Number.parseInt(e.target.value) || 0)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    min="0"
                    value={currentItem.reorderPoint}
                    onChange={(e) => handleInputChange("reorderPoint", Number.parseInt(e.target.value) || 0)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Part Description *</Label>
                  <Input
                    id="description"
                    value={currentItem.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="e.g., CAP KIT CERAMIC 0.1PF-5PF 1000PC"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  {!useCustomSupplier ? (
                    <Select
                      value={currentItem.supplier}
                      onValueChange={(value) => handleSelectChange("supplier", value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueSuppliers.map((supplier, index) => (
                          <SelectItem key={`supplier-${index}-${supplier}`} value={supplier}>
                            {supplier}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Enter custom supplier...</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      ref={supplierInputRef}
                      placeholder="Enter supplier name"
                      value={currentItem.supplier}
                      onChange={(e) => handleInputChange("supplier", e.target.value)}
                      onBlur={() => {
                        if (!currentItem.supplier) setUseCustomSupplier(false)
                      }}
                      disabled={loading}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  {!useCustomLocation ? (
                    <Select
                      value={currentItem.location}
                      onValueChange={(value) => handleSelectChange("location", value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueLocations.map((location, index) => (
                          <SelectItem key={`location-${index}-${location}`} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Enter custom location...</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      ref={locationInputRef}
                      placeholder="Enter location"
                      value={currentItem.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      onBlur={() => {
                        if (!currentItem.location) setUseCustomLocation(false)
                      }}
                      disabled={loading}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package">Package Type</Label>
                  {!useCustomPackage ? (
                    <Select
                      value={currentItem.package}
                      onValueChange={(value) => handleSelectChange("package", value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select package type" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniquePackageTypes.map((packageType, index) => (
                          <SelectItem key={`package-${index}-${packageType}`} value={packageType}>
                            {packageType}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Enter custom package...</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      ref={packageInputRef}
                      placeholder="Enter package type"
                      value={currentItem.package}
                      onChange={(e) => handleInputChange("package", e.target.value)}
                      onBlur={() => {
                        if (!currentItem.package) setUseCustomPackage(false)
                      }}
                      disabled={loading}
                    />
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="button" onClick={addToBatch} disabled={loading || !currentItem.partNumber.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Batch
                </Button>
                <Button type="button" variant="outline" onClick={resetCurrentItem} disabled={loading}>
                  Clear Form
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Batch Items List */}
          {batchItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Items in Batch ({batchItems.length})</span>
                  <Badge variant="secondary">{batchItems.length} items ready</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {batchItems.map((item, index) => (
                    <div key={item.batchId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item["Part number"]}</div>
                        <div className="text-sm text-muted-foreground">
                          {item["Part description"]} • Qty: {item.QTY} • {item.Supplier} • {item.Location}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromBatch(item.batchId)}
                        disabled={loading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            {batchItems.length > 0 && (
              <Button type="button" variant="outline" onClick={() => setBatchItems([])} disabled={loading}>
                Clear Batch
              </Button>
            )}
          </div>
          <Button onClick={submitBatch} disabled={loading || batchItems.length === 0 || !requesterName.trim()}>
            {loading ? "Submitting..." : `Submit ${batchItems.length} Items for Approval`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
