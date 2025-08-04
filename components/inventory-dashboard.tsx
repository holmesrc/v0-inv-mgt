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
  const [editDialogOpen, setEditDialogOpen] = useState<Record<string, boolean>>({})
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [tempQuantityChanges, setTempQuantityChanges] = useState<Record<string, number>>({})

  // Form state for adding new items
  const [newItem, setNewItem] = useState({
    partNumber: "",
    mfgPartNumber: "",
    description: "",
    quantity: "",
    location: "",
    supplier: "",
    package: "",
    reorderPoint: "",
  })

  useEffect(() => {
    loadInventoryFromDatabase()
    loadSettingsFromDatabase()
    loadPendingChanges()
    checkSlackConfiguration()
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
          setInventory(result.data)
          setShowUpload(result.data.length === 0)
        } else {
          setInventory([])
          setShowUpload(true)
        }
      } else {
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

      await loadInventoryFromDatabase()
      await loadPendingChanges()
      setPackageNote("")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
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
    } catch (error) {
      console.error("Settings save failed:", error)
      throw error
    }
  }

  const addInventoryItem = async (newItemData: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => {
    try {
      const response = await fetch("/api/inventory/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item: newItemData,
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

      await loadInventoryFromDatabase()
      await loadPendingChanges()
    } catch (error) {
      console.error("Add item failed:", error)
      throw error
    }
  }

  const updateItemQuantity = async (itemId: string, newQuantity: number, requester: string) => {
    try {
      const response = await fetch("/api/inventory/update-quantity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId,
          newQuantity,
          requester,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Unknown error occurred")
      }

      await loadInventoryFromDatabase()
      await loadPendingChanges()
    } catch (error) {
      console.error("Update quantity failed:", error)
      throw error
    }
  }

  const deleteInventoryItem = async (itemId: string, requester: string) => {
    try {
      const response = await fetch("/api/inventory/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId,
          requester,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Unknown error occurred")
      }

      await loadInventoryFromDatabase()
      await loadPendingChanges()
    } catch (error) {
      console.error("Delete item failed:", error)
      throw error
    }
  }

  const handleDataLoaded = async (data: any[], note: string) => {
    try {
      await saveInventoryToDatabase(data, note, "uploaded_file")
      setShowUpload(false)
    } catch (error) {
      console.error("Error handling uploaded data:", error)
    }
  }

  const handleSettingsUpdate = async (newSettings: AlertSettings) => {
    setAlertSettings(newSettings)
    try {
      await saveSettingsToDatabase(newSettings)
    } catch (error) {
      console.error("Failed to save settings:", error)
      setError("Settings updated locally but failed to sync to database")
    }
  }

  const handleAddItem = async () => {
    try {
      const requesterName = prompt("Enter your name for approval tracking:")
      if (!requesterName) return

      const itemData = {
        "Part number": newItem.partNumber,
        "MFG Part number": newItem.mfgPartNumber || "",
        "Part description": newItem.description,
        QTY: parseInt(newItem.quantity) || 0,
        Location: newItem.location,
        Supplier: newItem.supplier,
        Package: newItem.package,
        reorderPoint: parseInt(newItem.reorderPoint) || alertSettings.defaultReorderPoint,
      }

      await addInventoryItem(itemData, requesterName)
      
      // Reset form
      setNewItem({
        partNumber: "",
        mfgPartNumber: "",
        description: "",
        quantity: "",
        location: "",
        supplier: "",
        package: "",
        reorderPoint: "",
      })
      
      setAddItemDialogOpen(false)
      alert("Item submitted for approval!")
    } catch (error) {
      console.error("Failed to add item:", error)
      alert("Failed to add item. Please try again.")
    }
  }

  const handleTempQuantityChange = (itemId: string, delta: number) => {
    setTempQuantityChanges(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + delta
    }))
  }

  const confirmQuantityChange = async (itemId: string) => {
    const delta = tempQuantityChanges[itemId]
    if (!delta) return

    try {
      const requesterName = prompt("Enter your name for approval tracking:")
      if (!requesterName) return

      const item = inventory.find(i => i.id === itemId)
      if (!item) return

      const newQuantity = item.QTY + delta
      if (newQuantity < 0) {
        alert("Quantity cannot be negative")
        return
      }

      await updateItemQuantity(itemId, newQuantity, requesterName)
      
      // Clear temp changes
      setTempQuantityChanges(prev => {
        const newChanges = { ...prev }
        delete newChanges[itemId]
        return newChanges
      })
      
      alert("Quantity change submitted for approval!")
    } catch (error) {
      console.error("Failed to update quantity:", error)
      alert("Failed to update quantity. Please try again.")
    }
  }

  const cancelTempChanges = (itemId: string) => {
    setTempQuantityChanges(prev => {
      const newChanges = { ...prev }
      delete newChanges[itemId]
      return newChanges
    })
  }

  const getDisplayQuantity = (item: InventoryItem) => {
    const tempChange = tempQuantityChanges[item.id] || 0
    return item.QTY + tempChange
  }

  const hasTempChanges = (itemId: string) => {
    return tempQuantityChanges[itemId] !== undefined && tempQuantityChanges[itemId] !== 0
  }

  const filteredInventory = useMemo(() => {
    const filtered = inventory.filter((item) => {
      const matchesSearch = 
        item["Part number"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Part description"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Supplier.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === "all" || 
        (categoryFilter === "low" && item.QTY <= (item.reorderPoint || alertSettings.defaultReorderPoint))

      return matchesSearch && matchesCategory
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case "part_number":
          aValue = a["Part number"]
          bValue = b["Part number"]
          break
        case "location":
          aValue = a.Location
          bValue = b.Location
          break
        case "quantity":
          aValue = a.QTY
          bValue = b.QTY
          break
        default:
          aValue = a["Part number"]
          bValue = b["Part number"]
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortOrder === "asc" 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })

    return filtered
  }, [inventory, searchTerm, categoryFilter, sortBy, sortOrder, alertSettings.defaultReorderPoint])

  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => 
      item.QTY <= (item.reorderPoint || alertSettings.defaultReorderPoint)
    )
  }, [inventory, alertSettings.defaultReorderPoint])

  const getStockStatus = (item: InventoryItem) => {
    const reorderPoint = item.reorderPoint || alertSettings.defaultReorderPoint
    if (item.QTY <= reorderPoint) {
      return { status: "low", color: "destructive" as const }
    } else if (item.QTY <= reorderPoint * 1.5) {
      return { status: "medium", color: "secondary" as const }
    } else {
      return { status: "good", color: "default" as const }
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
          <Button variant="outline" onClick={() => setShowPendingChanges(true)}>
            Pending Changes ({pendingChanges.length})
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingChanges.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by part number, description, location, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low">Low Stock Only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="part_number">Part Number</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="quantity">Quantity</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortOrder === "asc" ? "Ascending" : "Descending"}
        </Button>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            Showing {filteredInventory.length} of {inventory.length} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-left">Part Number</th>
                  <th className="border border-gray-300 p-2 text-left">Description</th>
                  <th className="border border-gray-300 p-2 text-left">Quantity</th>
                  <th className="border border-gray-300 p-2 text-left">Location</th>
                  <th className="border border-gray-300 p-2 text-left">Supplier</th>
                  <th className="border border-gray-300 p-2 text-left">Package</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                  <th className="border border-gray-300 p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const stockStatus = getStockStatus(item)
                  const displayQuantity = getDisplayQuantity(item)
                  const hasChanges = hasTempChanges(item.id)
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 font-mono text-sm">
                        {item["Part number"]}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {item["Part description"]}
                      </td>
                      <td className="border border-gray-300 p-2">
                        <div className="flex items-center gap-2">
                          <span className={hasChanges ? "line-through text-gray-500" : ""}>
                            {item.QTY}
                          </span>
                          {hasChanges && (
                            <span className="font-bold text-blue-600">
                              → {displayQuantity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-2">{item.Location}</td>
                      <td className="border border-gray-300 p-2">{item.Supplier}</td>
                      <td className="border border-gray-300 p-2">{item.Package}</td>
                      <td className="border border-gray-300 p-2">
                        <Badge variant={stockStatus.color}>
                          {stockStatus.status}
                        </Badge>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <div className="flex gap-1">
                          {hasChanges ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => confirmQuantityChange(item.id)}
                                className="h-6 px-2"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelTempChanges(item.id)}
                                className="h-6 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTempQuantityChange(item.id, 1)}
                                className="h-6 px-2"
                              >
                                +1
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTempQuantityChange(item.id, -1)}
                                className="h-6 px-2"
                              >
                                -1
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const requesterName = prompt("Enter your name for approval tracking:")
                                  if (requesterName) {
                                    deleteInventoryItem(item.id, requesterName)
                                      .then(() => alert("Item deletion submitted for approval!"))
                                      .catch(() => alert("Failed to delete item. Please try again."))
                                  }
                                }}
                                className="h-6 px-2"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Add a new item to the inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="part-number">Part Number *</Label>
              <Input
                id="part-number"
                value={newItem.partNumber}
                onChange={(e) => setNewItem(prev => ({ ...prev, partNumber: e.target.value }))}
                placeholder="Enter part number"
              />
            </div>
            <div>
              <Label htmlFor="mfg-part-number">MFG Part Number</Label>
              <Input
                id="mfg-part-number"
                value={newItem.mfgPartNumber}
                onChange={(e) => setNewItem(prev => ({ ...prev, mfgPartNumber: e.target.value }))}
                placeholder="Enter manufacturer part number"
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newItem.location}
                onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter location"
              />
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={newItem.supplier}
                onChange={(e) => setNewItem(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="Enter supplier"
              />
            </div>
            <div>
              <Label htmlFor="package">Package</Label>
              <Input
                id="package"
                value={newItem.package}
                onChange={(e) => setNewItem(prev => ({ ...prev, package: e.target.value }))}
                placeholder="Enter package type"
              />
            </div>
            <div>
              <Label htmlFor="reorder-point">Reorder Point</Label>
              <Input
                id="reorder-point"
                type="number"
                value={newItem.reorderPoint}
                onChange={(e) => setNewItem(prev => ({ ...prev, reorderPoint: e.target.value }))}
                placeholder={`Default: ${alertSettings.defaultReorderPoint}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddItem}
              disabled={!newItem.partNumber || !newItem.description || !newItem.quantity}
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
