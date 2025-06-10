"use client"

import type React from "react"
import type { InventoryItem } from "@/types/inventory" // Declare the InventoryItem variable

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, CheckCircle2 } from "lucide-react"

interface AddInventoryItemProps {
  onAddItem: (item: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => void
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Validate required fields
    if (!formData.partNumber.trim()) {
      throw new Error("Part number is required and cannot be empty")
    }
    if (!formData.requester.trim()) {
      throw new Error("Requester name is required and cannot be empty")
    }

    try {
      // Convert stock values to numbers
      const payload = {
        ...formData,
        current_stock: Number.parseInt(formData.qty.toString()),
        min_stock: Number.parseInt(formData.reorderPoint.toString()),
      }

      const response = await fetch("/api/inventory/add-item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to add item")
      }

      setSuccess(true)
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

      // Call the parent function to add the item locally
      // await onAddItem(newItem, formData.requester)

      if (onAddItem) {
        //onItemAdded()
      }
    } catch (err) {
      setError(err.message)
      console.error("Error adding item:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700">Success</AlertTitle>
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="part_number">Part Number *</Label>
            <Input
              id="part_number"
              name="part_number"
              value={formData.partNumber}
              onChange={handleChange}
              required
              placeholder="e.g. ABC-123"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Item description"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="e.g. Shelf A3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_stock">Current Stock *</Label>
            <Input
              id="current_stock"
              name="current_stock"
              type="number"
              min="0"
              value={formData.qty}
              onChange={handleChange}
              required
              placeholder="e.g. 10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min_stock">Minimum Stock *</Label>
            <Input
              id="min_stock"
              name="min_stock"
              type="number"
              min="0"
              value={formData.reorderPoint}
              onChange={handleChange}
              required
              placeholder="e.g. 5"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional information about this item"
            rows={3}
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit for Approval"}
        </Button>
      </form>
    </div>
  )
}
