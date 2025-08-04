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
  const [showSettings, setShowSettings] = useState(false)
  const [customQuantityInput, setCustomQuantityInput] = useState<Record<string, string>>({})
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({})

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

  const handleManualSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      
      if (inventory.length === 0) {
        throw new Error("No inventory data to sync. Please upload inventory first.")
      }

      await saveInventoryToDatabase(inventory, "Manual sync from dashboard")
      alert("✅ Sync completed successfully!")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown sync error"
      console.error("❌ Sync failed:", errorMessage)
      setError(`Sync failed: ${errorMessage}`)
      alert(`❌ Sync failed: ${errorMessage}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleDownloadExcel = () => {
    const csvContent = [
      ["Part Number", "MFG Part Number", "Description", "Quantity", "Location", "Supplier", "Package", "Reorder Point"],
      ...inventory.map(item => [
        item["Part number"],
        item["MFG Part number"] || "",
        item["Part description"],
        item.QTY,
        item.Location,
        item.Supplier,
        item.Package,
        item.reorderPoint || alertSettings.defaultReorderPoint
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const sendLowStockAlert = async () => {
    try {
      const response = await fetch("/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "low_stock",
          items: lowStockItems
        })
      })

      if (response.ok) {
        alert("✅ Low stock alert sent successfully!")
      } else {
        throw new Error("Failed to send alert")
      }
    } catch (error) {
      console.error("Failed to send low stock alert:", error)
      alert("❌ Failed to send low stock alert")
    }
  }

  const sendFullAlert = async () => {
    try {
      const response = await fetch("/api/slack/send-full-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory: inventory,
          lowStockItems: lowStockItems
        })
      })

      if (response.ok) {
        alert("✅ Full inventory alert sent successfully!")
      } else {
        throw new Error("Failed to send full alert")
      }
    } catch (error) {
      console.error("Failed to send full alert:", error)
      alert("❌ Failed to send full inventory alert")
    }
  }

  const handleCustomQuantityChange = (itemId: string, customAmount: string) => {
    const amount = parseInt(customAmount)
    if (!isNaN(amount) && amount !== 0) {
      setTempQuantityChanges(prev => ({
        ...prev,
        [itemId]: amount
      }))
      setShowCustomInput(prev => ({
        ...prev,
        [itemId]: false
      }))
      setCustomQuantityInput(prev => ({
        ...prev,
        [itemId]: ""
      }))
    }
  }

  const updateReorderPoint = async (itemId: string, newReorderPoint: number, requester: string) => {
    try {
      const response = await fetch("/api/inventory/update-reorder-point", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId,
          newReorderPoint,
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
      console.error("Update reorder point failed:", error)
      throw error
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
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setAddItemDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
          <Button variant="outline" onClick={handleDownloadExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          <Button variant="outline" onClick={() => setShowUpload(true)} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload New File
          </Button>
          <Button 
            variant="outline" 
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync to Database'}
          </Button>
          <Button variant="outline" onClick={sendLowStockAlert} className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Send Alert Now
          </Button>
          <Button variant="outline" onClick={sendFullAlert} className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Send Full Alert
          </Button>
          <Button variant="outline" onClick={() => setShowPendingChanges(true)}>
            Pending Changes ({pendingChanges.length})
          </Button>
          <Button variant="outline" onClick={() => window.open('/low-stock', '_blank')}>
            Low Stock Page
          </Button>
          <Button variant="outline" onClick={() => window.open('/reorder-status', '_blank')}>
            Reorder Status
          </Button>
          <Button variant="outline" onClick={() => window.open('/endpoints', '_blank')}>
            All Endpoints
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
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
                        <div className="flex gap-1 flex-wrap">
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
                                onClick={() => handleTempQuantityChange(item.id, -99)}
                                className="h-6 px-1 text-xs"
                              >
                                -99
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTempQuantityChange(item.id, 99)}
                                className="h-6 px-1 text-xs"
                              >
                                +99
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTempQuantityChange(item.id, 1)}
                                className="h-6 px-2"
                              >
                                +
                              </Button>
                              {showCustomInput[item.id] ? (
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    placeholder="±"
                                    value={customQuantityInput[item.id] || ""}
                                    onChange={(e) => setCustomQuantityInput(prev => ({
                                      ...prev,
                                      [item.id]: e.target.value
                                    }))}
                                    className="h-6 w-16 px-1 text-xs"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleCustomQuantityChange(item.id, customQuantityInput[item.id] || "")
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleCustomQuantityChange(item.id, customQuantityInput[item.id] || "")}
                                    className="h-6 px-1"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowCustomInput(prev => ({
                                    ...prev,
                                    [item.id]: true
                                  }))}
                                  className="h-6 px-1 text-xs"
                                >
                                  Custom
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditDialogOpen(prev => ({
                                  ...prev,
                                  [item.id]: true
                                }))}
                                className="h-6 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const requesterName = prompt("Enter your name for reorder request:")
                                  if (requesterName) {
                                    // Handle reorder request
                                    fetch("/api/reorder-requests", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        item: item,
                                        requester: requesterName
                                      })
                                    }).then(() => {
                                      alert("Reorder request submitted!")
                                    }).catch(() => {
                                      alert("Failed to submit reorder request")
                                    })
                                  }
                                }}
                                className="h-6 px-1 text-xs"
                              >
                                Reorder
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

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure inventory alert settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="default-reorder-point">Default Reorder Point</Label>
              <Input
                id="default-reorder-point"
                type="number"
                value={alertSettings.defaultReorderPoint}
                onChange={(e) => setAlertSettings(prev => ({
                  ...prev,
                  defaultReorderPoint: parseInt(e.target.value) || 10
                }))}
              />
            </div>
            <div>
              <Label htmlFor="low-stock-threshold">Low Stock Threshold</Label>
              <Input
                id="low-stock-threshold"
                type="number"
                value={alertSettings.lowStockThreshold}
                onChange={(e) => setAlertSettings(prev => ({
                  ...prev,
                  lowStockThreshold: parseInt(e.target.value) || 5
                }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="slack-notifications"
                checked={alertSettings.enableSlackNotifications}
                onCheckedChange={(checked) => setAlertSettings(prev => ({
                  ...prev,
                  enableSlackNotifications: checked
                }))}
              />
              <Label htmlFor="slack-notifications">Enable Slack Notifications</Label>
            </div>
            {alertSettings.enableSlackNotifications && (
              <div>
                <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                <Input
                  id="slack-webhook"
                  type="url"
                  value={alertSettings.slackWebhookUrl}
                  onChange={(e) => setAlertSettings(prev => ({
                    ...prev,
                    slackWebhookUrl: e.target.value
                  }))}
                  placeholder="https://hooks.slack.com/..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleSettingsUpdate(alertSettings)
              setShowSettings(false)
            }}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialogs */}
      {inventory.map((item) => (
        <Dialog 
          key={`edit-${item.id}`}
          open={editDialogOpen[item.id] || false} 
          onOpenChange={(open) => setEditDialogOpen(prev => ({
            ...prev,
            [item.id]: open
          }))}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Edit {item["Part number"]} - {item["Part description"]}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Part Number</Label>
                <Input value={item["Part number"]} disabled />
              </div>
              <div>
                <Label>Current Quantity</Label>
                <Input value={item.QTY} disabled />
              </div>
              <div>
                <Label>Reorder Point</Label>
                <Input
                  type="number"
                  defaultValue={item.reorderPoint || alertSettings.defaultReorderPoint}
                  onBlur={(e) => {
                    const newReorderPoint = parseInt(e.target.value)
                    if (!isNaN(newReorderPoint)) {
                      const requesterName = prompt("Enter your name for approval tracking:")
                      if (requesterName) {
                        updateReorderPoint(item.id, newReorderPoint, requesterName)
                          .then(() => {
                            alert("Reorder point update submitted for approval!")
                            setEditDialogOpen(prev => ({
                              ...prev,
                              [item.id]: false
                            }))
                          })
                          .catch(() => alert("Failed to update reorder point"))
                      }
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(prev => ({
                ...prev,
                [item.id]: false
              }))}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}

      {/* Pending Changes Dialog */}
      <Dialog open={showPendingChanges} onOpenChange={setShowPendingChanges}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pending Changes</DialogTitle>
            <DialogDescription>
              Review and manage pending inventory changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pendingChanges.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending changes</p>
            ) : (
              <div className="space-y-2">
                {pendingChanges.map((change) => (
                  <Card key={change.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{change.change_type}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested by: {change.requester}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(change.timestamp).toLocaleString()}
                        </p>
                        {change.item_data && (
                          <div className="mt-2 text-sm">
                            <p><strong>Part:</strong> {change.item_data.part_number}</p>
                            <p><strong>Description:</strong> {change.item_data.part_description}</p>
                            {change.item_data.quantity && (
                              <p><strong>Quantity:</strong> {change.item_data.quantity}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge variant={change.status === 'pending' ? 'secondary' : 'default'}>
                        {change.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPendingChanges(false)}>
              Close
            </Button>
            <Button onClick={() => window.open('/approvals', '_blank')}>
              Open Approvals Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
