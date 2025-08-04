"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, Package, TrendingDown, Upload, Settings, RefreshCw, Download, Plus, Edit, Trash2, Check, X, Search, Filter, ArrowUpDown } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import FileUpload from "./file-upload"

// Types
interface InventoryItem {
  id: string
  "Part number": string
  "MFG Part number"?: string
  "Part description": string
  QTY: number
  Location: string
  Supplier: string
  Package: string
  reorderPoint?: number
  lastUpdated: string
}

interface AlertSettings {
  defaultReorderPoint: number
  lowStockThreshold: number
  enableSlackNotifications: boolean
  slackWebhookUrl: string
}

interface PendingChange {
  id: string
  change_type: string
  item_data: any
  requester: string
  timestamp: string
  status: string
}

export default function InventoryDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [packageNote, setPackageNote] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"part_number" | "location" | "quantity">("part_number")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    defaultReorderPoint: 10,
    lowStockThreshold: 5,
    enableSlackNotifications: false,
    slackWebhookUrl: "",
  })
  const [showUpload, setShowUpload] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [showPendingChanges, setShowPendingChanges] = useState(false)
  const [slackConfigured, setSlackConfigured] = useState(false)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [suggestedLocation, setSuggestedLocation] = useState<string>("H1-1")
  const [editDialogOpen, setEditDialogOpen] = useState<Record<string, boolean>>({})
  const [addItemFormModified, setAddItemFormModified] = useState(false)
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [duplicatePartInfo, setDuplicatePartInfo] = useState<{
    partNumber: string
    mfgPartNumber?: string
    description: string
    newQuantity: number
    location: string
    supplier: string
    package: string
    reorderPoint?: number
    existingItem: any
  } | null>(null)

  // Debug: Log inventory changes
  useEffect(() => {
    console.log(`📊 Inventory state updated: ${inventory.length} items`)
    if (inventory.length > 0) {
      console.log("📊 Sample inventory items:", inventory.slice(0, 2))
    }
  }, [inventory])

  useEffect(() => {
    loadInventoryFromDatabase()
    loadSettingsFromDatabase()
    loadPendingChanges()
  }, [])

  const checkSlackConfiguration = async () => {
    try {
      const response = await fetch("/api/slack/test")
      if (response.ok) {
        const result = await response.json()
        setSlackConfigured(result.configured)
      } else {
        setSlackConfigured(false)
      }
    } catch (error) {
      console.error("Error checking Slack configuration:", error)
      setSlackConfigured(false)
    }
  }

  const loadInventoryFromDatabase = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/inventory")
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          console.log(`📊 Loaded ${result.data.length} items from database`)
          setInventory(result.data)
          setShowUpload(result.data.length === 0)
        } else {
          console.error("Invalid data format from API:", result)
          setInventory([])
          setShowUpload(true)
        }
      } else {
        console.error("Failed to load inventory:", response.status)
        setInventory([])
        setShowUpload(true)
      }
    } catch (error) {
      console.error("Error loading inventory:", error)
      setInventory([])
      setShowUpload(true)
    } finally {
      setLoading(false)
    }
  }

  const loadSettingsFromDatabase = async () => {
    try {
      const response = await fetch("/api/settings")
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setAlertSettings(result.data)
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const loadPendingChanges = async () => {
    try {
      const response = await fetch("/api/inventory/pending")
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setPendingChanges(result.data)
        }
      }
    } catch (error) {
      console.error("Error loading pending changes:", error)
    }
  }

  const saveInventoryToDatabase = async (inventoryData: InventoryItem[], note = "", filename = "") => {
    try {
      setSyncing(true)
      setError(null)

      const invalidItems = inventoryData.filter((item) => !item["Part number"])
      if (invalidItems.length > 0) {
        throw new Error(`Found ${invalidItems.length} items without part numbers`)
      }

      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventory: inventoryData,
          note: note || packageNote,
          filename: filename,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Unknown error occurred")
      }

      console.log("✅ Inventory saved successfully")
      await loadInventoryFromDatabase()
      await loadPendingChanges()
      setPackageNote("")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("❌ Save failed:", errorMessage)
      setError(`Failed to save inventory: ${errorMessage}`)
      throw error
    } finally {
      setSyncing(false)
    }
  }

  const saveSettingsToDatabase = async (settings: AlertSettings) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Unknown error occurred")
      }

      console.log("✅ Settings saved successfully")
    } catch (error) {
      console.error("❌ Settings save failed:", error)
      throw error
    }
  }

  // Simple duplicate check function
  const checkForDuplicatePart = async (partNumber: string) => {
    if (!partNumber.trim()) return false

    setCheckingDuplicate(true)
    try {
      // Check existing inventory
      const existingItem = inventory.find(
        (item) => item["Part number"].toLowerCase() === partNumber.toLowerCase()
      )

      if (existingItem) {
        return existingItem
      }

      // Check pending changes
      const response = await fetch("/api/inventory/pending")
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          const pendingDuplicate = result.data.find((change: any) =>
            change.item_data?.part_number?.toLowerCase() === partNumber.toLowerCase()
          )
          if (pendingDuplicate) {
            return pendingDuplicate.item_data
          }
        }
      }

      return false
    } catch (error) {
      console.error("Error checking for duplicates:", error)
      return false
    } finally {
      setCheckingDuplicate(false)
    }
  }

  // Add single inventory item
  const addInventoryItem = async (newItem: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => {
    try {
      const response = await fetch("/api/inventory/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item: newItem,
          requester: requester,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Unknown error occurred")
      }

      console.log("✅ Item added successfully")
      await loadInventoryFromDatabase()
      await loadPendingChanges()
    } catch (error) {
      console.error("❌ Add item failed:", error)
      throw error
    }
  }

  // Handle data loaded from file upload
  const handleDataLoaded = async (data: any[], note: string) => {
    try {
      await saveInventoryToDatabase(data, note, "uploaded_file")
      setShowUpload(false)
    } catch (error) {
      console.error("Error handling uploaded data:", error)
    }
  }

  // Handle settings update
  const handleSettingsUpdate = async (newSettings: AlertSettings) => {
    setAlertSettings(newSettings)
    try {
      await saveSettingsToDatabase(newSettings)
    } catch (error) {
      console.error("Failed to save settings:", error)
      setError("Settings updated locally but failed to sync to database")
    }
  }

  // Show loading screen
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

  // Show upload screen if no data
  if (showUpload) {
    return <FileUpload onDataLoaded={handleDataLoaded} />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management System</h1>
          <p className="text-muted-foreground">Managing {inventory.length} inventory items</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddItemDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Add a single item to inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="part-number">Part Number *</Label>
              <Input id="part-number" placeholder="Enter part number" />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input id="description" placeholder="Enter description" />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" type="number" placeholder="Enter quantity" />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Enter location" />
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" placeholder="Enter supplier" />
            </div>
            <div>
              <Label htmlFor="package">Package</Label>
              <Input id="package" placeholder="Enter package type" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle form submission
              console.log("Add item clicked")
              setAddItemDialogOpen(false)
            }}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Part Found</DialogTitle>
            <DialogDescription>
              This part number already exists in the inventory.
            </DialogDescription>
          </DialogHeader>
          {duplicatePartInfo && (
            <div className="space-y-2">
              <div><strong>Existing Item:</strong></div>
              <div><strong>Part Number:</strong> {duplicatePartInfo.existingItem.part_number}</div>
              <div><strong>Description:</strong> {duplicatePartInfo.existingItem.part_description}</div>
              <div><strong>Quantity:</strong> {duplicatePartInfo.existingItem.quantity} units</div>
              <div><strong>Location:</strong> {duplicatePartInfo.existingItem.location}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle continue anyway
              setShowDuplicateDialog(false)
            }}>
              Continue Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="text-center py-8">
        <p className="text-muted-foreground">Simplified inventory dashboard - single item uploads only</p>
        <p className="text-sm text-muted-foreground mt-2">Batch functionality removed for now</p>
      </div>
    </div>
  )
}
