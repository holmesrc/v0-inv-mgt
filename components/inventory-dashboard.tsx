"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCw, InfoIcon } from "lucide-react"
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
import ProtectedUploadButton from "./protected-upload-button"
import PendingChangesDisplay from "./pending-changes-display"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InventoryDashboard() {
  const [inventory, setInventory] = useState([])
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
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null)
  // Remove the useSession hook
  // const { data: session } = useSession()
  const [lowStockItems, setLowStockItems] = useState([])
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    pendingChanges: 0,
  })
  const [syncStatus, setSyncStatus] = useState({ syncing: false, lastSync: null })
  const [pendingChanges, setPendingChanges] = useState([])

  // Show upload screen if no inventory data
  const [showUpload, setShowUpload] = useState(false)

  // Load data from database on component mount
  useEffect(() => {
    loadInventoryFromDatabase()
    loadSettingsFromDatabase()
  }, [])

  // Function to load inventory data
  const loadInventory = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/inventory/load-from-db")
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      const data = await response.json()
      setInventory(data.items || [])

      // Calculate stats
      const lowStock = data.items.filter((item) => item.current_stock < item.min_stock && item.current_stock > 0)
      const outOfStock = data.items.filter((item) => item.current_stock <= 0)

      setStats({
        totalItems: data.items.length,
        lowStockItems: lowStock.length,
        outOfStockItems: outOfStock.length,
        pendingChanges: pendingChanges.length,
      })

      setLowStockItems(lowStock)
    } catch (err) {
      setError(err.message)
      console.error("Failed to load inventory:", err)
    } finally {
      setLoading(false)
    }
  }

  // Function to load pending changes
  const loadPendingChanges = async () => {
    try {
      const response = await fetch("/api/inventory/pending")
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      const data = await response.json()
      setPendingChanges(data.pendingChanges || [])

      // Update stats with pending changes count
      setStats((prev) => ({
        ...prev,
        pendingChanges: data.pendingChanges?.length || 0,
      }))
    } catch (err) {
      console.error("Failed to load pending changes:", err)
    }
  }

  // Function to handle manual sync
  const handleSync = async () => {
    setSyncStatus({ ...syncStatus, syncing: true })
    try {
      const response = await fetch("/api/inventory")
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      const data = await response.json()
      setSyncStatus({
        syncing: false,
        lastSync: new Date().toLocaleTimeString(),
      })
      loadInventory()
      loadPendingChanges()
    } catch (err) {
      console.error("Sync failed:", err)
      setSyncStatus({
        ...syncStatus,
        syncing: false,
      })
    }
  }

  const loadInventoryFromDatabase = async () => {
    try {
      setLoading(true)

      // First try to load from localStorage as a quick fallback
      const localData = localStorage.getItem("inventory")
      let localInventory = null
      if (localData) {
        try {
          localInventory = JSON.parse(localData)
        } catch (e) {
          console.error("Error parsing local inventory data:", e)
        }
      }

      // Check if Supabase is configured by making a simple request
      const configCheck = await fetch("/api/debug/supabase", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      })

      const configResult = await configCheck.json()
      const isSupabaseConfigured = configResult.status === "success"
      setSupabaseConfigured(isSupabaseConfigured)

      if (!isSupabaseConfigured) {
        console.log("Supabase not configured, using localStorage data")
        if (localInventory) {
          setInventory(localInventory)
          const localNote = localStorage.getItem("packageNote")
          if (localNote) setPackageNote(localNote)
          setShowUpload(false)
        } else {
          setShowUpload(true)
        }
        return
      }

      // If Supabase is configured, try to load directly from database first
      console.log("🔍 Loading inventory directly from database...")
      try {
        const dbResponse = await fetch("/api/inventory/load-from-db", {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        })

        if (dbResponse.ok) {
          const dbResult = await dbResponse.json()

          if (dbResult.success && dbResult.data.length > 0) {
            console.log(`✅ Loaded ${dbResult.data.length} items from database`)
            setInventory(dbResult.data)
            setPackageNote(dbResult.packageNote || "")
            setShowUpload(false)

            // Also save to localStorage as backup
            localStorage.setItem("inventory", JSON.stringify(dbResult.data))
            if (dbResult.packageNote) localStorage.setItem("packageNote", dbResult.packageNote)

            setError(null)
            return
          } else {
            console.log("⚠️ Database returned no items, trying Excel file fallback...")
          }
        } else {
          console.warn("⚠️ Database load failed, trying Excel file fallback...")
        }
      } catch (dbError) {
        console.error("❌ Error loading from database:", dbError)
        console.log("🔄 Falling back to Excel file method...")
      }

      // Fallback: Try to load from Excel file in storage
      try {
        const fileMetadata = await getExcelFileMetadata()

        if (fileMetadata.exists) {
          console.log("📁 Loading from Excel file in storage...")
          const result = await fetch("/api/excel", {
            method: "PUT",
            headers: { "Cache-Control": "no-cache" },
          })

          if (result.ok) {
            const data = await result.json()

            if (data.success && data.inventory.length > 0) {
              setInventory(data.inventory)
              setPackageNote(data.packageNote || "")
              setShowUpload(false)

              // Also save to localStorage as backup
              localStorage.setItem("inventory", JSON.stringify(data.inventory))
              if (data.packageNote) localStorage.setItem("packageNote", data.packageNote)

              setError(null)
              return
            }
          }
        }

        // Final fallback: Try API method
        const response = await fetch("/api/inventory", {
          headers: { "Cache-Control": "no-cache" },
        })

        if (response.ok) {
          const result = await response.json()

          if (result.success && result.data.length > 0) {
            setInventory(result.data)
            setShowUpload(false)

            // Also save to localStorage as backup
            localStorage.setItem("inventory", JSON.stringify(result.data))
          } else {
            // If API returns no data but was successful, use localStorage
            if (localInventory) {
              setInventory(localInventory)
              setShowUpload(false)
            } else {
              setShowUpload(true)
            }
          }
        } else {
          // API error, fall back to localStorage
          if (localInventory) {
            setInventory(localInventory)
            setShowUpload(false)
          } else {
            setShowUpload(true)
          }
        }
      } catch (error) {
        console.error("Error accessing storage methods:", error)
        // Fall back to localStorage on any error
        if (localInventory) {
          setInventory(localInventory)
          setShowUpload(false)
        } else {
          setShowUpload(true)
        }
      }
    } catch (error) {
      console.error("Error loading inventory:", error)
      setError(`Failed to load inventory: ${error instanceof Error ? error.message : "Unknown error"}`)

      // Final fallback - try localStorage
      const localData = localStorage.getItem("inventory")
      if (localData) {
        try {
          const parsedData = JSON.parse(localData)
          setInventory(parsedData)
          setShowUpload(false)
        } catch (e) {
          console.error("Error parsing local inventory data:", e)
          setShowUpload(true)
        }
      } else {
        setShowUpload(true)
      }
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadInventory()
    loadPendingChanges()
    // Set up interval to refresh data every 5 minutes
    const interval = setInterval(
      () => {
        loadInventory()
        loadPendingChanges()
      },
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [])

  // Update stats when pending changes update
  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      pendingChanges: pendingChanges.length,
    }))
  }, [pendingChanges])

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
      setError(null) // Clear any previous errors

      console.log("🚀 Starting inventory sync...")
      console.log("Items to sync:", inventoryData.length)

      // Validate data before sending
      const invalidItems = inventoryData.filter((item) => !item["Part number"])
      if (invalidItems.length > 0) {
        console.error("❌ Found invalid items:", invalidItems)
        throw new Error(
          `Found ${invalidItems.length} items with missing part numbers. Please fix these items before syncing.`,
        )
      }

      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          inventory: inventoryData,
          packageNote: note,
          filename,
        }),
      })

      console.log("📡 Response status:", response.status)
      console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()))

      // Get response text first to handle both JSON and non-JSON responses
      const responseText = await response.text()
      console.log("📡 Raw response:", responseText.substring(0, 500))

      if (!response.ok) {
        let errorDetails = `HTTP ${response.status}: ${response.statusText}`

        try {
          const errorData = JSON.parse(responseText)
          errorDetails = errorData.details || errorData.error || errorDetails
          console.error("❌ Detailed error:", errorData)
        } catch (parseError) {
          console.error("❌ Could not parse error response as JSON")
          errorDetails += ` - Response: ${responseText.substring(0, 200)}`
        }

        throw new Error(errorDetails)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ Could not parse success response as JSON:", parseError)
        throw new Error("Server returned invalid JSON response")
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to save inventory")
      }

      console.log("✅ Sync successful:", result)

      // Also save to localStorage as backup
      localStorage.setItem("inventory", JSON.stringify(inventoryData))
      if (note) localStorage.setItem("packageNote", note)

      // Show success message in a consistent way
      setError(null) // Clear any existing error
      alert("✅ Sync successful! All items saved to database.")

      return result
    } catch (error) {
      console.error("❌ Error saving inventory:", error)
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

    // Enhanced natural sorting for locations like H1-1, H1-2, H1-10, etc.
    return uniqueLocations.sort((a, b) => {
      // Split by common separators (-, _, space)
      const aParts = a.split(/[-_\s]+/)
      const bParts = b.split(/[-_\s]+/)

      // Compare each part
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || ""
        const bPart = bParts[i] || ""

        // Extract numeric and non-numeric portions from each part
        const aMatch = aPart.match(/^([A-Za-z]*)(\d*)(.*)$/)
        const bMatch = bPart.match(/^([A-Za-z]*)(\d*)(.*)$/)

        if (aMatch && bMatch) {
          const [, aPrefix, aNumber, aSuffix] = aMatch
          const [, bPrefix, bNumber, bSuffix] = bMatch

          // First compare the letter prefix (H1 vs H2)
          if (aPrefix !== bPrefix) {
            return aPrefix.localeCompare(bPrefix)
          }

          // Then compare the numeric part numerically (not alphabetically)
          if (aNumber && bNumber) {
            const aNum = Number.parseInt(aNumber, 10)
            const bNum = Number.parseInt(bNumber, 10)
            if (aNum !== bNum) {
              return aNum - bNum
            }
          } else if (aNumber && !bNumber) {
            return 1 // Numbers come after non-numbers
          } else if (!aNumber && bNumber) {
            return -1 // Non-numbers come before numbers
          }

          // Finally compare any suffix
          if (aSuffix !== bSuffix) {
            return aSuffix.localeCompare(bSuffix)
          }
        } else {
          // Fallback to string comparison if regex doesn't match
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
  const lowStockItemsOld = useMemo(() => {
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

  // Add new inventory item with enhanced error handling - UPDATED TO INCLUDE REQUESTER
  const addInventoryItem = async (newItem: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => {
    console.log("🚀 addInventoryItem called with:", newItem, "by", requester)

    try {
      // Generate a unique ID for the new item
      const newItemWithId: InventoryItem = {
        ...newItem,
        id: `item-${Date.now()}`,
        lastUpdated: new Date(),
      }

      // Add to local state immediately
      const updatedInventory = [...inventory, newItemWithId]
      setInventory(updatedInventory)

      // Save to database with requester info in the success message
      try {
        await saveInventoryToDatabase(updatedInventory, packageNote)
        alert(`✅ Item added successfully by ${requester}! Inventory updated.`)
      } catch (error) {
        console.error("Failed to save to database:", error)
        setError("Item added locally but failed to sync to database")
      }
    } catch (error) {
      console.error("❌ Error adding item:", error)
      setError(`Failed to add item: ${error instanceof Error ? error.message : "Unknown error"}`)
      throw error
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
    const itemToDelete = inventory.find((item) => item.id === itemId)
    if (!itemToDelete) return

    try {
      // Transform to database format for approval
      const originalData = {
        part_number: String(itemToDelete["Part number"]).trim(),
        mfg_part_number: String(itemToDelete["MFG Part number"] || "").trim(),
        qty: itemToDelete["QTY"],
        part_description: String(itemToDelete["Part description"] || "").trim(),
        supplier: String(itemToDelete.Supplier || "").trim(),
        location: String(itemToDelete.Location || "").trim(),
        package: String(itemToDelete.Package || "").trim(),
        reorder_point: itemToDelete.reorderPoint || alertSettings.defaultReorderPoint,
      }

      // Submit for approval instead of deleting directly
      const response = await fetch("/api/inventory/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType: "delete",
          originalData,
          requestedBy: "Current User",
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          alert(
            "✅ Deletion submitted for approval! An approval request has been sent to the inventory alerts channel.",
          )

          // Send Slack approval request
          await fetch("/api/slack/send-approval-request", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              changeType: "delete",
              originalData,
              requestedBy: "Current User",
              changeId: result.data.id,
            }),
          })
        } else {
          throw new Error(result.error || "Failed to submit for approval")
        }
      } else {
        throw new Error("Failed to submit change for approval")
      }
    } catch (error) {
      console.error("❌ Error submitting deletion for approval:", error)
      setError(`Failed to submit deletion for approval: ${error instanceof Error ? error.message : "Unknown error"}`)
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
    if (lowStockItemsOld.length === 0) {
      alert("No low stock items to report!")
      return
    }

    const formattedItems = lowStockItemsOld.map((item) => ({
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
    if (lowStockItemsOld.length === 0) {
      alert("No low stock items to report!")
      return
    }

    const formattedItems = lowStockItemsOld.map((item) => ({
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

  // Manual sync function with enhanced error reporting
  const handleManualSync = async () => {
    try {
      setSyncing(true)
      setError(null) // Clear any previous errors

      console.log("🚀 Starting enhanced manual sync...")

      // Step 1: Check if we have local data
      if (inventory.length === 0) {
        throw new Error("No inventory data to sync. Please upload inventory first.")
      }
      console.log(`✅ Local inventory has ${inventory.length} items`)

      // Step 2: Check Supabase configuration
      console.log("🔍 Checking Supabase configuration...")
      const configResponse = await fetch("/api/debug/supabase")
      const configResult = await configResponse.json()

      if (configResult.status !== "success") {
        throw new Error(`Supabase configuration failed: ${configResult.message}`)
      }
      console.log("✅ Supabase configuration verified")

      // Step 3: Attempt to sync inventory
      console.log("📤 Syncing inventory data...")
      const syncResult = await saveInventoryToDatabase(inventory, packageNote)
      console.log("✅ Inventory sync completed:", syncResult)

      // Step 4: Attempt to sync settings (don't fail if this fails)
      console.log("⚙️ Syncing settings...")
      try {
        await saveSettingsToDatabase(alertSettings)
        console.log("✅ Settings sync completed")
      } catch (settingsError) {
        console.warn("⚠️ Settings sync failed but continuing:", settingsError)
        // Don't throw here - settings failure shouldn't stop inventory sync
      }

      // Step 5: Verify data was saved by reading it back
      console.log("🔍 Verifying sync by reading data back...")
      const verifyResponse = await fetch("/api/inventory", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      })

      if (verifyResponse.ok) {
        const verifyResult = await verifyResponse.json()
        if (verifyResult.success && verifyResult.count > 0) {
          console.log(`✅ Verification successful: ${verifyResult.count} items in database`)
          alert(
            `✅ Sync successful!\n\n📊 Synced: ${inventory.length} inventory items\n🔍 Verified: ${verifyResult.count} items in database\n⚙️ Settings updated`,
          )
        } else {
          console.warn("⚠️ Verification inconclusive:", verifyResult)
          alert("⚠️ Sync completed but verification was inconclusive. Check the console for details.")
        }
      } else {
        console.warn("⚠️ Could not verify sync - verification request failed")
        alert("✅ Sync completed but could not verify. Data should be saved.")
      }
    } catch (error) {
      console.error("❌ Enhanced sync failed:", error)

      // Clear any success messages that might be showing
      const successElement = document.querySelector(".text-green-600")
      if (successElement) {
        successElement.remove()
      }

      // Provide specific guidance based on the error
      let userMessage = "❌ Sync failed:\n\n"
      let technicalDetails = ""

      if (error instanceof Error) {
        userMessage += error.message
        technicalDetails = error.stack || ""

        // Add specific guidance for common issues
        if (error.message.includes("Supabase")) {
          userMessage += "\n\n🔧 Check your Supabase environment variables in Vercel settings."
        } else if (error.message.includes("Network")) {
          userMessage += "\n\n🌐 Check your internet connection and try again."
        } else if (error.message.includes("No inventory")) {
          userMessage += "\n\n📁 Upload an Excel file first to have data to sync."
        }
      } else {
        userMessage += "Unknown error occurred"
        technicalDetails = String(error)
      }

      // Show user-friendly error
      alert(userMessage)

      // Set detailed error for the UI
      const errorMessage = error instanceof Error ? error.message : "Unknown sync error"
      setError(`Sync failed: ${errorMessage}. Check browser console for details.`)

      // Log detailed information for debugging
      console.error("📋 Sync Error Details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: technicalDetails,
        inventoryCount: inventory.length,
        packageNote: packageNote ? "present" : "empty",
        timestamp: new Date().toISOString(),
      })
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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Inventory Management Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.lowStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.outOfStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.pendingChanges}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status and Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {syncStatus.lastSync && <span className="text-sm text-gray-500">Last synced: {syncStatus.lastSync}</span>}
        </div>
        <Button onClick={handleSync} disabled={syncStatus.syncing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${syncStatus.syncing ? "animate-spin" : ""}`} />
          {syncStatus.syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="inventory">
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="add-item">Add Item</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Changes
            {stats.pendingChanges > 0 && (
              <span className="ml-2 bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs">
                {stats.pendingChanges}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Full Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading inventory data...</p>
              ) : error ? (
                <Alert variant="destructive">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>Failed to load inventory data. {error}</AlertDescription>
                </Alert>
              ) : inventory.length === 0 ? (
                <p>No inventory items found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Part Number</th>
                        <th className="border p-2 text-left">Description</th>
                        <th className="border p-2 text-left">Location</th>
                        <th className="border p-2 text-left">Current Stock</th>
                        <th className="border p-2 text-left">Min Stock</th>
                        <th className="border p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border p-2">{item.part_number}</td>
                          <td className="border p-2">{item.description}</td>
                          <td className="border p-2">{item.location}</td>
                          <td className="border p-2">{item.current_stock}</td>
                          <td className="border p-2">{item.min_stock}</td>
                          <td className="border p-2">
                            {item.current_stock <= 0 ? (
                              <span className="text-red-500 font-medium">Out of Stock</span>
                            ) : item.current_stock < item.min_stock ? (
                              <span className="text-amber-500 font-medium">Low Stock</span>
                            ) : (
                              <span className="text-green-500 font-medium">In Stock</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading low stock data...</p>
              ) : error ? (
                <Alert variant="destructive">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>Failed to load low stock data. {error}</AlertDescription>
                </Alert>
              ) : lowStockItems.length === 0 ? (
                <p>No low stock items found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Part Number</th>
                        <th className="border p-2 text-left">Description</th>
                        <th className="border p-2 text-left">Location</th>
                        <th className="border p-2 text-left">Current Stock</th>
                        <th className="border p-2 text-left">Min Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border p-2">{item.part_number}</td>
                          <td className="border p-2">{item.description}</td>
                          <td className="border p-2">{item.location}</td>
                          <td className="border p-2 font-medium text-amber-500">{item.current_stock}</td>
                          <td className="border p-2">{item.min_stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Item Tab */}
        <TabsContent value="add-item">
          <Card>
            <CardHeader>
              <CardTitle>Add New Inventory Item</CardTitle>
            </CardHeader>
            <CardContent>
              <AddInventoryItem
                onAddItem={addInventoryItem}
                packageTypes={packageTypes}
                suppliers={suppliers}
                locations={uniqueLocations}
                defaultReorderPoint={alertSettings.defaultReorderPoint}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Changes Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <PendingChangesDisplay
                pendingChanges={pendingChanges}
                onChangesUpdated={() => {
                  loadPendingChanges()
                  loadInventory()
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Inventory Data</CardTitle>
            </CardHeader>
            <CardContent>
              <ProtectedUploadButton
                onUploadComplete={() => {
                  loadInventory()
                  loadPendingChanges()
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
