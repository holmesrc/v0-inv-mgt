"use client"

import type React from "react"
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
import { Plus, AlertTriangle } from "lucide-react"
import type { InventoryItem } from "@/types/inventory"

interface AddInventoryItemProps {
  onAddItem: (item: Omit<InventoryItem, "id" | "lastUpdated">) => void
  packageTypes: string[]
  suppliers: string[]
  locations: string[]
  defaultReorderPoint: number
}

export default function AddInventoryItem({
  onAddItem,
  packageTypes,
  suppliers,
  locations,
  defaultReorderPoint,
}: AddInventoryItemProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
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
    // Filter out empty/null/undefined values and trim whitespace
    const cleaned = packageTypes
      .filter((type) => type && typeof type === "string" && type.trim().length > 0)
      .map((type) => type.trim().toUpperCase()) // Normalize to uppercase

    // Create Set to remove duplicates, then convert back to array
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

  // COMPLETELY REWRITTEN location sorting function
  const uniqueLocations = useMemo(() => {
    console.log("Raw locations in AddInventoryItem:", locations)

    // Step 1: Clean the data - remove empty values and trim whitespace
    const cleaned = locations
      .filter((location) => location && typeof location === "string" && location.trim().length > 0)
      .map((location) => location.trim())

    console.log("Cleaned locations:", cleaned)

    // Step 2: Remove duplicates
    const uniqueLocations = Array.from(new Set(cleaned))
    console.log("Unique locations:", uniqueLocations)

    // Step 3: Custom sorting function for alphanumeric location codes
    const sortedLocations = uniqueLocations.sort((a, b) => {
      // Helper function to extract parts from location strings
      const extractParts = (loc: string) => {
        // Match patterns like "A1", "H1-2", "H10-B5", etc.
        const match = loc.match(/^([A-Za-z]*)(\d*)(?:[^A-Za-z0-9]*([A-Za-z]*)(\d*))?/)
        if (!match) return { prefix1: loc, num1: 0, prefix2: "", num2: 0 }

        const [, prefix1 = "", numStr1 = "", prefix2 = "", numStr2 = ""] = match
        const num1 = numStr1 ? Number.parseInt(numStr1, 10) : 0
        const num2 = numStr2 ? Number.parseInt(numStr2, 10) : 0

        return { prefix1, num1, prefix2, num2 }
      }

      const partsA = extractParts(a)
      const partsB = extractParts(b)

      // Compare first prefix (alphabetical)
      if (partsA.prefix1 !== partsB.prefix1) {
        return partsA.prefix1.localeCompare(partsB.prefix1)
      }

      // Compare first number (numerical)
      if (partsA.num1 !== partsB.num1) {
        return partsA.num1 - partsB.num1
      }

      // Compare second prefix if first parts are identical
      if (partsA.prefix2 !== partsB.prefix2) {
        return partsA.prefix2.localeCompare(partsB.prefix2)
      }

      // Compare second number
      if (partsA.num2 !== partsB.num2) {
        return partsA.num2 - partsB.num2
      }

      // If everything matches so far, fall back to string comparison
      return a.localeCompare(b)
    })

    console.log("Final sorted locations:", sortedLocations)
    return sortedLocations
  }, [locations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate required fields
      if (!formData.partNumber.trim()) {
        throw new Error("Part number is required and cannot be empty")
      }

      console.log("🚀 Adding new inventory item:", formData)

      const newItem: Omit<InventoryItem, "id" | "lastUpdated"> = {
        "Part number": formData.partNumber.trim(),
        "MFG Part number": formData.mfgPartNumber,
        QTY: formData.qty,
        "Part description": formData.description,
        Supplier: formData.supplier,
        Location: formData.location,
        Package: formData.package,
        reorderPoint: formData.reorderPoint,
      }

      // First try to add directly to the database
      try {
        console.log("📤 Sending item directly to API...")
        const response = await fetch("/api/inventory/add-item", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ item: newItem }),
        })

        const result = await response.json()

        if (!response.ok) {
          console.warn("⚠️ API returned error:", result)
          throw new Error(result.error || result.details || "Failed to add item to database")
        }

        console.log("✅ Item added to database successfully:", result)
        setSuccess("Item added successfully!")
      } catch (apiError) {
        console.error("❌ Error adding item via API:", apiError)
        // Continue with local add even if API fails
      }

      console.log("📤 Calling onAddItem with:", newItem)

      // Call the parent function to add the item locally
      await onAddItem(newItem)

      console.log("✅ Item added successfully")

      // Reset form
      setFormData({
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

      // Show success message briefly before closing
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
      }, 1500)
    } catch (error) {
      console.error("❌ Error adding item:", error)
      setError(error instanceof Error ? error.message : "Failed to add item")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSelectChange = (field: string, value: string) => {
    if (value === "custom") {
      // If "custom" is selected, focus the corresponding input field
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
      // Otherwise, update the form data with the selected value
      handleInputChange(field, value)

      // Reset custom input flags
      if (field === "supplier") setUseCustomSupplier(false)
      else if (field === "location") setUseCustomLocation(false)
      else if (field === "package") setUseCustomPackage(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>Enter the details for the new inventory item. All fields are required.</DialogDescription>
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

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number *</Label>
              <Input
                id="partNumber"
                value={formData.partNumber}
                onChange={(e) => handleInputChange("partNumber", e.target.value)}
                placeholder="e.g., 490-12158-ND"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfgPartNumber">MFG Part Number *</Label>
              <Input
                id="mfgPartNumber"
                value={formData.mfgPartNumber}
                onChange={(e) => handleInputChange("mfgPartNumber", e.target.value)}
                placeholder="e.g., CAP KIT CER 5.1PF-47PF"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity *</Label>
              <Input
                id="qty"
                type="number"
                min="0"
                value={formData.qty}
                onChange={(e) => handleInputChange("qty", Number.parseInt(e.target.value) || 0)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                min="0"
                value={formData.reorderPoint}
                onChange={(e) => handleInputChange("reorderPoint", Number.parseInt(e.target.value) || 0)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Part Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="e.g., CAP KIT CERAMIC 0.1PF-5PF 1000PC"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              {!useCustomSupplier ? (
                <Select
                  value={formData.supplier}
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
                  value={formData.supplier}
                  onChange={(e) => handleInputChange("supplier", e.target.value)}
                  onBlur={() => {
                    if (!formData.supplier) setUseCustomSupplier(false)
                  }}
                  disabled={loading}
                />
              )}
              {!useCustomSupplier && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto py-1 text-xs"
                  onClick={() => {
                    setUseCustomSupplier(true)
                    setTimeout(() => supplierInputRef.current?.focus(), 100)
                  }}
                  disabled={loading}
                >
                  Enter custom supplier
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              {!useCustomLocation ? (
                <Select
                  value={formData.location}
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
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  onBlur={() => {
                    if (!formData.location) setUseCustomLocation(false)
                  }}
                  disabled={loading}
                />
              )}
              {!useCustomLocation && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto py-1 text-xs"
                  onClick={() => {
                    setUseCustomLocation(true)
                    setTimeout(() => locationInputRef.current?.focus(), 100)
                  }}
                  disabled={loading}
                >
                  Enter custom location
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="package">Package Type</Label>
              {!useCustomPackage ? (
                <Select
                  value={formData.package}
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
                  value={formData.package}
                  onChange={(e) => handleInputChange("package", e.target.value)}
                  onBlur={() => {
                    if (!formData.package) setUseCustomPackage(false)
                  }}
                  disabled={loading}
                />
              )}
              {!useCustomPackage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto py-1 text-xs"
                  onClick={() => {
                    setUseCustomPackage(true)
                    setTimeout(() => packageInputRef.current?.focus(), 100)
                  }}
                  disabled={loading}
                >
                  Enter custom package type
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
