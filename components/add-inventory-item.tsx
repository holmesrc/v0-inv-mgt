"use client"

import type React from "react"
import { useState, useRef, useMemo } from "react"
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
import { Plus } from "lucide-react"
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
  const [formData, setFormData] = useState({
    partNumber: "",
    mfgPartNumber: "",
    qty: 0,
    description: "",
    supplier: "",
    location: "",
    package: "",
    reorderPoint: defaultReorderPoint,
    requester: "",
  })

  // Track if we're using custom input values
  const [useCustomSupplier, setUseCustomSupplier] = useState(false)
  const [useCustomLocation, setUseCustomLocation] = useState(false)
  const [useCustomPackage, setUseCustomPackage] = useState(false)

  // Refs for input fields
  const supplierInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const packageInputRef = useRef<HTMLInputElement>(null)

  // Aggressive deduplication with debugging
  const uniquePackageTypes = useMemo(() => {
    console.log("Raw packageTypes:", packageTypes)

    // Filter out empty/null/undefined values and trim whitespace
    const cleaned = packageTypes
      .filter((type) => type && typeof type === "string" && type.trim().length > 0)
      .map((type) => type.trim().toUpperCase()) // Normalize to uppercase

    console.log("Cleaned packageTypes:", cleaned)

    // Create Set to remove duplicates, then convert back to array
    const uniqueSet = new Set(cleaned)
    const uniqueArray = Array.from(uniqueSet).sort()

    console.log("Final unique packageTypes:", uniqueArray)

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
    const uniqueSet = new Set(cleaned)
    return Array.from(uniqueSet).sort()
  }, [locations])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newItem: Omit<InventoryItem, "id" | "lastUpdated"> = {
      "Part number": formData.partNumber,
      "MFG Part number": formData.mfgPartNumber,
      QTY: formData.qty,
      "Part description": formData.description,
      Supplier: formData.supplier,
      Location: formData.location,
      Package: formData.package,
      reorderPoint: formData.reorderPoint,
    }

    onAddItem(newItem)

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
      requester: "",
    })
    setUseCustomSupplier(false)
    setUseCustomLocation(false)
    setUseCustomPackage(false)

    setOpen(false)
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requester">Requested By</Label>
              <Input
                id="requester"
                value={formData.requester}
                onChange={(e) => handleInputChange("requester", e.target.value)}
                placeholder="Your name or department"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              {!useCustomSupplier ? (
                <Select value={formData.supplier} onValueChange={(value) => handleSelectChange("supplier", value)}>
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
                >
                  Enter custom supplier
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              {!useCustomLocation ? (
                <Select value={formData.location} onValueChange={(value) => handleSelectChange("location", value)}>
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
                >
                  Enter custom location
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="package">Package Type</Label>
              {!useCustomPackage ? (
                <Select value={formData.package} onValueChange={(value) => handleSelectChange("package", value)}>
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
                >
                  Enter custom package type
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
