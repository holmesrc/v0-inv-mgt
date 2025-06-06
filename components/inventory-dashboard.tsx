"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertTriangle,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Bell,
  Upload,
  Info,
  List,
  Download,
  RefreshCw,
  Database,
} from "lucide-react"
import type { InventoryItem, PurchaseRequest, AlertSettings } from "@/types/inventory"
import {
  sendSlackMessage,
  formatPurchaseRequest,
  sendInteractiveLowStockAlert,
  sendInteractiveFullLowStockAlert,
  createLowStockAlertMessage,
  createFullLowStockMessage,
} from "@/lib/slack"
import { downloadExcelFile } from "@/lib/excel-generator"
import FileUpload from "./file-upload"
import AddInventoryItem from "./add-inventory-item"
import { getExcelFileMetadata } from "@/lib/storage"
import ExcelFileInfo from "./excel-file-info"

export default function InventoryDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [packageNote, setPackageNote] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    enabled: true,
    dayOfWeek: 1, // Monday
    time: "09:00",
    defaultReorderPoint: 10,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null)

  // Show upload screen if no inventory data
  const [showUpload, setShowUpload] = useState(false)

  // Load data from database on component mount
  useEffect(() => {
    loadInventoryFromDatabase()
    loadSettingsFromDatabase()
  }, [])

  const loadInventoryFromDatabase = async () => {
    try {
      setLoading(true)

      // Check if Excel file exists in storage
      const fileMetadata = await getExcelFileMetadata()

      if (fileMetadata.exists) {
        // Read directly from the Excel file in storage
        const result = await fetch("/api/excel", { method: "PUT" })

        if (!result.ok) {
          throw new Error(`HTTP ${result.status}: ${result.statusText}`)
        }

        const data = await result.json()

        if (data.success && data.inventory.length > 0) {
          setInventory(data.inventory)
          setPackageNote(data.packageNote || "")
          setShowUpload(false)
          setSupabaseConfigured(true)

          // Also save to localStorage as backup
          localStorage.setItem("inventory", JSON.stringify(data.inventory))
          if (data.packageNote) localStorage.setItem("packageNote", data.packageNote)

          setError(null)
          return
        }
      }

      // If no Excel file or error reading it, try API fallback
      const response = await fetch("/api/inventory")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && result.data.length > 0) {
        setInventory(result.data)
        setShowUpload(false)
        setSupabaseConfigured(true)

        // Also save to localStorage as backup
        localStorage.setItem("inventory", JSON.stringify(result.data))
      } else if (result.configured === false) {
        // Supabase not configured
        setSupabaseConfigured(false)
        // Try to load from localStorage as fallback
        const localData = localStorage.getItem("inventory")
        if (localData) {
          const parsedData = JSON.parse(localData)
          setInventory(parsedData)
          setShowUpload(false)
        } else {
          setShowUpload(true)
        }
      } else {
        // Try to load from localStorage as fallback
        const localData = localStorage.getItem("inventory")
        if (localData) {
          const parsedData = JSON.parse(localData)
          setInventory(parsedData)
          setShowUpload(false)
          setSupabaseConfigured(true)
        } else {
          setShowUpload(true)
        }
      }
    } catch (error) {
      console.error("Error loading inventory:", error)
      setError(`Failed to load inventory: ${error instanceof Error ? error.message : "Unknown error"}`)
      setSupabaseConfigured(false)

      // Try localStorage fallback
      const localData = localStorage.getItem("inventory")
      if (localData) {
        const parsedData = JSON.parse(localData)
        setInventory(parsedData)
        setShowUpload(false)
      } else {
        setShowUpload(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadSettingsFromDatabase = async () => {
    try {
      const response = await fetch("/api/settings")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response")
      }

      const result = await response.json()

      if (result.success && result.data.alert_settings) {
        setAlertSettings(result.data.alert_settings)
        localStorage.setItem("alertSettings", JSON.stringify(result.data.alert_settings))
        setSupabaseConfigured(true)
      } else if (result.configured === false) {
        // Supabase not configured, use defaults
        setSupabaseConfigured(false)
        const localSettings = localStorage.getItem("alertSettings")
        if (localSettings) {
          setAlertSettings(JSON.parse(localSettings))
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error)
      setSupabaseConfigured(false)

      // Use localStorage fallback
      const localSettings = localStorage.getItem("alertSettings")
      if (localSettings) {
        try {
          setAlertSettings(JSON.parse(localSettings))
        } catch (parseError) {
          console.error("Error parsing local settings:", parseError)
          // Use default settings if localStorage is corrupted
        }
      }
    }
  }

  const saveInventoryToDatabase = async (inventoryData: InventoryItem[], note = "", filename = "") => {
    try {
      setSyncing(true)
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory: inventoryData,
          packageNote: note,
          filename,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to save inventory")
      }

      // Also save to localStorage as backup
      localStorage.setItem("inventory", JSON.stringify(inventoryData))
      if (note) localStorage.setItem("packageNote", note)

      return result
    } catch (error) {
      console.error("Error saving inventory:", error)
      // Still save to localStorage even if database fails
      localStorage.setItem("inventory", JSON.stringify(inventoryData))
      if (note) localStorage.setItem("packageNote", note)
      throw error
    } finally {
      setSyncing(false)
    }
  }

  const saveSettingsToDatabase = async (settings: AlertSettings) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "alert_settings",
          value: settings,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to save settings")
      }

      localStorage.setItem("alertSettings", JSON.stringify(settings))
    } catch (error) {
      console.error("Error saving settings:", error)
      // Still save to localStorage even if database fails
      localStorage.setItem("alertSettings", JSON.stringify(settings))
      throw error
    }
  }

  // Filter and search logic - FIXED to include Location field
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item["Part number"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["MFG Part number"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Part description"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Supplier"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Location"].toLowerCase().includes(searchTerm.toLowerCase()) || // ADDED THIS LINE
        item["Package"].toLowerCase().includes(searchTerm.toLowerCase()) // ADDED THIS LINE TOO

      const matchesCategory = categoryFilter === "all" || item["Package"] === categoryFilter

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && item["QTY"] <= (item.reorderPoint || alertSettings.defaultReorderPoint)) ||
        (stockFilter === "approaching" &&
          item["QTY"] > (item.reorderPoint || alertSettings.defaultReorderPoint) &&
          item["QTY"] <= Math.ceil((item.reorderPoint || alertSettings.defaultReorderPoint) * 1.5)) ||
        (stockFilter === "normal" &&
          item["QTY"] > Math.ceil((item.reorderPoint || alertSettings.defaultReorderPoint) * 1.5))

      return matchesSearch && matchesCategory && matchesStock
    })
  }, [inventory, searchTerm, categoryFilter, stockFilter, alertSettings.defaultReorderPoint])

  // Get unique values for dropdowns - with proper deduplication
  const packageTypes = useMemo(() => {
    const uniquePackages = Array.from(new Set(inventory.map((item) => item["Package"]).filter(Boolean)))
    return uniquePackages.sort() // Sort alphabetically for consistency
  }, [inventory])

  const suppliers = useMemo(() => {
    const uniqueSuppliers = Array.from(new Set(inventory.map((item) => item["Supplier"]).filter(Boolean)))
    return uniqueSuppliers.sort() // Sort alphabetically for consistency
  }, [inventory])

  const uniqueLocations = useMemo(() => {
    const uniqueLocations = Array.from(new Set(inventory.map((item) => item["Location"]).filter(Boolean)))

    // Improved natural sorting for locations like H2-1, H2-2, H2-10, etc.
    return uniqueLocations.sort((a, b) => {
      // Split by common separators (-, _, space)
      const aParts = a.split(/[-_\s]+/)
      const bParts = b.split(/[-_\s]+/)

      // Compare each part
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || ""
        const bPart = bParts[i] || ""

        // If both parts are numbers, compare numerically
        const aNum = Number.parseInt(aPart, 10)
        const bNum = Number.parseInt(bPart, 10)

        if (!isNaN(aNum) && !isNaN(bNum)) {
          if (aNum !== bNum) {
            return aNum - bNum
          }
        } else {
          // Compare as strings (case insensitive)
          const comparison = aPart.toLowerCase().localeCompare(bPart.toLowerCase())
          if (comparison !== 0) {
            return comparison
          }
        }
      }

      return 0
    })
  }, [inventory])

  // Get low stock items
  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => item["QTY"] <= (item.reorderPoint || alertSettings.defaultReorderPoint))
  }, [inventory, alertSettings.defaultReorderPoint])

  // Get approaching low stock items
  const approachingLowStockItems = useMemo(() => {
    return inventory.filter((item) => {
      const reorderPoint = item.reorderPoint || alertSettings.defaultReorderPoint
      const approachingThreshold = Math.ceil(reorderPoint * 1.5)
      return item["QTY"] > reorderPoint && item["QTY"] <= approachingThreshold
    })
  }, [inventory, alertSettings.defaultReorderPoint])

  // Determine stock status
  const getStockStatus = (item: InventoryItem) => {
    const reorderPoint = item.reorderPoint || alertSettings.defaultReorderPoint
    const approachingThreshold = Math.ceil(reorderPoint * 1.5) // 50% above reorder point

    if (item["QTY"] <= reorderPoint) {
      return { status: "low", label: "Low Stock", variant: "destructive" as const }
    } else if (item["QTY"] <= approachingThreshold) {
      return { status: "approaching", label: "Approaching Low", variant: "secondary" as const }
    } else {
      return { status: "normal", label: "Normal", variant: "outline" as const }
    }
  }

  // Add new inventory item
  const addInventoryItem = async (newItem: Omit<InventoryItem, "id" | "lastUpdated">) => {
    const item: InventoryItem = {
      ...newItem,
      id: `item-${Date.now()}`,
      lastUpdated: new Date(),
    }
    const updatedInventory = [...inventory, item]
    setInventory(updatedInventory)

    try {
      await saveInventoryToDatabase(updatedInventory, packageNote)
    } catch (error) {
      console.error("Failed to save new item to database:", error)
      // Item is still added locally, just show a warning
      setError("Item added locally but failed to sync to database")
    }
  }

  // Update reorder point
  const updateReorderPoint = async (itemId: string, newReorderPoint: number) => {
    const updatedInventory = inventory.map((item) =>
      item.id === itemId ? { ...item, reorderPoint: newReorderPoint } : item,
    )
    setInventory(updatedInventory)

    try {
      await saveInventoryToDatabase(updatedInventory, packageNote)
    } catch (error) {
      console.error("Failed to save reorder point to database:", error)
      setError("Update saved locally but failed to sync to database")
    }
  }

  // Update inventory item quantity
  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    const updatedInventory = inventory.map((item) =>
      item.id === itemId ? { ...item, QTY: newQuantity, lastUpdated: new Date() } : item,
    )
    setInventory(updatedInventory)

    try {
      await saveInventoryToDatabase(updatedInventory, packageNote)
    } catch (error) {
      console.error("Failed to save quantity to database:", error)
      setError("Update saved locally but failed to sync to database")
    }
  }

  // Delete inventory item
  const deleteInventoryItem = async (itemId: string) => {
    const updatedInventory = inventory.filter((item) => item.id !== itemId)
    setInventory(updatedInventory)

    try {
      await saveInventoryToDatabase(updatedInventory, packageNote)
    } catch (error) {
      console.error("Failed to delete item from database:", error)
      setError("Item deleted locally but failed to sync to database")
    }
  }

  // Download Excel file
  const handleDownloadExcel = () => {
    downloadExcelFile(inventory, packageNote, "inventory_updated")
  }

  // Create purchase request
  const createPurchaseRequest = async (
    item: InventoryItem,
    quantity: number,
    urgency: "low" | "medium" | "high",
    requester = "System User",
  ) => {
    const request: PurchaseRequest = {
      id: Date.now().toString(),
      partNumber: item["Part number"],
      description: item["Part description"],
      quantity,
      urgency,
      requestedBy: requester || "System User", // Use the provided requester
      requestDate: new Date(),
      status: "pending",
    }

    setPurchaseRequests((prev) => [...prev, request])

    // Send to Slack
    try {
      await sendSlackMessage(formatPurchaseRequest(request))
    } catch (error) {
      console.error("Failed to send purchase request to Slack:", error)
    }
  }

  // Send low stock alert
  const sendLowStockAlert = async () => {
    if (lowStockItems.length === 0) {
      alert("No low stock items to report!")
      return
    }

    const formattedItems = lowStockItems.map((item) => ({
      partNumber: item["Part number"],
      description: item["Part description"],
      supplier: item["Supplier"],
      location: item["Location"],
      currentStock: item["QTY"],
      reorderPoint: item.reorderPoint || alertSettings.defaultReorderPoint,
    }))

    console.log("Sending low stock alert with items:", formattedItems)

    try {
      // Always try interactive message first
      const result = await sendInteractiveLowStockAlert(formattedItems)
      console.log("Low stock alert result:", result)
      alert(
        `Low stock alert sent successfully! Showing ${Math.min(3, formattedItems.length)} items with "Show All" button for ${formattedItems.length} total items.`,
      )
    } catch (error) {
      console.error("Failed to send interactive low stock alert:", error)
      try {
        // Fall back to text message
        const message = createLowStockAlertMessage(formattedItems)
        await sendSlackMessage(message)
        alert("Low stock alert sent as text message (interactive features unavailable)")
      } catch (fallbackError) {
        console.error("Failed to send fallback text message:", fallbackError)
        alert("Failed to send Slack alert. Please check your Slack webhook configuration.")
      }
    }
  }

  // Send full low stock alert
  const sendFullAlert = async () => {
    if (lowStockItems.length === 0) {
      alert("No low stock items to report!")
      return
    }

    const formattedItems = lowStockItems.map((item) => ({
      partNumber: item["Part number"],
      description: item["Part description"],
      supplier: item["Supplier"],
      location: item["Location"],
      currentStock: item["QTY"],
      reorderPoint: item.reorderPoint || alertSettings.defaultReorderPoint,
    }))

    console.log("Sending full alert with items:", formattedItems)

    try {
      const result = await sendInteractiveFullLowStockAlert(formattedItems)
      console.log("Full alert result:", result)
      alert(
        `Full low stock alert sent successfully! Showing all ${formattedItems.length} items with individual reorder buttons.`,
      )
    } catch (error) {
      console.error("Failed to send interactive full alert:", error)
      try {
        // Fall back to text message
        const message = createFullLowStockMessage(formattedItems)
        await sendSlackMessage(message)
        alert("Full alert sent as text message (interactive features unavailable)")
      } catch (fallbackError) {
        console.error("Failed to send fallback text message:", fallbackError)
        alert("Failed to send full Slack alert. Please check your Slack webhook configuration.")
      }
    }
  }

  // Handle data loading
  const handleDataLoaded = async (data: any[], note: string) => {
    const transformedData: InventoryItem[] = data.map((row, index) => ({
      id: `item-${index + 1}`,
      "Part number": row["Part number"] || "",
      "MFG Part number": row["MFG Part number"] || "",
      QTY: Number(row["QTY"]) || 0,
      "Part description": row["Part description"] || "",
      Supplier: row["Supplier"] || "",
      Location: row["Location"] || "",
      Package: row["Package"] || "",
      lastUpdated: new Date(),
      reorderPoint: alertSettings.defaultReorderPoint,
    }))

    setInventory(transformedData)
    setPackageNote(note)
    setShowUpload(false)

    // Save to database
    try {
      await saveInventoryToDatabase(transformedData, note, "inventory.xlsx")
      alert(`Inventory uploaded and saved! ${transformedData.length} items stored permanently.`)
    } catch (error) {
      console.error("Failed to save to database:", error)
      alert("Inventory uploaded locally but failed to save to database. Data will be lost on refresh.")
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

  // Manual sync function
  const handleManualSync = async () => {
    try {
      setSyncing(true)
      setError(null) // Clear any previous errors

      console.log("Starting manual sync...")
      await saveInventoryToDatabase(inventory, packageNote)
      await saveSettingsToDatabase(alertSettings)

      console.log("Manual sync completed successfully")
      alert("Data synced successfully!")
    } catch (error) {
      console.error("Sync failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown sync error"
      setError(`Failed to sync data to database: ${errorMessage}`)
      alert(`Sync failed: ${errorMessage}`)
    } finally {
      setSyncing(false)
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
          <AddInventoryItem
            onAddItem={addInventoryItem}
            packageTypes={packageTypes}
            suppliers={suppliers}
            locations={uniqueLocations} // Updated here
            defaultReorderPoint={alertSettings.defaultReorderPoint}
          />
          <Button onClick={handleDownloadExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
          <Button onClick={() => setShowUpload(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload New File
          </Button>
          <Button onClick={handleManualSync} variant="outline" disabled={syncing}>
            {syncing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            {syncing ? "Syncing..." : "Sync to Database"}
          </Button>
          <Button onClick={sendLowStockAlert} variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Send Alert Now
          </Button>
          {lowStockItems.length > 3 && (
            <Button onClick={sendFullAlert} variant="outline">
              <List className="w-4 h-4 mr-2" />
              Send Full Alert
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alert Settings</DialogTitle>
                <DialogDescription>Configure your weekly low stock alerts</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={alertSettings.enabled}
                    onChange={(e) => handleSettingsUpdate({ ...alertSettings, enabled: e.target.checked })}
                  />
                  <Label>Enable weekly alerts</Label>
                </div>
                <div>
                  <Label>Day of week</Label>
                  <Select
                    value={alertSettings.dayOfWeek.toString()}
                    onValueChange={(value) =>
                      handleSettingsUpdate({ ...alertSettings, dayOfWeek: Number.parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={alertSettings.time}
                    onChange={(e) => handleSettingsUpdate({ ...alertSettings, time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Default reorder point</Label>
                  <Input
                    type="number"
                    value={alertSettings.defaultReorderPoint}
                    onChange={(e) =>
                      handleSettingsUpdate({
                        ...alertSettings,
                        defaultReorderPoint: Number.parseInt(e.target.value),
                      })
                    }
                  />
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <p className="font-medium mb-2">Stock Status Levels:</p>
                    <ul className="space-y-1 text-xs">
                      <li>
                        <strong>Low Stock:</strong> ≤ {alertSettings.defaultReorderPoint} units
                      </li>
                      <li>
                        <strong>Approaching Low:</strong> {alertSettings.defaultReorderPoint + 1} -{" "}
                        {Math.ceil(alertSettings.defaultReorderPoint * 1.5)} units
                      </li>
                      <li>
                        <strong>Normal:</strong> &gt; {Math.ceil(alertSettings.defaultReorderPoint * 1.5)} units
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Excel File Information */}
      <ExcelFileInfo onUploadNew={() => setShowUpload(true)} />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Database Status */}
      {supabaseConfigured === true && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Database className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800 mb-1">Persistent Storage Active</h3>
                <p className="text-sm text-blue-700">
                  Your inventory data is automatically saved to the database. Changes are synced in real-time, and your
                  data will persist across sessions and devices.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supabase Not Configured Warning */}
      {supabaseConfigured === false && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-800 mb-1">Database Not Available</h3>
                <p className="text-sm text-orange-700">
                  Supabase database connection failed. Your data is being stored locally in your browser only. Please
                  check your environment variables and database setup.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards with Definitions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All inventory items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ≤ {alertSettings.defaultReorderPoint} units (at or below reorder point)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Stock Status Definitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Badge variant="destructive" className="mt-1">
                  Low Stock
                </Badge>
                <div>
                  <p className="font-medium text-sm">≤ {alertSettings.defaultReorderPoint} units</p>
                  <p className="text-xs text-muted-foreground">
                    At or below the reorder point. Immediate action required.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">
                  Approaching Low
                </Badge>
                <div>
                  <p className="font-medium text-sm">
                    {alertSettings.defaultReorderPoint + 1} - {Math.ceil(alertSettings.defaultReorderPoint * 1.5)} units
                  </p>
                  <p className="text-xs text-muted-foreground">Within 50% above reorder point. Monitor closely.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">
                  Normal
                </Badge>
                <div>
                  <p className="font-medium text-sm">
                    {">"} {Math.ceil(alertSettings.defaultReorderPoint * 1.5)} units
                  </p>
                  <p className="text-xs text-muted-foreground">More than 50% above reorder point. Adequate stock.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> These calculations are based on your default reorder point of{" "}
                {alertSettings.defaultReorderPoint} units. Individual items may have custom reorder points that override
                this default.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Search across part numbers, descriptions, suppliers, locations, and package types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by part number, description, supplier, location, or package type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Package Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Packages</SelectItem>
                {packageTypes.map((packageType) => (
                  <SelectItem key={packageType} value={packageType}>
                    {packageType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stock Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="approaching">Approaching Low</SelectItem>
                <SelectItem value="normal">Normal Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            Showing {filteredInventory.length} of {inventory.length} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Number</TableHead>
                <TableHead>MFG Part Number</TableHead>
                <TableHead>QTY</TableHead>
                <TableHead>Part Description</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item["Part number"]}</TableCell>
                  <TableCell>{item["MFG Part number"]}</TableCell>
                  <TableCell>{item["QTY"]}</TableCell>
                  <TableCell>{item["Part description"]}</TableCell>
                  <TableCell>{item["Supplier"]}</TableCell>
                  <TableCell>{item["Location"]}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item["Package"]}</Badge>
                  </TableCell>
                  <TableCell>{item.reorderPoint || alertSettings.defaultReorderPoint}</TableCell>
                  <TableCell>
                    {(() => {
                      const stockStatus = getStockStatus(item)
                      const reorderPoint = item.reorderPoint || alertSettings.defaultReorderPoint
                      const currentQty = item["QTY"]

                      return (
                        <div className="space-y-1">
                          <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {currentQty} / {reorderPoint} units
                          </div>
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Item</DialogTitle>
                            <DialogDescription>Update {item["Part number"]} details</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                defaultValue={item["QTY"]}
                                onChange={(e) => {
                                  const newValue = Number.parseInt(e.target.value)
                                  if (!isNaN(newValue)) {
                                    updateItemQuantity(item.id, newValue)
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <Label>Reorder Point</Label>
                              <Input
                                type="number"
                                defaultValue={item.reorderPoint || alertSettings.defaultReorderPoint}
                                onChange={(e) => {
                                  const newValue = Number.parseInt(e.target.value)
                                  if (!isNaN(newValue)) {
                                    updateReorderPoint(item.id, newValue)
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this item?")) {
                                  deleteInventoryItem(item.id)
                                }
                              }}
                            >
                              Delete Item
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Purchase Request</DialogTitle>
                            <DialogDescription>Request more stock for {item["Part number"]}</DialogDescription>
                          </DialogHeader>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              const formData = new FormData(e.currentTarget)
                              const quantity = Number.parseInt(formData.get("quantity") as string)
                              const urgency = formData.get("urgency") as "low" | "medium" | "high"
                              const requester = formData.get("requester") as string
                              createPurchaseRequest(item, quantity, urgency, requester)
                            }}
                          >
                            <div className="space-y-4">
                              <div>
                                <Label>Quantity</Label>
                                <Input name="quantity" type="number" required />
                              </div>
                              <div>
                                <Label>Urgency</Label>
                                <Select name="urgency" required>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Requested By</Label>
                                <Input name="requester" placeholder="Your name or department" />
                              </div>
                            </div>
                            <DialogFooter className="mt-4">
                              <Button type="submit">Create Request</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
