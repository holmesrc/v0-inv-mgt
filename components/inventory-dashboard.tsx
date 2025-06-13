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
import ProtectedUploadButton from "./protected-upload-button"
import PendingChangesDisplay from "./pending-changes-display"

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

  // Enhance the saveSettingsToDatabase function with better error handling:

  const saveSettingsToDatabase = async (settings: AlertSettings) => {
    try {
      console.log("Saving settings to database:", settings)

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "alert_settings",
          value: settings,
        }),
      })

      const responseText = await response.text()
      let result

      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Failed to parse settings response:", parseError, "Response:", responseText)
        throw new Error(`Invalid response: ${responseText.substring(0, 100)}`)
      }

      if (!response.ok) {
        throw new Error(result.error || result.details || `HTTP ${response.status}: ${response.statusText}`)
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to save settings")
      }

      console.log("Settings saved successfully:", result)
      localStorage.setItem("alertSettings", JSON.stringify(settings))
      return result
    } catch (error) {
      console.error("Error saving settings:", error)
      // Still save to localStorage even if database fails
      localStorage.setItem("alertSettings", JSON.stringify(settings))

      // Don't throw the error during sync to prevent the entire sync from failing
      if (new Error().stack?.includes("handleManualSync")) {
        console.warn("Settings sync failed but continuing with inventory sync")
        return { success: false, localOnly: true }
      } else {
        throw error
      }
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

  // Add new inventory item with enhanced error handling
  const addInventoryItem = async (newItem: Omit<InventoryItem, "id" | "lastUpdated">) => {
    console.log("🚀 addInventoryItem called with:", newItem)

    try {
      // Transform to database format for approval
      const itemData = {
        part_number: String(newItem["Part number"]).trim(),
        mfg_part_number: String(newItem["MFG Part number"] || "").trim(),
        qty: isNaN(Number(newItem.QTY)) ? 0 : Math.max(0, Number(newItem.QTY)),
        part_description: String(newItem["Part description"] || "").trim(),
        supplier: String(newItem.Supplier || "").trim(),
        location: String(newItem.Location || "").trim(),
        package: String(newItem.Package || "").trim(),
        reorder_point: isNaN(Number(newItem.reorderPoint)) ? 10 : Math.max(0, Number(newItem.reorderPoint)),
      }

      // Submit for approval instead of adding directly
      const response = await fetch("/api/inventory/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType: "add",
          itemData,
          requestedBy: "Current User", // You can make this dynamic
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          alert("✅ Item submitted for approval! An approval request has been sent to the inventory alerts channel.")

          // Send Slack approval request
          await fetch("/api/slack/send-approval-request", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              changeType: "add",
              itemData,
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
      console.error("❌ Error submitting item for approval:", error)
      setError(`Failed to submit item for approval: ${error instanceof Error ? error.message : "Unknown error"}`)
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
          <ProtectedUploadButton onUploadAuthorized={() => setShowUpload(true)} />
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

      {/* Pending Changes Display */}
      <PendingChangesDisplay />

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
                  check your environment variables and database setup
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
          <div className="max-h-96 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
