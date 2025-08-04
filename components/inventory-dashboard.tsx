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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  Plus,
  FileText,
  Upload,
} from "lucide-react"
import type { InventoryItem, PurchaseRequest, AlertSettings } from "@/types/inventory"
import {
  sendSlackMessage,
  formatPurchaseRequest,
  sendInteractiveLowStockAlert,
  sendInteractiveFullLowStockAlert,
  testSlackConnection,
  createPrefillPurchaseRequestUrl,
} from "@/lib/slack"
import { downloadExcelFile } from "@/lib/excel-generator"
import FileUpload from "./file-upload"
import { getExcelFileMetadata } from "@/lib/storage"
import ProtectedUploadButton from "./protected-upload-button"
import PendingChangesDisplay from "./pending-changes-display"

export default function InventoryDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [packageNote, setPackageNote] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<keyof InventoryItem | "">("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
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
  const [slackConfigured, setSlackConfigured] = useState<boolean | null>(null)

  // Track temporary quantity changes before confirmation
  const [tempQuantityChanges, setTempQuantityChanges] = useState<Record<string, number>>({})

  // Show upload screen if no inventory data
  const [showUpload, setShowUpload] = useState(false)

  // Add this after the existing state declarations (around line 45)
  const [itemsWithPendingChanges, setItemsWithPendingChanges] = useState<Set<string>>(new Set())

  // Add this with the other state declarations
  const [editDialogOpen, setEditDialogOpen] = useState<Record<string, boolean>>({})
  const [addItemFormModified, setAddItemFormModified] = useState(false)
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [duplicatePartInfo, setDuplicatePartInfo] = useState<{
    existingItem: any
    mode: 'single' | 'batch'
    batchIndex?: number
  } | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [batchEntryItems, setBatchEntryItems] = useState<any[]>([{ 
    partNumber: '', 
    mfgPartNumber: '', 
    description: '', 
    quantity: '', 
    location: '', 
    supplier: '', 
    package: '',
    reorderPoint: alertSettings.defaultReorderPoint 
  }])

  // Debug: Log inventory changes
  useEffect(() => {
    console.log(`📊 Inventory state updated: ${inventory.length} items`) // Debug
    if (inventory.length > 0) {
      console.log("📊 Sample inventory items:", inventory.slice(0, 2)) // Debug
    }
  }, [inventory])
  useEffect(() => {
    console.log("🚀 Component mounted, starting data load...") // Debug
    loadInventoryFromDatabase()
    loadSettingsFromDatabase()
    checkSlackConfiguration()
    loadPendingChanges() // Add this line
  }, [])

  // Check Slack configuration with better error handling
  const checkSlackConfiguration = async () => {
    try {
      const result = await testSlackConnection()

      // Handle different types of configuration issues
      if (result.reason === "environment_not_configured") {
        setSlackConfigured(false)
        console.log("ℹ️ Slack not configured (normal in preview environments)")
      } else if (result.success) {
        setSlackConfigured(true)
        console.log("✅ Slack configuration verified")
      } else {
        setSlackConfigured(false)
        console.warn("⚠️ Slack configuration issue:", result.message)
      }
    } catch (error) {
      console.error("Error checking Slack configuration:", error)
      setSlackConfigured(false)
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

  // Add this function after loadSettingsFromDatabase (around line 300)
  const loadPendingChanges = async () => {
    try {
      const response = await fetch("/api/inventory/pending")
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Extract part numbers from pending changes
          const pendingPartNumbers = new Set<string>()
          result.data.forEach((change: any) => {
            if (change.status === "pending" && change.item_data?.part_number) {
              pendingPartNumbers.add(change.item_data.part_number)
            }
            if (change.status === "pending" && change.original_data?.part_number) {
              pendingPartNumbers.add(change.original_data.part_number)
            }
          })
          setItemsWithPendingChanges(pendingPartNumbers)
        }
      }
    } catch (error) {
      console.error("Error loading pending changes:", error)
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

  // Submit change for approval - UPDATED to require requester
  const submitChangeForApproval = async (
    changeType: "add" | "update" | "delete",
    itemData?: any,
    originalData?: any,
    requester?: string,
  ) => {
    try {
      // Validate requester
      if (!requester || requester.trim() === "" || requester.trim().toLowerCase() === "current user") {
        throw new Error("Please provide a valid requester name. 'Current User' is not allowed.")
      }

      const response = await fetch("/api/inventory/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType,
          itemData,
          originalData,
          requestedBy: requester.trim(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Send Slack notification (non-interactive)
          if (slackConfigured) {
            try {
              await fetch("/api/slack/send-approval-request", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  changeType,
                  itemData,
                  originalData,
                  requestedBy: requester.trim(),
                  changeId: result.data.id,
                }),
              })
            } catch (slackError) {
              console.error("Failed to send Slack notification:", slackError)
              // Don't fail the entire operation if Slack fails
            }
          }

          // Refresh pending changes list
          await loadPendingChanges()

          return result
        } else {
          throw new Error(result.error || "Failed to submit for approval")
        }
      } else {
        throw new Error("Failed to submit change for approval")
      }
    } catch (error) {
      console.error("❌ Error submitting change for approval:", error)
      throw error
    }
  }

  // Helper function to determine correct package type based on quantity
  const getCorrectPackageType = (qty: number): string => {
    if (qty >= 1 && qty <= 100) {
      return "EXACT"
    } else if (qty >= 101 && qty <= 500) {
      return "ESTIMATED"
    } else if (qty > 500) {
      return "REEL"
    }
    return "EXACT" // Default fallback
  }

  // Helper function to check if package type matches quantity
  const isPackageTypeMismatched = (item: InventoryItem): boolean => {
    const currentPackage = item.Package.toUpperCase()

    // Exclude KIT/KITS and CUSTOM packages from validation
    if (currentPackage === "KIT" || currentPackage === "KITS" || currentPackage.includes("CUSTOM")) {
      return false
    }

    const correctPackage = getCorrectPackageType(item.QTY)
    return currentPackage !== correctPackage
  }

  const filteredInventory = useMemo(() => {
    const filtered = inventory.filter((item) => {
      const matchesSearch =
        item["Part number"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["MFG Part number"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Part description"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Supplier"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Location"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Package"].toLowerCase().includes(searchTerm.toLowerCase())

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

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortColumn]
        let bValue: any = b[sortColumn]

        // Handle special cases
        if (sortColumn === "QTY" || sortColumn === "reorderPoint") {
          aValue = Number(aValue) || 0
          bValue = Number(bValue) || 0
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue
        }

        // Handle Location with improved natural sorting for hierarchical locations
        if (sortColumn === "Location") {
          const naturalLocationSort = (str1: string, str2: string) => {
            // Split by common separators (-, _, space)
            const aParts = str1.split(/[-_\s]+/)
            const bParts = str2.split(/[-_\s]+/)

            // Compare each part level by level
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
              const aPart = aParts[i] || ""
              const bPart = bParts[i] || ""

              // Extract letter and number portions from each part
              const aMatch = aPart.match(/^([A-Za-z]*)(\d*)(.*)$/)
              const bMatch = bPart.match(/^([A-Za-z]*)(\d*)(.*)$/)

              if (aMatch && bMatch) {
                const [, aPrefix, aNumber, aSuffix] = aMatch
                const [, bPrefix, bNumber, bSuffix] = bMatch

                // First compare the letter prefix (H4 vs H3)
                if (aPrefix !== bPrefix) {
                  return aPrefix.localeCompare(bPrefix)
                }

                // Then compare the numeric part numerically
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
          }

          const result = naturalLocationSort(String(aValue), String(bValue))
          return sortDirection === "asc" ? result : -result
        }

        // Handle Part number with improved numbers-first sorting
        if (sortColumn === "Part number" || sortColumn === "MFG Part number") {
          const aStr = String(aValue).trim()
          const bStr = String(bValue).trim()

          // Improved logic: Check if strings are purely numeric (including decimals and dashes)
          const aIsNumericOnly = /^[\d\-.]+$/.test(aStr) && !/[a-zA-Z]/.test(aStr)
          const bIsNumericOnly = /^[\d\-.]+$/.test(bStr) && !/[a-zA-Z]/.test(bStr)

          // Check if strings start with numbers (for mixed alphanumeric)
          const aStartsWithNumber = /^\d/.test(aStr)
          const bStartsWithNumber = /^\d/.test(bStr)

          // Priority order: 1) Pure numbers, 2) Starts with numbers, 3) Starts with letters
          const aCategory = aIsNumericOnly ? 1 : aStartsWithNumber ? 2 : 3
          const bCategory = bIsNumericOnly ? 1 : bStartsWithNumber ? 2 : 3

          // If different categories, sort by category
          if (aCategory !== bCategory) {
            const result = aCategory - bCategory
            return sortDirection === "asc" ? result : -result
          }

          // Same category - sort within category
          if (aCategory === 1) {
            // Both are pure numbers - sort numerically
            const aNum = Number.parseFloat(aStr.replace(/[^\d.-]/g, "")) || 0
            const bNum = Number.parseFloat(bStr.replace(/[^\d.-]/g, "")) || 0
            return sortDirection === "asc" ? aNum - bNum : bNum - aNum
          } else if (aCategory === 2) {
            // Both start with numbers - extract leading number for primary sort
            const aNumMatch = aStr.match(/^(\d+\.?\d*)/)
            const bNumMatch = bStr.match(/^(\d+\.?\d*)/)

            if (aNumMatch && bNumMatch) {
              const aLeadingNum = Number.parseFloat(aNumMatch[1])
              const bLeadingNum = Number.parseFloat(bNumMatch[1])

              if (aLeadingNum !== bLeadingNum) {
                return sortDirection === "asc" ? aLeadingNum - bLeadingNum : bLeadingNum - aLeadingNum
              }
            }

            // If leading numbers are same, fall back to string comparison
            const result = aStr.toLowerCase().localeCompare(bStr.toLowerCase())
            return sortDirection === "asc" ? result : -result
          } else {
            // Both start with letters - alphabetical sort
            const result = aStr.toLowerCase().localeCompare(bStr.toLowerCase())
            return sortDirection === "asc" ? result : -result
          }
        }

        // Default string sorting for other columns
        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()
        const result = aStr.localeCompare(bStr)
        return sortDirection === "asc" ? result : -result
      })
    } else {
      // Default sort by Location using improved hierarchical logic - RESPECTS SORT DIRECTION
      filtered.sort((a, b) => {
        const naturalLocationSort = (str1: string, str2: string) => {
          // Split by common separators (-, _, space)
          const aParts = str1.split(/[-_\s]+/)
          const bParts = str2.split(/[-_\s]+/)

          // Compare each part level by level
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || ""
            const bPart = bParts[i] || ""

            // Extract letter and number portions from each part
            const aMatch = aPart.match(/^([A-Za-z]*)(\d*)(.*)$/)
            const bMatch = bPart.match(/^([A-Za-z]*)(\d*)(.*)$/)

            if (aMatch && bMatch) {
              const [, aPrefix, aNumber, aSuffix] = aMatch
              const [, bPrefix, bNumber, bSuffix] = bMatch

              // First compare the letter prefix (H4 vs H3)
              if (aPrefix !== bPrefix) {
                return aPrefix.localeCompare(bPrefix)
              }

              // Then compare the numeric part numerically
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
        }

        const result = naturalLocationSort(a["Location"], b["Location"])
        return sortDirection === "asc" ? result : -result
      })
    }

    return filtered
  }, [inventory, searchTerm, categoryFilter, stockFilter, alertSettings.defaultReorderPoint, sortColumn, sortDirection])

  // Get unique values for dropdowns - with proper deduplication
  const packageTypes = useMemo(() => {
    // Get all package types from inventory
    const allPackageTypes = inventory
      .map((item) => item["Package"])
      .filter((pkg) => pkg && typeof pkg === "string" && pkg.trim().length > 0)
      .map((pkg) => pkg.trim()) // Keep original case

    // Add standard package types
    const standardPackages = ["Exact", "Estimated", "Reel", "Kit"]
    
    // Combine and deduplicate
    const combinedPackages = Array.from(new Set([...standardPackages, ...allPackageTypes]))
    
    return combinedPackages.sort()
  }, [inventory])

  // Helper function to get suggested package based on quantity
  const getSuggestedPackage = (quantity: number): string => {
    if (quantity >= 1 && quantity <= 100) {
      return "Exact"
    } else if (quantity >= 101 && quantity <= 500) {
      return "Estimated"
    } else if (quantity > 500) {
      return "Reel"
    }
    return "Exact" // Default
  }

  const suppliers = useMemo(() => {
    const uniqueSuppliers = Array.from(new Set(inventory.map((item) => item["Supplier"]).filter(Boolean)))
    return uniqueSuppliers.sort() // Sort alphabetically for consistency
  }, [inventory])

  const uniqueLocations = useMemo(() => {
    const uniqueLocations = Array.from(new Set(inventory.map((item) => item["Location"]).filter(Boolean)))

    // Enhanced natural sorting for locations like H1-1, H1-2, H1-10, etc. - DESCENDING ORDER
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

          // First compare the letter prefix (H2 vs H1) - REVERSED for descending
          if (aPrefix !== bPrefix) {
            return bPrefix.localeCompare(aPrefix)
          }

          // Then compare the numeric part numerically - REVERSED for descending
          if (aNumber && bNumber) {
            const aNum = Number.parseInt(aNumber, 10)
            const bNum = Number.parseInt(bNumber, 10)
            if (aNum !== bNum) {
              return bNum - aNum // Reversed for descending
            }
          } else if (aNumber && !bNumber) {
            return -1 // Numbers come before non-numbers in descending
          } else if (!aNumber && bNumber) {
            return 1 // Non-numbers come after numbers in descending
          }

          // Finally compare any suffix - REVERSED for descending
          if (aSuffix !== bSuffix) {
            return bSuffix.localeCompare(aSuffix)
          }
        } else {
          // Fallback to string comparison if regex doesn't match - REVERSED for descending
          const comparison = bPart.toLowerCase().localeCompare(aPart.toLowerCase())
          if (comparison !== 0) {
            return comparison
          }
        }
      }

      return 0
    })
  }, [inventory])

  // Get all locations including pending changes and suggest next location
  const locationSuggestion = useMemo(async () => {
    try {
      // Get current inventory locations
      const currentLocations = inventory.map(item => item["Location"]).filter(Boolean)
      
      // Get pending changes locations
      let pendingLocations: string[] = []
      try {
        const response = await fetch("/api/inventory/pending")
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            pendingLocations = result.data
              .filter((change: any) => change.status === "pending")
              .map((change: any) => change.item_data?.location || change.original_data?.location)
              .filter(Boolean)
          }
        }
      } catch (error) {
        console.log("Could not fetch pending changes for location suggestion")
      }

      // Combine all locations
      const allLocations = [...currentLocations, ...pendingLocations]
      const uniqueAllLocations = Array.from(new Set(allLocations))

      if (uniqueAllLocations.length === 0) {
        return "H1-1" // Default first location
      }

      // Sort all locations using the same logic as uniqueLocations but descending
      const sortedLocations = uniqueAllLocations.sort((a, b) => {
        const aParts = a.split(/[-_\s]+/)
        const bParts = b.split(/[-_\s]+/)

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aPart = aParts[i] || ""
          const bPart = bParts[i] || ""

          const aMatch = aPart.match(/^([A-Za-z]*)(\d*)(.*)$/)
          const bMatch = bPart.match(/^([A-Za-z]*)(\d*)(.*)$/)

          if (aMatch && bMatch) {
            const [, aPrefix, aNumber, aSuffix] = aMatch
            const [, bPrefix, bNumber, bSuffix] = bMatch

            if (aPrefix !== bPrefix) {
              return bPrefix.localeCompare(aPrefix) // Descending
            }

            if (aNumber && bNumber) {
              const aNum = Number.parseInt(aNumber, 10)
              const bNum = Number.parseInt(bNumber, 10)
              if (aNum !== bNum) {
                return bNum - aNum // Descending
              }
            }

            if (aSuffix !== bSuffix) {
              return bSuffix.localeCompare(aSuffix) // Descending
            }
          }
        }
        return 0
      })

      // Get the highest location (first in descending order)
      const highestLocation = sortedLocations[0]
      
      // Suggest next location by incrementing the last numeric part
      const parts = highestLocation.split(/[-_\s]+/)
      const lastPart = parts[parts.length - 1]
      const match = lastPart.match(/^([A-Za-z]*)(\d+)(.*)$/)
      
      if (match) {
        const [, prefix, number, suffix] = match
        const nextNumber = (parseInt(number, 10) + 1).toString()
        const newLastPart = prefix + nextNumber + suffix
        const suggestedLocation = [...parts.slice(0, -1), newLastPart].join('-')
        return suggestedLocation
      } else {
        // If no numeric part found, append -1
        return highestLocation + "-1"
      }
    } catch (error) {
      console.error("Error generating location suggestion:", error)
      return "H1-1" // Fallback
    }
  }, [inventory])

  // Manual refresh function for location suggestions
  const refreshLocationSuggestion = async () => {
    console.log("🔄 Manually refreshing location suggestion...") // Debug
    const generateLocationSuggestion = async () => {
      console.log("📍 Generating location suggestion...") // Debug
      try {
        // Get current inventory locations
        const currentLocations = inventory
          .map(item => item["Location"])
          .filter(Boolean)
          .map(loc => loc.trim())
        
        console.log("📍 Current inventory locations:", currentLocations.length) // Debug
        
        // Get pending changes locations
        let pendingLocations: string[] = []
        try {
          const response = await fetch("/api/inventory/pending")
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              pendingLocations = result.data
                .filter((change: any) => change.status === "pending")
                .map((change: any) => {
                  // Handle different change types
                  if (change.change_type === "add") {
                    return change.item_data?.location
                  } else if (change.change_type === "update") {
                    return change.item_data?.location
                  } else if (change.change_type === "batch_add" && change.item_data?.batch_items) {
                    // Extract locations from batch items
                    return change.item_data.batch_items.map((item: any) => item.location).filter(Boolean)
                  }
                  return null
                })
                .flat() // Flatten in case of batch items
                .filter(Boolean)
                .map((loc: string) => loc.trim())
            }
          }
          console.log("📍 Pending changes locations:", pendingLocations.length) // Debug
        } catch (error) {
          console.log("📍 Could not fetch pending changes for location suggestion:", error)
        }

        // Get current batch entry locations (if in batch mode)
        let batchLocations: string[] = []
        batchLocations = batchEntryItems
          .map(item => item.location)
          .filter(Boolean)
          .map(loc => loc.trim())
        console.log("📍 Current batch locations:", batchLocations.length) // Debug

        // Get current single entry location (if in single mode and has value)
        let currentFormLocation: string[] = []
        const locationInput = document.querySelector("#add-location") as HTMLSelectElement
        if (locationInput && locationInput.value && locationInput.value !== suggestedLocation) {
          currentFormLocation = [locationInput.value.trim()]
          console.log("📍 Current form location:", currentFormLocation) // Debug
        }

        // Combine all locations
        const allLocations = [
          ...currentLocations, 
          ...pendingLocations, 
          ...batchLocations,
          ...currentFormLocation
        ]
        const uniqueAllLocations = Array.from(new Set(allLocations)).filter(Boolean)

        console.log("📍 Total unique locations found:", uniqueAllLocations.length) // Debug
        console.log("📍 Sample locations:", uniqueAllLocations.slice(0, 5)) // Debug

        if (uniqueAllLocations.length === 0) {
          console.log("📍 No locations found, using default H1-1") // Debug
          setSuggestedLocation("H1-1")
          return
        }

        // Sort all locations descending
        const sortedLocations = uniqueAllLocations.sort((a, b) => {
          const aParts = a.split(/[-_\s]+/)
          const bParts = b.split(/[-_\s]+/)

          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || ""
            const bPart = bParts[i] || ""

            const aMatch = aPart.match(/^([A-Za-z]*)(\d*)(.*)$/)
            const bMatch = bPart.match(/^([A-Za-z]*)(\d*)(.*)$/)

            if (aMatch && bMatch) {
              const [, aPrefix, aNumber, aSuffix] = aMatch
              const [, bPrefix, bNumber, bSuffix] = bMatch

              if (aPrefix !== bPrefix) {
                return bPrefix.localeCompare(aPrefix)
              }

              if (aNumber && bNumber) {
                const aNum = Number.parseInt(aNumber, 10)
                const bNum = Number.parseInt(bNumber, 10)
                if (aNum !== bNum) {
                  return bNum - aNum
                }
              } else if (aNumber && !bNumber) {
                return -1
              } else if (!aNumber && bNumber) {
                return 1
              }

              if (aSuffix !== bSuffix) {
                return bSuffix.localeCompare(aSuffix)
              }
            }
          }
          return 0
        })

        console.log("📍 Highest locations:", sortedLocations.slice(0, 3)) // Debug

        // Get the highest location and suggest next
        const highestLocation = sortedLocations[0]
        const parts = highestLocation.split(/[-_\s]+/)
        const lastPart = parts[parts.length - 1]
        const match = lastPart.match(/^([A-Za-z]*)(\d+)(.*)$/)
        
        if (match) {
          const [, prefix, number, suffix] = match
          const nextNumber = (parseInt(number, 10) + 1).toString()
          const newLastPart = prefix + nextNumber + suffix
          const suggestedLocation = [...parts.slice(0, -1), newLastPart].join('-')
          console.log("📍 Generated suggestion:", suggestedLocation) // Debug
          setSuggestedLocation(suggestedLocation)
        } else {
          const fallback = highestLocation + "-1"
          console.log("📍 Using fallback suggestion:", fallback) // Debug
          setSuggestedLocation(fallback)
        }
      } catch (error) {
        console.error("📍 Error generating location suggestion:", error)
        setSuggestedLocation("H1-1")
      }
    }
    
    await generateLocationSuggestion()
  }

  // Convert the async useMemo to a state-based approach
  const [suggestedLocation, setSuggestedLocation] = useState<string>("H1-1")
  
  useEffect(() => {
    const generateLocationSuggestion = async () => {
      console.log("📍 Generating location suggestion...") // Debug
      try {
        // Get current inventory locations
        const currentLocations = inventory
          .map(item => item["Location"])
          .filter(Boolean)
          .map(loc => loc.trim())
        
        console.log("📍 Current inventory locations:", currentLocations.length) // Debug
        
        // Get pending changes locations
        let pendingLocations: string[] = []
        try {
          const response = await fetch("/api/inventory/pending")
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              pendingLocations = result.data
                .filter((change: any) => change.status === "pending")
                .map((change: any) => {
                  // Handle different change types
                  if (change.change_type === "add") {
                    return change.item_data?.location
                  } else if (change.change_type === "update") {
                    return change.item_data?.location
                  } else if (change.change_type === "batch_add" && change.item_data?.batch_items) {
                    // Extract locations from batch items
                    return change.item_data.batch_items.map((item: any) => item.location).filter(Boolean)
                  }
                  return null
                })
                .flat() // Flatten in case of batch items
                .filter(Boolean)
                .map((loc: string) => loc.trim())
            }
          }
          console.log("📍 Pending changes locations:", pendingLocations.length) // Debug
        } catch (error) {
          console.log("📍 Could not fetch pending changes for location suggestion:", error)
        }

        // Get current batch entry locations (if in batch mode)
        let batchLocations: string[] = []
        batchLocations = batchEntryItems
          .map(item => item.location)
          .filter(Boolean)
          .map(loc => loc.trim())
        console.log("📍 Current batch locations:", batchLocations.length) // Debug

        // Get current single entry location (if in single mode and has value)
        let currentFormLocation: string[] = []
        const locationInput = document.querySelector("#add-location") as HTMLSelectElement
        if (locationInput && locationInput.value && locationInput.value !== suggestedLocation) {
          currentFormLocation = [locationInput.value.trim()]
          console.log("📍 Current form location:", currentFormLocation) // Debug
        }

        // Combine all locations
        const allLocations = [
          ...currentLocations, 
          ...pendingLocations, 
          ...batchLocations,
          ...currentFormLocation
        ]
        const uniqueAllLocations = Array.from(new Set(allLocations)).filter(Boolean)

        console.log("📍 Total unique locations found:", uniqueAllLocations.length) // Debug
        console.log("📍 Sample locations:", uniqueAllLocations.slice(0, 5)) // Debug

        if (uniqueAllLocations.length === 0) {
          console.log("📍 No locations found, using default H1-1") // Debug
          setSuggestedLocation("H1-1")
          return
        }

        // Sort all locations descending
        const sortedLocations = uniqueAllLocations.sort((a, b) => {
          const aParts = a.split(/[-_\s]+/)
          const bParts = b.split(/[-_\s]+/)

          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || ""
            const bPart = bParts[i] || ""

            const aMatch = aPart.match(/^([A-Za-z]*)(\d*)(.*)$/)
            const bMatch = bPart.match(/^([A-Za-z]*)(\d*)(.*)$/)

            if (aMatch && bMatch) {
              const [, aPrefix, aNumber, aSuffix] = aMatch
              const [, bPrefix, bNumber, bSuffix] = bMatch

              if (aPrefix !== bPrefix) {
                return bPrefix.localeCompare(aPrefix)
              }

              if (aNumber && bNumber) {
                const aNum = Number.parseInt(aNumber, 10)
                const bNum = Number.parseInt(bNumber, 10)
                if (aNum !== bNum) {
                  return bNum - aNum
                }
              } else if (aNumber && !bNumber) {
                return -1
              } else if (!aNumber && bNumber) {
                return 1
              }

              if (aSuffix !== bSuffix) {
                return bSuffix.localeCompare(aSuffix)
              }
            }
          }
          return 0
        })

        console.log("📍 Highest locations:", sortedLocations.slice(0, 3)) // Debug

        // Get the highest location and suggest next
        const highestLocation = sortedLocations[0]
        const parts = highestLocation.split(/[-_\s]+/)
        const lastPart = parts[parts.length - 1]
        const match = lastPart.match(/^([A-Za-z]*)(\d+)(.*)$/)
        
        if (match) {
          const [, prefix, number, suffix] = match
          const nextNumber = (parseInt(number, 10) + 1).toString()
          const newLastPart = prefix + nextNumber + suffix
          const suggestedLocation = [...parts.slice(0, -1), newLastPart].join('-')
          console.log("📍 Generated suggestion:", suggestedLocation) // Debug
          setSuggestedLocation(suggestedLocation)
        } else {
          const fallback = highestLocation + "-1"
          console.log("📍 Using fallback suggestion:", fallback) // Debug
          setSuggestedLocation(fallback)
        }
      } catch (error) {
        console.error("📍 Error generating location suggestion:", error)
        setSuggestedLocation("H1-1")
      }
    }

    generateLocationSuggestion()
  }, [inventory, batchEntryItems])

  // Function to check for duplicate part numbers
  const checkForDuplicatePart = async (partNumber: string, mode: 'single' | 'batch', batchIndex?: number) => {
    if (!partNumber.trim()) return false

    console.log(`🔍 Checking for duplicate: "${partNumber}"`) // Debug log
    setCheckingDuplicate(true)

    try {
      // First get the most current inventory data directly from the database
      console.log("🗄️ Getting fresh inventory data for duplicate check...") // Debug
      let currentInventoryData: any[] = []
      
      try {
        const response = await fetch("/api/inventory/load-from-db", {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        })
        console.log("🗄️ Database response status:", response.status) // Debug
        
        if (response.ok) {
          const data = await response.json()
          console.log("🗄️ Database response data:", data) // Debug
          
          if (data.success && data.data && data.data.length > 0) {
            currentInventoryData = data.data
            console.log(`📊 Fresh inventory data: ${currentInventoryData.length} items`) // Debug
            console.log("📊 Sample fresh inventory item:", currentInventoryData[0]) // Debug
          } else if (data.items && data.items.length > 0) {
            // Try alternative data structure
            currentInventoryData = data.items
            console.log(`📊 Fresh inventory data (items): ${currentInventoryData.length} items`) // Debug
            console.log("📊 Sample fresh inventory item:", currentInventoryData[0]) // Debug
          } else {
            console.log("🗄️ Database returned no data:", data) // Debug
          }
        } else {
          console.log("🗄️ Database request failed with status:", response.status) // Debug
          const errorText = await response.text()
          console.log("🗄️ Error response:", errorText) // Debug
        }
      } catch (error) {
        console.error("🗄️ Error loading fresh inventory:", error)
      }

      // Check current inventory data
      if (currentInventoryData.length > 0) {
        console.log(`🔍 Searching through ${currentInventoryData.length} inventory items...`) // Debug
        
        const existingItem = currentInventoryData.find(
          (item: any) => {
            const itemPartNumber = (item.part_number || item["Part number"])?.toLowerCase()
            const searchPartNumber = partNumber.toLowerCase()
            console.log(`🔍 Comparing "${itemPartNumber}" with "${searchPartNumber}"`) // Debug
            return itemPartNumber === searchPartNumber
          }
        )

        if (existingItem) {
          console.log(`✅ Found duplicate in current inventory:`, existingItem) // Debug log
          setDuplicatePartInfo({
            existingItem: {
              part_number: existingItem.part_number || existingItem["Part number"],
              part_description: existingItem.part_description || existingItem["Part description"],
              quantity: existingItem.quantity || existingItem["QTY"],
              location: existingItem.location || existingItem["Location"],
              supplier: existingItem.supplier || existingItem["Supplier"],
              package: existingItem.package || existingItem["Package"],
              mfg_part_number: existingItem.mfg_part_number || existingItem["MFG Part number"],
              reorder_point: existingItem.reorder_point || existingItem["Reorder Point"] || alertSettings.defaultReorderPoint
            },
            mode,
            batchIndex
          })
          setShowDuplicateDialog(true)
          setCheckingDuplicate(false)
          return true
        } else {
          console.log(`🔍 No match found in ${currentInventoryData.length} inventory items`) // Debug
        }
      } else {
        console.log("🔍 No inventory data available for checking") // Debug
      }

      // Check pending approvals
      try {
        const pendingResponse = await fetch("/api/inventory/pending")
        if (pendingResponse.ok) {
          const pendingResult = await pendingResponse.json()
          if (pendingResult.success && pendingResult.data) {
            console.log(`📋 Checking ${pendingResult.data.length} pending changes`) // Debug log
            
            // Debug: Show sample pending items
            if (pendingResult.data.length > 0) {
              console.log("📋 Sample pending change:", pendingResult.data[0])
              console.log("📋 Sample pending part numbers:", pendingResult.data.slice(0, 3).map((change: any) => 
                change.item_data?.part_number || change.original_data?.part_number || "NO_PART_NUMBER"
              ))
            }
            
            const pendingDuplicate = pendingResult.data.find((change: any) => {
              const changePartNumber = change.item_data?.part_number || change.original_data?.part_number
              const searchPartNumber = partNumber.toLowerCase()
              const changePartNumberLower = changePartNumber?.toLowerCase()
              
              console.log(`📋 Comparing pending "${changePartNumberLower}" with "${searchPartNumber}"`) // Debug
              
              return change.status === "pending" && changePartNumberLower === searchPartNumber
            })

            if (pendingDuplicate) {
              console.log(`⏳ Found duplicate in pending changes:`, pendingDuplicate) // Debug log
              const itemData = pendingDuplicate.item_data || pendingDuplicate.original_data
              setDuplicatePartInfo({
                existingItem: {
                  part_number: itemData.part_number,
                  part_description: itemData.part_description,
                  quantity: itemData.quantity,
                  location: itemData.location,
                  supplier: itemData.supplier,
                  package: itemData.package,
                  mfg_part_number: itemData.mfg_part_number,
                  reorder_point: itemData.reorder_point || alertSettings.defaultReorderPoint,
                  isPending: true // Flag to indicate this is from pending changes
                },
                mode,
                batchIndex
              })
              setShowDuplicateDialog(true)
              setCheckingDuplicate(false)
              return true
            }
          }
        }
      } catch (pendingError) {
        console.error("Error checking pending changes:", pendingError)
      }

      console.log(`❌ No duplicate found for: "${partNumber}"`) // Debug log
    } catch (error) {
      console.error("Error checking for duplicates:", error)
    }
    
    setCheckingDuplicate(false)
    return false
  }

  // Debounced duplicate check function
  const debouncedDuplicateCheck = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (partNumber: string, mode: 'single' | 'batch', batchIndex?: number) => {
      console.log("⏰ Debounced check called for:", partNumber) // Debug
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        console.log("⏰ Debounce timeout triggered, calling checkForDuplicatePart") // Debug
        checkForDuplicatePart(partNumber, mode, batchIndex)
      }, 500) // 500ms delay after user stops typing
    }
  }, [])

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

  // Add new inventory item - UPDATED to require requester
  const addInventoryItem = async (newItem: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => {
    console.log("🚀 addInventoryItem called with:", newItem, "requester:", requester)

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

      const result = await submitChangeForApproval("add", itemData, null, requester)

      alert("✅ New item submitted for approval! Check the pending changes section or approval dashboard.")
    } catch (error) {
      console.error("❌ Error submitting item for approval:", error)
      setError(`Failed to submit item for approval: ${error instanceof Error ? error.message : "Unknown error"}`)
      throw error
    }
  }

  // Update inventory item - UPDATED to handle all fields
  const updateInventoryItem = async (
    itemId: string,
    updatedFields: {
      qty?: number
      mfgPartNumber?: string
      description?: string
      supplier?: string
      location?: string
      package?: string
      reorderPoint?: number
    },
    requester: string,
  ) => {
    const item = inventory.find((i) => i.id === itemId)
    if (!item) return

    try {
      const originalData = {
        part_number: String(item["Part number"]).trim(),
        mfg_part_number: String(item["MFG Part number"] || "").trim(),
        qty: item["QTY"],
        part_description: String(item["Part description"] || "").trim(),
        supplier: String(item.Supplier || "").trim(),
        location: String(item.Location || "").trim(),
        package: String(item.Package || "").trim(),
        reorder_point: item.reorderPoint || alertSettings.defaultReorderPoint,
      }

      const itemData = {
        ...originalData,
        ...(updatedFields.qty !== undefined && { qty: updatedFields.qty }),
        ...(updatedFields.mfgPartNumber !== undefined && { mfg_part_number: updatedFields.mfgPartNumber.trim() }),
        ...(updatedFields.description !== undefined && { part_description: updatedFields.description.trim() }),
        ...(updatedFields.supplier !== undefined && { supplier: updatedFields.supplier.trim() }),
        ...(updatedFields.location !== undefined && { location: updatedFields.location.trim() }),
        ...(updatedFields.package !== undefined && { package: updatedFields.package.trim() }),
        ...(updatedFields.reorderPoint !== undefined && { reorder_point: updatedFields.reorderPoint }),
      }

      await submitChangeForApproval("update", itemData, originalData, requester)

      // Clear temporary changes after submission if quantity was updated
      if (updatedFields.qty !== undefined) {
        setTempQuantityChanges((prev) => {
          const updated = { ...prev }
          delete updated[itemId]
          return updated
        })
      }

      alert("✅ Item update submitted for approval!")
    } catch (error) {
      console.error("Failed to submit item update:", error)
      setError("Failed to submit item update for approval")
    }
  }

  // Update reorder point - UPDATED to use new updateInventoryItem function
  const updateReorderPoint = async (itemId: string, newReorderPoint: number, requester: string) => {
    await updateInventoryItem(itemId, { reorderPoint: newReorderPoint }, requester)
  }

  // Update inventory item quantity - UPDATED to use new updateInventoryItem function
  const updateItemQuantity = async (itemId: string, newQuantity: number, requester: string) => {
    await updateInventoryItem(itemId, { qty: newQuantity }, requester)
  }

  // Handle temporary quantity changes
  const handleTempQuantityChange = (itemId: string, delta: number) => {
    const item = inventory.find((i) => i.id === itemId)
    if (!item) return

    const currentTemp = tempQuantityChanges[itemId] || 0
    const originalQty = item["QTY"]
    const newTempQty = Math.max(0, originalQty + currentTemp + delta)
    const newDelta = newTempQty - originalQty

    setTempQuantityChanges((prev) => ({
      ...prev,
      [itemId]: newDelta,
    }))
  }

  // Get display quantity (original + temporary change)
  const getDisplayQuantity = (item: InventoryItem) => {
    const tempChange = tempQuantityChanges[item.id] || 0
    return item["QTY"] + tempChange
  }

  // Check if item has temporary changes
  const hasTempChanges = (itemId: string) => {
    return tempQuantityChanges[itemId] !== undefined && tempQuantityChanges[itemId] !== 0
  }

  // Confirm quantity changes - UPDATED to require requester
  const confirmQuantityChange = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId)
    const tempChange = tempQuantityChanges[itemId]

    if (!item || !tempChange) return

    const newQuantity = item["QTY"] + tempChange
    const changeDescription = tempChange > 0 ? `Add ${tempChange} units` : `Remove ${Math.abs(tempChange)} units`

    // Prompt for requester name
    const requester = prompt(
      `${changeDescription} for ${item["Part number"]}?\n\n${item["QTY"]} → ${newQuantity} units\n\nPlease enter your name as the requester:`,
    )

    if (requester && requester.trim() !== "" && requester.trim().toLowerCase() !== "current user") {
      updateItemQuantity(itemId, newQuantity, requester.trim())
    } else if (requester !== null) {
      // User clicked OK but provided invalid input
      alert("❌ Please provide a valid requester name. 'Current User' is not allowed.")
    }
    // If user clicked Cancel (requester === null), do nothing
  }

  // Cancel temporary changes
  const cancelTempChanges = (itemId: string) => {
    setTempQuantityChanges((prev) => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
  }

  // Handle custom quantity input
  const handleCustomQuantityChange = (itemId: string, customAmount: string) => {
    const amount = Number.parseInt(customAmount)
    if (isNaN(amount)) return

    const item = inventory.find((i) => i.id === itemId)
    if (!item) return

    const currentTemp = tempQuantityChanges[itemId] || 0
    const originalQty = item["QTY"]
    const newTempQty = Math.max(0, originalQty + currentTemp + amount)
    const newDelta = newTempQty - originalQty

    setTempQuantityChanges((prev) => ({
      ...prev,
      [itemId]: newDelta,
    }))
  }

  // Delete inventory item - UPDATED to require requester
  const deleteInventoryItem = async (itemId: string, requester: string) => {
    const itemToDelete = inventory.find((item) => item.id === itemId)
    if (!itemToDelete) return

    try {
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

      await submitChangeForApproval("delete", null, originalData, requester)

      alert("✅ Item deletion submitted for approval!")
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

    // Send to Slack if configured
    if (slackConfigured) {
      try {
        await sendSlackMessage(formatPurchaseRequest(request))
        alert(`✅ Purchase request created and sent to Slack for ${item["Part number"]}!`)
      } catch (error) {
        console.error("Failed to send purchase request to Slack:", error)
        alert(`✅ Purchase request created for ${item["Part number"]} (Slack notification failed)`)
      }
    } else {
      alert(`✅ Purchase request created for ${item["Part number"]} (Slack not configured)`)
    }
  }

  // Send low stock alert with better error handling
  const sendLowStockAlert = async () => {
    if (lowStockItems.length === 0) {
      alert("No low stock items to report!")
      return
    }

    if (!slackConfigured) {
      alert("❌ Slack is not configured. Please check your SLACK_WEBHOOK_URL environment variable.")
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
        `✅ Low stock alert sent successfully! Showing ${Math.min(3, formattedItems.length)} items with "Show All" button for ${formattedItems.length} total items.`,
      )
    } catch (error) {
      console.error("Failed to send interactive low stock alert:", error)

      // Provide specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes("not configured in environment variables")) {
          alert(`ℹ️ Slack is not configured in this environment.

This is normal in preview environments. Your deployed app at v0-inv-mgt.vercel.app has Slack properly configured.`)
        } else if (error.message.includes("webhook URL is invalid") || error.message.includes("no_service")) {
          alert(`❌ Slack webhook configuration error:

${error.message}

Please check your Slack webhook URL in the environment variables.`)
        } else {
          alert(`❌ Failed to send Slack alert:

${error.message}

Please check your Slack configuration.`)
        }
      } else {
        alert("❌ Failed to send Slack alert. Please check your Slack webhook configuration.")
      }
    }
  }

  // Send full low stock alert with better error handling
  const sendFullAlert = async () => {
    if (lowStockItems.length === 0) {
      alert("No low stock items to report!")
      return
    }

    if (!slackConfigured) {
      alert("❌ Slack is not configured. Please check your SLACK_WEBHOOK_URL environment variable.")
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
        `✅ Full low stock alert sent successfully! Showing all ${formattedItems.length} items with individual reorder buttons.`,
      )
    } catch (error) {
      console.error("Failed to send interactive full alert:", error)

      // Provide specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes("not configured in environment variables")) {
          alert(`ℹ️ Slack is not configured in this environment.

This is normal in preview environments. Your deployed app at v0-inv-mgt.vercel.app has Slack properly configured.`)
        } else if (error.message.includes("webhook URL is invalid") || error.message.includes("no_service")) {
          alert(`❌ Slack webhook configuration error:

${error.message}

Please check your Slack webhook URL in the environment variables.`)
        } else {
          alert(`❌ Failed to send full Slack alert:

${error.message}

Please check your Slack configuration.`)
        }
      } else {
        alert("❌ Failed to send full Slack alert. Please check your Slack webhook configuration.")
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
          <Dialog open={addItemDialogOpen} onOpenChange={(open) => {
            if (!open && addItemFormModified) {
              // User is trying to close the dialog with unsaved changes
              const confirmClose = confirm("You have unsaved changes. Are you sure you want to cancel and lose your changes?")
              if (!confirmClose) {
                return // Don't close the dialog
              }
              setAddItemFormModified(false)
            }
            setAddItemDialogOpen(open)
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setAddItemFormModified(false)
                setAddItemDialogOpen(true)
                setBatchEntryItems([{ 
                  partNumber: '', 
                  mfgPartNumber: '', 
                  description: '', 
                  quantity: '', 
                  location: '', 
                  supplier: '', 
                  package: '',
                  reorderPoint: alertSettings.defaultReorderPoint 
                }])
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1200px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Item(s)</DialogTitle>
                <DialogDescription>Add one or multiple items to the inventory</DialogDescription>
              </DialogHeader>
              
              {/* Single Form Interface - No Tabs */}
              <div className="space-y-4">
                <div>
                  <Label>Requester Name *</Label>
                  <Input 
                    id="add-requester" 
                    placeholder="Enter your name" 
                    required 
                    onChange={() => setAddItemFormModified(true)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Part Number *</Label>
                    <div className="relative">
                      <Input 
                        id="add-part-number" 
                        placeholder="Enter part number" 
                        required 
                        onChange={(e) => {
                          console.log("🔍 Part number input changed:", e.target.value) // Debug
                          setAddItemFormModified(true)
                          const partNumber = e.target.value.trim()
                          console.log("🔍 Trimmed part number:", partNumber) // Debug
                          if (partNumber.length >= 2) { // Start checking after 2 characters
                            console.log("🔍 Triggering duplicate check for:", partNumber) // Debug
                            debouncedDuplicateCheck(partNumber, 'single')
                          }
                        }}
                      />
                      {checkingDuplicate && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>MFG Part Number</Label>
                    <Input 
                      id="add-mfg-part-number" 
                      placeholder="Enter MFG part number" 
                      onChange={() => setAddItemFormModified(true)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description *</Label>
                  <Input 
                    id="add-description" 
                    placeholder="Enter description" 
                    required 
                    onChange={() => setAddItemFormModified(true)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity *</Label>
                    <Input 
                      id="add-quantity" 
                      type="number" 
                      min="0" 
                      placeholder="Enter quantity" 
                      required 
                      onChange={(e) => {
                        console.log("📦 Quantity changed:", e.target.value) // Debug
                        setAddItemFormModified(true)
                        const quantity = parseInt(e.target.value) || 0
                        console.log("📦 Parsed quantity:", quantity) // Debug
                        
                        // Auto-select package type based on new quantity rules
                        const suggestedPackage = getSuggestedPackage(quantity)
                        console.log("📦 Suggested package:", suggestedPackage) // Debug
                        
                        // Find the package select element and update it
                        setTimeout(() => {
                          const packageSelect = document.querySelector("#add-package-trigger") as HTMLElement
                          console.log("📦 Package select element:", packageSelect) // Debug
                          
                          if (packageSelect && suggestedPackage && packageTypes.includes(suggestedPackage)) {
                            console.log("📦 Updating package to:", suggestedPackage) // Debug
                            
                            // Update the select value
                            packageSelect.setAttribute('data-value', suggestedPackage)
                            
                            // Update the display text
                            const valueSpan = packageSelect.querySelector('[data-placeholder]') || packageSelect.querySelector('span')
                            if (valueSpan) {
                              valueSpan.textContent = suggestedPackage
                              console.log("📦 Updated display text to:", suggestedPackage) // Debug
                            }
                            
                            // Hide custom input if it was showing
                            const packageCustom = document.querySelector("#add-package-custom") as HTMLInputElement
                            if (packageCustom) {
                              packageCustom.classList.add("hidden")
                            }
                          }
                        }, 100) // Small delay to ensure DOM is ready
                      }}
                    />
                  </div>
                  <div>
                    <Label>Reorder Point</Label>
                    <Input
                      id="add-reorder-point"
                      type="number"
                      min="0"
                      defaultValue={alertSettings.defaultReorderPoint}
                      onChange={() => setAddItemFormModified(true)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location</Label>
                    <Select onValueChange={(value) => {
                      setAddItemFormModified(true)
                      const customInput = document.querySelector("#add-location-custom") as HTMLInputElement
                      const trigger = document.querySelector("#add-location-trigger") as HTMLElement
                      if (value === "__custom__") {
                        customInput?.classList.remove("hidden")
                        customInput?.focus()
                      } else {
                        customInput?.classList.add("hidden")
                      }
                      trigger?.setAttribute('data-value', value)
                    }}>
                      <SelectTrigger id="add-location-trigger">
                        <SelectValue placeholder="Select or enter location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={suggestedLocation} className="bg-blue-50 border-blue-200">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 font-medium">⭐ Suggested: {suggestedLocation}</span>
                          </div>
                        </SelectItem>
                        <div className="border-t border-gray-200 my-1"></div>
                        {uniqueLocations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                        <div className="border-t border-gray-200 my-1"></div>
                        <SelectItem value="__custom__">+ Enter custom location</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      id="add-location-custom" 
                      placeholder="Enter new location" 
                      className="mt-2 hidden"
                      onChange={() => setAddItemFormModified(true)}
                    />
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <Select onValueChange={(value) => {
                      setAddItemFormModified(true)
                      const customInput = document.querySelector("#add-supplier-custom") as HTMLInputElement
                      const trigger = document.querySelector("#add-supplier-trigger") as HTMLElement
                      if (value === "__custom__") {
                        customInput?.classList.remove("hidden")
                        customInput?.focus()
                      } else {
                        customInput?.classList.add("hidden")
                      }
                      trigger?.setAttribute('data-value', value)
                    }}>
                      <SelectTrigger id="add-supplier-trigger">
                        <SelectValue placeholder="Select or enter supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier} value={supplier}>
                            {supplier}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">+ Enter custom supplier</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      id="add-supplier-custom" 
                      placeholder="Enter new supplier" 
                      className="mt-2 hidden"
                      onChange={() => setAddItemFormModified(true)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Package Type</Label>
                  <Select onValueChange={(value) => {
                    setAddItemFormModified(true)
                    const customInput = document.querySelector("#add-package-custom") as HTMLInputElement
                    const trigger = document.querySelector("#add-package-trigger") as HTMLElement
                    if (value === "__custom__") {
                      customInput?.classList.remove("hidden")
                      customInput?.focus()
                    } else {
                      customInput?.classList.add("hidden")
                    }
                    trigger?.setAttribute('data-value', value)
                  }}>
                    <SelectTrigger id="add-package-trigger">
                      <SelectValue placeholder="Select or enter package type" />
                    </SelectTrigger>
                    <SelectContent>
                      {packageTypes.map((packageType) => (
                        <SelectItem key={packageType} value={packageType}>
                          {packageType}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">+ Enter custom package</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    id="add-package-custom" 
                    placeholder="Enter new package type" 
                    className="mt-2 hidden"
                    onChange={() => setAddItemFormModified(true)}
                  />
                </div>
              </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Clear the form
                    const inputs = ['#add-part-number', '#add-mfg-part-number', '#add-description', '#add-quantity', '#add-reorder-point']
                    inputs.forEach(selector => {
                      const input = document.querySelector(selector) as HTMLInputElement
                      if (input) input.value = ''
                    })
                    setAddItemFormModified(false)
                  }}
                >
                  Clear Form
                </Button>
                
                <Button 
                  onClick={() => {
                    // Get form values
                    const requesterInput = document.querySelector("#add-requester") as HTMLInputElement
                    const partNumberInput = document.querySelector("#add-part-number") as HTMLInputElement
                    const mfgPartNumberInput = document.querySelector("#add-mfg-part-number") as HTMLInputElement
                    const descriptionInput = document.querySelector("#add-description") as HTMLInputElement
                    const quantityInput = document.querySelector("#add-quantity") as HTMLInputElement
                    const reorderPointInput = document.querySelector("#add-reorder-point") as HTMLInputElement

                    // Handle location
                    const locationTrigger = document.querySelector("#add-location-trigger") as HTMLElement
                    const locationCustom = document.querySelector("#add-location-custom") as HTMLInputElement
                    const locationValue = locationTrigger?.getAttribute('data-value') === '__custom__'
                      ? locationCustom?.value?.trim() || ""
                      : locationTrigger?.getAttribute('data-value') || suggestedLocation

                    // Handle supplier
                    const supplierTrigger = document.querySelector("#add-supplier-trigger") as HTMLElement
                    const supplierCustom = document.querySelector("#add-supplier-custom") as HTMLInputElement
                    const supplierValue = supplierTrigger?.getAttribute('data-value') === '__custom__'
                      ? supplierCustom?.value?.trim() || ""
                      : supplierTrigger?.getAttribute('data-value') || ""

                    // Handle package
                    const packageTrigger = document.querySelector("#add-package-trigger") as HTMLElement
                    const packageCustom = document.querySelector("#add-package-custom") as HTMLInputElement
                    const packageValue = packageTrigger?.getAttribute('data-value') === '__custom__'
                      ? packageCustom?.value?.trim() || ""
                      : packageTrigger?.getAttribute('data-value') || ""

                    if (
                      !requesterInput?.value?.trim() ||
                      !partNumberInput?.value?.trim() ||
                      !descriptionInput?.value?.trim() ||
                      !quantityInput?.value?.trim()
                    ) {
                      alert("Please fill in all required fields")
                      return
                    }

                    const newBatchItem = {
                      partNumber: partNumberInput.value.trim(),
                      mfgPartNumber: mfgPartNumberInput?.value?.trim() || "",
                      description: descriptionInput.value.trim(),
                      quantity: quantityInput.value.trim(),
                      location: locationValue,
                      supplier: supplierValue,
                      package: packageValue,
                      reorderPoint: Number.parseInt(reorderPointInput?.value) || alertSettings.defaultReorderPoint,
                      requester: requesterInput.value.trim()
                    }

                    // Add to batch
                    setBatchEntryItems(prev => [...prev, newBatchItem])
                    
                    // Clear form for next item (but keep requester)
                    const requesterValue = requesterInput.value
                    const inputs = ['#add-part-number', '#add-mfg-part-number', '#add-description', '#add-quantity', '#add-reorder-point']
                    inputs.forEach(selector => {
                      const input = document.querySelector(selector) as HTMLInputElement
                      if (input) input.value = ''
                    })
                    
                    // Keep requester name
                    requesterInput.value = requesterValue
                    
                    setAddItemFormModified(false)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Batch
                </Button>
              </div>

              {/* Batch Items Display */}
              {batchEntryItems.length > 0 && (
                <div className="mt-6 space-y-4 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Batch Items ({batchEntryItems.length})</h3>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setBatchEntryItems([])
                        setAddItemFormModified(false)
                      }}
                    >
                      Clear Batch
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 border-r">Part Number</th>
                            <th className="text-left p-2 border-r">Description</th>
                            <th className="text-left p-2 border-r">Qty</th>
                            <th className="text-left p-2 border-r">Location</th>
                            <th className="text-left p-2 border-r">Supplier</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchEntryItems.map((item, index) => (
                            <tr key={index} className="border-t hover:bg-gray-50">
                              <td className="p-2 border-r font-mono text-xs">{item.partNumber}</td>
                              <td className="p-2 border-r">{item.description}</td>
                              <td className="p-2 border-r">{item.quantity}</td>
                              <td className="p-2 border-r">{item.location}</td>
                              <td className="p-2 border-r">{item.supplier}</td>
                              <td className="p-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setBatchEntryItems(prev => prev.filter((_, i) => i !== index))
                                    setAddItemFormModified(true)
                                  }}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                >
                                  ×
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setBatchEntryItems([])
                      
                      // Clear all form fields
                      const inputs = ['#add-requester', '#add-part-number', '#add-mfg-part-number', '#add-description', '#add-quantity', '#add-reorder-point']
                      inputs.forEach(selector => {
                        const input = document.querySelector(selector) as HTMLInputElement
                        if (input) input.value = ''
                      })
                      
                      setAddItemFormModified(false)
                    }}
                  >
                    Clear All
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={async () => {
                      if (batchEntryItems.length === 0) {
                        alert("No items in batch to submit")
                        return
                      }

                      const requesterName = batchEntryItems[0]?.requester
                      if (!requesterName) {
                        alert("Requester name is missing")
                        return
                      }

                      // Submit each item in the batch
                      let successCount = 0
                      for (const item of batchEntryItems) {
                        try {
                          const newItem = {
                            "Part number": item.partNumber,
                            "MFG Part number": item.mfgPartNumber,
                            "Part description": item.description,
                            QTY: parseInt(item.quantity) || 0,
                            Location: item.location,
                            Supplier: item.supplier,
                            Package: item.package,
                            reorderPoint: item.reorderPoint || alertSettings.defaultReorderPoint,
                          }
                          
                          await addInventoryItem(newItem, requesterName)
                          successCount++
                        } catch (error) {
                          console.error(`Failed to add item ${item.partNumber}:`, error)
                        }
                      }
                      
                      alert(`✅ Batch submitted! ${successCount} of ${batchEntryItems.length} items submitted for approval.`)
                      
                      // Clear batch and close dialog
                      setBatchEntryItems([])
                      setAddItemFormModified(false)
                      setAddItemDialogOpen(false)
                    }}
                  >
                    Submit Batch ({batchEntryItems.length})
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Duplicate Part Number Dialog */}
          <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Duplicate Part Number Found</DialogTitle>
                <DialogDescription>
                  This part number already exists in your inventory
                </DialogDescription>
              </DialogHeader>
              
              {duplicatePartInfo && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${duplicatePartInfo.existingItem.isPending ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <h4 className={`font-medium mb-2 ${duplicatePartInfo.existingItem.isPending ? 'text-orange-800' : 'text-yellow-800'}`}>
                      {duplicatePartInfo.existingItem.isPending ? 'Pending Item Information:' : 'Existing Item Information:'}
                    </h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Part Number:</strong> {duplicatePartInfo.existingItem.part_number}</div>
                      <div><strong>Description:</strong> {duplicatePartInfo.existingItem.part_description}</div>
                      <div><strong>Quantity:</strong> {duplicatePartInfo.existingItem.quantity} units</div>
                      <div><strong>Location:</strong> {duplicatePartInfo.existingItem.location}</div>
                      <div><strong>Supplier:</strong> {duplicatePartInfo.existingItem.supplier}</div>
                      <div><strong>Package:</strong> {duplicatePartInfo.existingItem.package}</div>
                      {duplicatePartInfo.existingItem.isPending && (
                        <div className="text-orange-600 font-medium">⏳ This item is awaiting approval</div>
                      )}
                    </div>
                  </div>
                  
                  {!duplicatePartInfo.existingItem.isPending && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Add to Existing Stock:</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Additional Quantity to Add</Label>
                        <Input
                          id="additional-quantity"
                          type="number"
                          min="1"
                          placeholder="Enter additional quantity"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Your Name (Requester)</Label>
                        <Input
                          id="duplicate-requester"
                          placeholder="Enter your name"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              )}
              
              <DialogFooter>
