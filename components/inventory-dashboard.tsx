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

  // Load data from database on component mount
  useEffect(() => {
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
      .map((pkg) => pkg.trim().toUpperCase()) // Normalize to uppercase

    // Create a Set to remove duplicates, then convert back to array
    const uniquePackageTypes = Array.from(new Set(allPackageTypes))

    // Sort alphabetically for consistency
    return uniquePackageTypes.sort()
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
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>Add a new item to the inventory</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Requester Name *</Label>
                  <Input id="add-requester" placeholder="Enter your name" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Part Number *</Label>
                    <Input id="add-part-number" placeholder="Enter part number" required />
                  </div>
                  <div>
                    <Label>MFG Part Number</Label>
                    <Input id="add-mfg-part-number" placeholder="Enter MFG part number" />
                  </div>
                </div>
                <div>
                  <Label>Description *</Label>
                  <Input id="add-description" placeholder="Enter description" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity *</Label>
                    <Input id="add-quantity" type="number" min="0" placeholder="Enter quantity" required />
                  </div>
                  <div>
                    <Label>Reorder Point</Label>
                    <Input
                      id="add-reorder-point"
                      type="number"
                      min="0"
                      defaultValue={alertSettings.defaultReorderPoint}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location</Label>
                    <Input id="add-location" placeholder="Enter location" />
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <Input id="add-supplier" placeholder="Enter supplier" />
                  </div>
                </div>
                <div>
                  <Label>Package Type</Label>
                  <Input id="add-package" placeholder="Enter package type" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async (e) => {
                    const dialog = (e.target as HTMLElement).closest('[role="dialog"]')
                    const requesterInput = dialog?.querySelector("#add-requester") as HTMLInputElement
                    const partNumberInput = dialog?.querySelector("#add-part-number") as HTMLInputElement
                    const mfgPartNumberInput = dialog?.querySelector("#add-mfg-part-number") as HTMLInputElement
                    const descriptionInput = dialog?.querySelector("#add-description") as HTMLInputElement
                    const quantityInput = dialog?.querySelector("#add-quantity") as HTMLInputElement
                    const reorderPointInput = dialog?.querySelector("#add-reorder-point") as HTMLInputElement
                    const locationInput = dialog?.querySelector("#add-location") as HTMLInputElement
                    const supplierInput = dialog?.querySelector("#add-supplier") as HTMLInputElement
                    const packageInput = dialog?.querySelector("#add-package") as HTMLInputElement

                    if (
                      !requesterInput?.value?.trim() ||
                      !partNumberInput?.value?.trim() ||
                      !descriptionInput?.value?.trim() ||
                      !quantityInput?.value?.trim()
                    ) {
                      alert("Please fill in all required fields")
                      return
                    }

                    const newItem = {
                      "Part number": partNumberInput.value.trim(),
                      "MFG Part number": mfgPartNumberInput?.value?.trim() || "",
                      "Part description": descriptionInput.value.trim(),
                      QTY: Number.parseInt(quantityInput.value) || 0,
                      Location: locationInput?.value?.trim() || "",
                      Supplier: supplierInput?.value?.trim() || "",
                      Package: packageInput?.value?.trim() || "",
                      reorderPoint: Number.parseInt(reorderPointInput?.value) || alertSettings.defaultReorderPoint,
                    }

                    try {
                      await addInventoryItem(newItem, requesterInput.value.trim())
                      // Close dialog
                      const closeButton = document.querySelector(
                        '[data-state="open"] button[aria-label="Close"]',
                      ) as HTMLButtonElement
                      closeButton?.click()
                    } catch (error) {
                      console.error("Failed to add item:", error)
                    }
                  }}
                >
                  Add Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleDownloadExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
          <ProtectedUploadButton onUploadAuthorized={() => setShowUpload(true)} />
          <Button onClick={handleManualSync} variant="outline" disabled={syncing}>
            {syncing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            {syncing ? "Syncing..." : "Sync to Database"}
          </Button>
          <Button onClick={sendLowStockAlert} variant="outline" disabled={!slackConfigured}>
            <Bell className="w-4 h-4 mr-2" />
            {slackConfigured ? "Send Alert Now" : "Send Alert (Not Configured)"}
          </Button>
          {lowStockItems.length > 3 && (
            <Button onClick={sendFullAlert} variant="outline" disabled={!slackConfigured}>
              <List className="w-4 h-4 mr-2" />
              {slackConfigured ? "Send Full Alert" : "Send Full Alert (Not Configured)"}
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

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2 bg-transparent" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Changes Display */}
      <PendingChangesDisplay />

      {/* Preview Environment Notice */}
      {slackConfigured === false && supabaseConfigured === false && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800 mb-1">Preview Environment</h3>
                <p className="text-sm text-blue-700">
                  You're in a preview environment where external services (Slack, Supabase) are not available. Your
                  deployed app at{" "}
                  <a
                    href="https://v0-inv-mgt.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    v0-inv-mgt.vercel.app
                  </a>{" "}
                  has full functionality with all integrations working.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slack Configuration Warning */}
      {slackConfigured === false && supabaseConfigured !== false && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">Slack Not Configured</h3>
                <p className="text-sm text-yellow-700">
                  Slack webhook URL is invalid or not configured. Slack alerts and notifications will not work. Please
                  check your SLACK_WEBHOOK_URL environment variable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supabase Not Configured Warning */}
      {supabaseConfigured === false && slackConfigured !== false && (
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

      {/* Stats Cards - Compact Version */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-xs text-muted-foreground mt-1">≤ {alertSettings.defaultReorderPoint} units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approaching Low</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{approachingLowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {alertSettings.defaultReorderPoint + 1} - {Math.ceil(alertSettings.defaultReorderPoint * 1.5)} units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Levels</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  Low
                </Badge>
                <span>≤ {alertSettings.defaultReorderPoint}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  Approaching
                </Badge>
                <span>
                  {alertSettings.defaultReorderPoint + 1}-{Math.ceil(alertSettings.defaultReorderPoint * 1.5)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs px-1 py-0">
                  Normal
                </Badge>
                <span>&gt; {Math.ceil(alertSettings.defaultReorderPoint * 1.5)}</span>
              </div>
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

          {/* New Sorting Controls */}
          <div className="flex flex-col md:flex-row gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Sort by:</Label>
              <Select
                value={sortColumn || "default"}
                onValueChange={(value) => setSortColumn(value === "default" ? "" : (value as keyof InventoryItem))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Default (Location)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (Location)</SelectItem>
                  <SelectItem value="Part number">Part Number</SelectItem>
                  <SelectItem value="MFG Part number">MFG Part Number</SelectItem>
                  <SelectItem value="QTY">Quantity</SelectItem>
                  <SelectItem value="Part description">Description</SelectItem>
                  <SelectItem value="Supplier">Supplier</SelectItem>
                  <SelectItem value="Package">Package</SelectItem>
                  <SelectItem value="reorderPoint">Reorder Point</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as "asc" | "desc")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={sortDirection === "asc" ? "Ascending" : "Descending"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
              {sortColumn && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSortColumn("")
                    setSortDirection("asc")
                  }}
                >
                  Clear Sort
                </Button>
              )}
            </div>
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
        <CardContent className="p-0">
          <div className="relative">
            <div className="overflow-auto max-h-[1000px]">
              <table className="w-full border-collapse">
                {/* Fixed Header */}
                <thead className="sticky top-0 z-10 bg-white border-b-2 border-gray-300 shadow-md">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[120px]">
                      Part Number
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[140px]">
                      MFG Part Number
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[80px]">
                      QTY
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[200px]">
                      Part Description
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[120px]">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[100px]">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[100px]">
                      Package
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[100px]">
                      Reorder Point
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 min-w-[100px]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50 min-w-[200px]">
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* Scrollable Body */}
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium border-r border-gray-100 align-top">
                        {item["Part number"]}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100 align-top">{item["MFG Part number"]}</td>
                      <td className="px-4 py-3 border-r border-gray-100 align-top">{item["QTY"]}</td>
                      <td className="px-4 py-3 border-r border-gray-100 align-top">{item["Part description"]}</td>
                      <td className="px-4 py-3 border-r border-gray-100 align-top">{item["Supplier"]}</td>
                      <td className="px-4 py-3 border-r border-gray-100 align-top">{item["Location"]}</td>
                      <td className="px-4 py-3 border-r border-gray-100 align-top">
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={isPackageTypeMismatched(item) ? "destructive" : "outline"}
                            className={isPackageTypeMismatched(item) ? "animate-pulse" : ""}
                          >
                            {item.Package}
                          </Badge>
                          {isPackageTypeMismatched(item) && (
                            <span
                              className="text-xs text-red-600"
                              title={`Should be ${getCorrectPackageType(item.QTY)} for ${item.QTY} qty`}
                            >
                              ⚠️
                            </span>
                          )}
                          {itemsWithPendingChanges.has(item["Part number"]) && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-orange-600" title="Changes awaiting approval">
                                ⏳
                              </span>
                              <span className="text-xs text-orange-600 font-medium">Awaiting Approval</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100 align-top">
                        {item.reorderPoint || alertSettings.defaultReorderPoint}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100 align-top">
                        {(() => {
                          const stockStatus = getStockStatus(item)
                          return <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                        })()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTempQuantityChange(item.id, -1)}
                              disabled={getDisplayQuantity(item) <= 0}
                            >
                              -
                            </Button>
                            <span
                              className={`px-2 py-1 text-sm font-medium rounded ${
                                hasTempChanges(item.id) ? "bg-yellow-100 text-yellow-800" : "bg-gray-100"
                              }`}
                            >
                              {getDisplayQuantity(item)}
                              {hasTempChanges(item.id) && (
                                <span className="text-xs ml-1">
                                  ({tempQuantityChanges[item.id] > 0 ? "+" : ""}
                                  {tempQuantityChanges[item.id]})
                                </span>
                              )}
                            </span>
                            <Button size="sm" variant="outline" onClick={() => handleTempQuantityChange(item.id, 1)}>
                              +
                            </Button>
                          </div>

                          {/* Custom Amount Input */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                Custom
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Custom Quantity Change</DialogTitle>
                                <DialogDescription>
                                  Enter a custom amount to add or subtract for {item["Part number"]}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Amount (use negative numbers to subtract)</Label>
                                  <Input
                                    type="number"
                                    placeholder="e.g., 50 or -25"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const input = e.target as HTMLInputElement
                                        handleCustomQuantityChange(item.id, input.value)
                                        input.value = ""
                                        // Close dialog
                                        const closeButton = document.querySelector(
                                          '[data-state="open"] button[aria-label="Close"]',
                                        ) as HTMLButtonElement
                                        closeButton?.click()
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={(e) => {
                                    const input = (e.target as HTMLElement)
                                      .closest(".space-y-4")
                                      ?.querySelector("input") as HTMLInputElement
                                    if (input) {
                                      handleCustomQuantityChange(item.id, input.value)
                                      input.value = ""
                                      // Close dialog
                                      const closeButton = document.querySelector(
                                        '[data-state="open"] button[aria-label="Close"]',
                                      ) as HTMLButtonElement
                                      closeButton?.click()
                                    }
                                  }}
                                >
                                  Apply
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Confirmation Controls */}
                          {hasTempChanges(item.id) && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => confirmQuantityChange(item.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                ✓ Confirm
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => cancelTempChanges(item.id)}>
                                ✗ Cancel
                              </Button>
                            </div>
                          )}

                          {/* Other Actions */}
                          <div className="flex gap-1 flex-wrap">
                            <Dialog
                              open={editDialogOpen[item.id] || false}
                              onOpenChange={(open) => setEditDialogOpen((prev) => ({ ...prev, [item.id]: open }))}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditDialogOpen((prev) => ({ ...prev, [item.id]: true }))}
                                >
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                {/* Keep all the existing dialog content exactly the same */}
                                <DialogHeader>
                                  <DialogTitle>Edit Item</DialogTitle>
                                  <DialogDescription>Update details for {item["Part number"]}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Requester Name *</Label>
                                    <Input id="requester" placeholder="Enter your name" required />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Required for all changes that need approval
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>MFG Part Number</Label>
                                      <Input
                                        id="mfgPartNumber"
                                        defaultValue={item["MFG Part number"]}
                                        placeholder="Enter MFG part number"
                                      />
                                    </div>
                                    <div>
                                      <Label>Quantity</Label>
                                      <Input
                                        id="quantity"
                                        type="number"
                                        min="0"
                                        defaultValue={item["QTY"]}
                                        placeholder="Enter quantity"
                                        onChange={(e) => {
                                          // Update package suggestion when quantity changes
                                          const qty = Number(e.target.value) || 0
                                          const suggestedPackage = getCorrectPackageType(qty)
                                          const dialogElement = e.target.closest('[role="dialog"]')
                                          const packageWarning = dialogElement?.querySelector("#package-warning")
                                          const packageSelect = dialogElement?.querySelector("#package-select")

                                          if (packageWarning && packageSelect) {
                                            const currentPackage =
                                              packageSelect.getAttribute("data-value") || item["Package"]
                                            if (
                                              currentPackage.toUpperCase() !== suggestedPackage &&
                                              !["KIT", "KITS", "CUSTOM"].some((excluded) =>
                                                currentPackage.toUpperCase().includes(excluded),
                                              )
                                            ) {
                                              packageWarning.textContent = `⚠️ Suggested: ${suggestedPackage} for ${qty} qty`
                                              packageWarning.style.display = "block"
                                            } else {
                                              packageWarning.style.display = "none"
                                            }
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <Label>Part Description</Label>
                                    <Input
                                      id="description"
                                      defaultValue={item["Part description"]}
                                      placeholder="Enter part description"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Supplier</Label>
                                      <Select defaultValue={item["Supplier"]}>
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
                                    <div>
                                      <Label>Location</Label>
                                      <Select defaultValue={item["Location"]}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {uniqueLocations.map((location) => (
                                            <SelectItem key={location} value={location}>
                                              {location}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div>
                                    <Label>Package Type</Label>
                                    <Select
                                      defaultValue={item["Package"]}
                                      onValueChange={(value) => {
                                        // Store the selected value on the select element for later retrieval
                                        const packageSelect = document.querySelector("#package-select") as HTMLElement
                                        if (packageSelect) {
                                          packageSelect.setAttribute("data-selected-value", value)
                                        }

                                        // Update warning when package type changes
                                        const dialogElement = document.querySelector('[role="dialog"]')
                                        const quantityInput = dialogElement?.querySelector(
                                          "#quantity",
                                        ) as HTMLInputElement
                                        const packageWarning = dialogElement?.querySelector("#package-warning")

                                        if (quantityInput && packageWarning) {
                                          const qty = Number(quantityInput.value) || item["QTY"]
                                          const suggestedPackage = getCorrectPackageType(qty)

                                          if (
                                            value.toUpperCase() !== suggestedPackage &&
                                            !["KIT", "KITS", "CUSTOM"].some((excluded) =>
                                              value.toUpperCase().includes(excluded),
                                            )
                                          ) {
                                            packageWarning.textContent = `⚠️ Suggested: ${suggestedPackage} for ${qty} qty`
                                            packageWarning.style.display = "block"
                                          } else {
                                            packageWarning.style.display = "none"
                                          }
                                        }
                                      }}
                                    >
                                      <SelectTrigger id="package-select">
                                        <SelectValue placeholder="Select package type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {/* Standard package types first */}
                                        <SelectItem value="EXACT">EXACT</SelectItem>
                                        <SelectItem value="ESTIMATED">ESTIMATED</SelectItem>
                                        <SelectItem value="REEL">REEL</SelectItem>
                                        <SelectItem value="KIT">KIT</SelectItem>
                                        <SelectItem value="CUSTOM">CUSTOM</SelectItem>

                                        {/* Then any additional unique package types from inventory */}
                                        {packageTypes
                                          .filter(
                                            (pkg) => !["EXACT", "ESTIMATED", "REEL", "KIT", "CUSTOM"].includes(pkg),
                                          )
                                          .map((packageType) => (
                                            <SelectItem key={packageType} value={packageType}>
                                              {packageType}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                    <p
                                      id="package-warning"
                                      className="text-xs text-orange-600 mt-1"
                                      style={{
                                        display: isPackageTypeMismatched(item) ? "block" : "none",
                                      }}
                                    >
                                      ⚠️ Suggested: {getCorrectPackageType(item.QTY)} for {item.QTY} qty
                                    </p>
                                  </div>

                                  <div>
                                    <Label>Reorder Point</Label>
                                    <Input
                                      id="reorderPoint"
                                      type="number"
                                      min="0"
                                      defaultValue={item.reorderPoint || alertSettings.defaultReorderPoint}
                                    />
                                  </div>

                                  <div className="p-3 bg-gray-50 rounded text-sm">
                                    <p className="font-medium mb-1">Current Item Details:</p>
                                    <p>
                                      Part: {item["Part number"]} - {item["Part description"]}
                                    </p>
                                    <p>Current Quantity: {item["QTY"]} units</p>
                                    <p>Supplier: {item["Supplier"]}</p>
                                    <p>Location: {item["Location"]}</p>
                                    <p>Package: {item["Package"]}</p>
                                  </div>
                                </div>
                                <DialogFooter className="flex justify-between">
                                  <Button
                                    variant="destructive"
                                    onClick={(e) => {
                                      // Keep the existing delete logic but add dialog close at the end
                                      const dialogElement = (e.target as HTMLElement).closest('[role="dialog"]')
                                      const requesterInput = dialogElement?.querySelector(
                                        'input[id="requester"]',
                                      ) as HTMLInputElement

                                      if (!requesterInput) {
                                        alert("❌ Could not find requester input field. Please try again.")
                                        return
                                      }

                                      const requester = requesterInput.value?.trim()

                                      if (
                                        !requester ||
                                        requester.toLowerCase() === "current user" ||
                                        requester === ""
                                      ) {
                                        alert(
                                          "❌ Please provide a valid requester name. 'Current User' is not allowed.",
                                        )
                                        return
                                      }

                                      if (
                                        confirm(
                                          `Are you sure you want to delete "${item["Part number"]}"?\n\nRequested by: ${requester}\n\nThis action will be submitted for approval and cannot be undone once approved.`,
                                        )
                                      ) {
                                        deleteInventoryItem(item.id, requester)
                                        // Close dialog using state
                                        setEditDialogOpen((prev) => ({ ...prev, [item.id]: false }))
                                      }
                                    }}
                                  >
                                    Delete Item
                                  </Button>
                                  <Button
                                    onClick={async (e) => {
                                      // Keep all the existing update logic but modify the end
                                      const dialogElement = (e.target as HTMLElement).closest('[role="dialog"]')
                                      const requesterInput = dialogElement?.querySelector(
                                        'input[id="requester"]',
                                      ) as HTMLInputElement

                                      if (!requesterInput) {
                                        alert("❌ Could not find requester input field. Please try again.")
                                        return
                                      }

                                      const requester = requesterInput.value?.trim()

                                      if (!requester || requester.toLowerCase() === "current user") {
                                        alert(
                                          "❌ Please provide a valid requester name. 'Current User' is not allowed.",
                                        )
                                        return
                                      }

                                      // Disable the button to prevent double-clicks
                                      const updateButton = e.target as HTMLButtonElement
                                      updateButton.disabled = true
                                      updateButton.textContent = "Updating..."

                                      try {
                                        // Get all form values and validate (keep existing logic)
                                        const quantityInput = dialogElement?.querySelector(
                                          'input[id="quantity"]',
                                        ) as HTMLInputElement
                                        const packageSelectTrigger = dialogElement?.querySelector(
                                          "#package-select",
                                        ) as HTMLElement
                                        const qty = Number(quantityInput?.value) || item["QTY"]

                                        // Get the selected package type more reliably
                                        let selectedPackage = item["Package"]
                                        const packageSelectValue =
                                          packageSelectTrigger?.querySelector('[data-state="checked"]')?.textContent
                                        if (packageSelectValue) {
                                          selectedPackage = packageSelectValue.trim()
                                        } else {
                                          const triggerText = packageSelectTrigger?.querySelector("span")?.textContent
                                          if (triggerText && triggerText !== "Select package type") {
                                            selectedPackage = triggerText.trim()
                                          }
                                        }

                                        // Validate package type before saving
                                        const suggestedPackage = getCorrectPackageType(qty)
                                        const isExcludedPackage = ["KIT", "KITS", "CUSTOM"].some((excluded) =>
                                          selectedPackage.toUpperCase().includes(excluded),
                                        )

                                        if (!isExcludedPackage && selectedPackage.toUpperCase() !== suggestedPackage) {
                                          alert(
                                            `❌ Package type validation failed!\n\nFor ${qty} units, the package type must be "${suggestedPackage}".\nCurrently selected: "${selectedPackage}"\n\nPlease select the correct package type before updating.`,
                                          )
                                          updateButton.disabled = false
                                          updateButton.textContent = "Update Item"
                                          return
                                        }

                                        // Collect all the updated values (keep existing logic)
                                        const mfgPartNumberInput = dialogElement?.querySelector(
                                          'input[id="mfgPartNumber"]',
                                        ) as HTMLInputElement
                                        const descriptionInput = dialogElement?.querySelector(
                                          'input[id="description"]',
                                        ) as HTMLInputElement
                                        const reorderInput = dialogElement?.querySelector(
                                          'input[id="reorderPoint"]',
                                        ) as HTMLInputElement

                                        const updatedFields: any = {}

                                        // Only include fields that have changed
                                        if (mfgPartNumberInput?.value !== item["MFG Part number"]) {
                                          updatedFields.mfgPartNumber = mfgPartNumberInput.value
                                        }
                                        if (Number(quantityInput?.value) !== item["QTY"]) {
                                          updatedFields.qty = Number(quantityInput.value)
                                        }
                                        if (descriptionInput?.value !== item["Part description"]) {
                                          updatedFields.description = descriptionInput.value
                                        }
                                        if (
                                          Number(reorderInput?.value) !==
                                          (item.reorderPoint || alertSettings.defaultReorderPoint)
                                        ) {
                                          updatedFields.reorderPoint = Number(reorderInput.value)
                                        }

                                        if (selectedPackage !== item["Package"]) {
                                          updatedFields.package = selectedPackage
                                        }

                                        if (Object.keys(updatedFields).length === 0) {
                                          alert("❌ No changes detected. Please modify at least one field.")
                                          updateButton.disabled = false
                                          updateButton.textContent = "Update Item"
                                          return
                                        }

                                        await updateInventoryItem(item.id, updatedFields, requester)

                                        // Close dialog using state - this is the key change
                                        setEditDialogOpen((prev) => ({ ...prev, [item.id]: false }))
                                      } catch (error) {
                                        // Re-enable button if there's an error
                                        updateButton.disabled = false
                                        updateButton.textContent = "Update Item"
                                        console.error("Failed to update item:", error)
                                      }
                                    }}
                                  >
                                    Update Item
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  title="Click to configure or Shift+Click to send directly to Slack"
                                  onClick={(e) => {
                                    // If Shift key is pressed, send directly to Slack
                                    if (e.shiftKey) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      // Prompt for requester name
                                      const requester = prompt("Please enter your name for the purchase request:");
                                      if (!requester) return; // Cancel if no name provided
                                      
                                      // Calculate suggested quantity
                                      const suggestedQty = Math.max(
                                        (item.reorderPoint || alertSettings.defaultReorderPoint) - item["QTY"] + 5, 
                                        1
                                      );
                                      
                                      // Create request data
                                      const requestData = {
                                        partNumber: item["Part number"],
                                        description: item["Part description"],
                                        quantity: suggestedQty,
                                        supplier: item["Supplier"],
                                        requester: requester
                                      };
                                      
                                      // Send directly to Slack via our API
                                      fetch("/api/slack/purchase-request", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(requestData)
                                      })
                                      .then(response => response.json())
                                      .then(data => {
                                        if (data.success) {
                                          alert("✅ Purchase request sent directly to Slack!");
                                        } else {
                                          alert("❌ Error sending request: " + (data.error || "Unknown error"));
                                        }
                                      })
                                      .catch(err => {
                                        console.error("Failed to send request:", err);
                                        alert("❌ Failed to send request: " + err);
                                      });
                                      
                                      return false;
                                    }
                                  }}
                                >
                                  <ShoppingCart className="w-3 h-3" />
                                  Reorder
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Create Purchase Request</DialogTitle>
                                  <DialogDescription>Request to purchase more of this item</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Quantity to Order</Label>
                                    <Input
                                      type="number"
                                      defaultValue={Math.max(
                                        (item.reorderPoint || alertSettings.defaultReorderPoint) * 2 - item["QTY"],
                                        1,
                                      )}
                                      min="1"
                                    />
                                  </div>
                                  <div>
                                    <Label>Urgency</Label>
                                    <Select defaultValue="medium">
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
                                </div>
                                <DialogFooter>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={(e) => {
                                        const dialog = (e.target as HTMLElement).closest('[role="dialog"]')
                                        const quantityInput = dialog?.querySelector(
                                          'input[type="number"]',
                                        ) as HTMLInputElement
                                        const urgencySelect = dialog?.querySelector('[role="combobox"]') as HTMLElement
                                        const urgencyValue = urgencySelect?.getAttribute("data-value") || "medium"

                                        if (quantityInput) {
                                          createPurchaseRequest(
                                            item,
                                            Number.parseInt(quantityInput.value),
                                            urgencyValue as "low" | "medium" | "high",
                                          )
                                          // Close dialog
                                          const closeButton = document.querySelector(
                                            '[data-state="open"] button[aria-label="Close"]',
                                          ) as HTMLButtonElement
                                          closeButton?.click()
                                        }
                                      }}
                                    >
                                      Create Request
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={(e) => {
                                        const dialog = (e.target as HTMLElement).closest('[role="dialog"]')
                                        const quantityInput = dialog?.querySelector(
                                          'input[type="number"]',
                                        ) as HTMLInputElement
                                        
                                        if (quantityInput) {
                                          // Prompt for requester name
                                          const requester = prompt("Please enter your name for the purchase request:");
                                          if (!requester) return; // Cancel if no name provided
                                          
                                          // Create request data
                                          const requestData = {
                                            partNumber: item["Part number"],
                                            description: item["Part description"],
                                            quantity: Number.parseInt(quantityInput.value),
                                            supplier: item["Supplier"],
                                            requester: requester
                                          };
                                          
                                          // Send directly to Slack via our API
                                          fetch("/api/slack/purchase-request", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify(requestData)
                                          })
                                          .then(response => response.json())
                                          .then(data => {
                                            if (data.success) {
                                              alert("✅ Purchase request sent directly to Slack!");
                                              
                                              // Close dialog
                                              const closeButton = document.querySelector(
                                                '[data-state="open"] button[aria-label="Close"]',
                                              ) as HTMLButtonElement
                                              closeButton?.click()
                                            } else {
                                              alert("❌ Error sending request: " + (data.error || "Unknown error"));
                                            }
                                          })
                                          .catch(err => {
                                            console.error("Failed to send request:", err);
                                            alert("❌ Failed to send request: " + err);
                                          });
                                        }
                                      }}
                                    >
                                      Send to Slack
                                    </Button>
                                  </div>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Package Note */}
      {packageNote && (
        <Card>
          <CardHeader>
            <CardTitle>Package Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{packageNote}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
