"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { InventoryItem } from "@/types/inventory"

interface AddInventoryItemProps {
  onAddItem: (item: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => void
  packageTypes: string[]
  suppliers: string[]
  locations: string[]
  defaultReorderPoint: number
}

export default function AddInventoryItem({
  onAddItem,
  packageTypes = [],
  suppliers = [],
  locations = [],
  defaultReorderPoint = 5,
}: AddInventoryItemProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    requester: "",
    partNumber: "",
    mfgPartNumber: "",
    qty: 0,
    description: "",
    supplier: "",
    location: "",
    package: "",
    reorderPoint: defaultReorderPoint,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate required fields
      if (!formData.partNumber.trim()) {
        throw new Error("Part number is required")
      }
      if (!formData.requester.trim()) {
        throw new Error("Requester name is required")
      }

      // Create the new item object
      const newItem: Omit<InventoryItem, "id" | "lastUpdated"> = {
        "Part number": formData.partNumber.trim(),
        "MFG Part number": formData.mfgPartNumber,
        QTY: Number(formData.qty),
        "Part description": formData.description,
        Supplier: formData.supplier,
        Location: formData.location,
        Package: formData.package,
        reorderPoint: Number(formData.reorderPoint),
      }

      // Call the parent function to add the item
      await onAddItem(newItem, formData.requester)

      setSuccess(true)

      // Reset form
      setFormData({
        requester: "",
        partNumber: "",
        mfgPartNumber: "",
        qty: 0,
        description: "",
        supplier: "",
        location: "",
        package: "",
        reorderPoint: defaultReorderPoint,
      })

      // Close dialog after success
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Failed to add item")
      console.error("Error adding item:", err)
    } finally {
      setLoading(false)
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
          <DialogDescription>Enter the details for the new inventory item.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600">Item has been submitted for approval.</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="requester">Requested By *</Label>
              <Input
                id="requester"
                name="requester"
                value={formData.requester}
                onChange={handleChange}
                placeholder="Your name"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number *</Label>
              <Input
                id="partNumber"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleChange}
                required
                placeholder="e.g. ABC-123"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfgPartNumber">MFG Part Number</Label>
              <Input
                id="mfgPartNumber"
                name="mfgPartNumber"
                value={formData.mfgPartNumber}
                onChange={handleChange}
                placeholder="Manufacturer part number"
                disabled={loading}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Item description"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Storage location"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="Supplier name"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="package">Package Type</Label>
              <Input
                id="package"
                name="package"
                value={formData.package}
                onChange={handleChange}
                placeholder="Package type"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                name="qty"
                type="number"
                min="0"
                value={formData.qty}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                name="reorderPoint"
                type="number"
                min="0"
                value={formData.reorderPoint}
                onChange={handleChange}
                disabled={loading}
              />
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
