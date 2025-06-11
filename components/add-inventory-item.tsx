"use client"

import type React from "react"

import { useState } from "react"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.partNumber.trim()) {
        throw new Error("Part number is required")
      }

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

      await onAddItem(newItem)

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

      setOpen(false)
    } catch (error) {
      console.error("Error adding item:", error)
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
          <DialogDescription>Enter the details for the new inventory item.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
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
              <Label htmlFor="mfgPartNumber">MFG Part Number</Label>
              <Input
                id="mfgPartNumber"
                value={formData.mfgPartNumber}
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
              <Label htmlFor="description">Part Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="e.g., CAP KIT CERAMIC 0.1PF-5PF 1000PC"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) => handleInputChange("supplier", value)}
                disabled={loading}
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
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => handleInputChange("location", value)}
                disabled={loading}
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
            <div className="space-y-2">
              <Label htmlFor="package">Package Type</Label>
              <Select
                value={formData.package}
                onValueChange={(value) => handleInputChange("package", value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package type" />
                </SelectTrigger>
                <SelectContent>
                  {packageTypes.map((packageType) => (
                    <SelectItem key={packageType} value={packageType}>
                      {packageType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
