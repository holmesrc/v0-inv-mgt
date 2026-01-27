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
import { AlertTriangle, Package, TrendingDown, Upload, Settings, RefreshCw, Download, Plus, Edit, Trash2, Check, X, Search, Filter, ArrowUpDown, Globe, HelpCircle, Play } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import FileUpload from "./file-upload"
import SupplierLookup from "./supplier-lookup"
import HelpModal from "./help-modal"
import InteractiveTour from "./interactive-tour"

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
  const [sortBy, setSortBy] = useState<"part_number" | "description" | "location" | "supplier" | "package" | "quantity">("part_number")
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
  const [editFormData, setEditFormData] = useState<Record<string, {
    partNumber: string
    mfgPartNumber: string
    description: string
    quantity: string
    location: string
    supplier: string
    package: string
    reorderPoint: string
  }>>({})
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [tempQuantityChanges, setTempQuantityChanges] = useState<Record<string, number>>({})
  const [showSettings, setShowSettings] = useState(false)
  const [customQuantityInput, setCustomQuantityInput] = useState<Record<string, string>>({})
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({})
  const [suggestedLocation, setSuggestedLocation] = useState<string>("H1-1")
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false)
  const [customLocationValue, setCustomLocationValue] = useState("")
  const [addItemFormModified, setAddItemFormModified] = useState(false)
  const [showRequesterWarning, setShowRequesterWarning] = useState(false)
  const [showCustomPackageInput, setShowCustomPackageInput] = useState(false)
  const [customPackageValue, setCustomPackageValue] = useState("")
  const [batchEntryItems, setBatchEntryItems] = useState<any[]>([])
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
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
    batchIndex?: number
    duplicateSource: 'inventory' | 'pending' | 'batch'
    duplicateData?: any
  } | null>(null)
  const [editableAdditionalQty, setEditableAdditionalQty] = useState<string>("")
  const [batchMode, setBatchMode] = useState(false)
  const [editingBatchQuantity, setEditingBatchQuantity] = useState<Record<number, string>>({})
  const [editingBatchFields, setEditingBatchFields] = useState<Record<number, {
    field: 'partNumber' | 'mfgPartNumber' | 'description' | 'location' | 'package' | 'supplier' | 'reorderPoint'
    value: string
  }>>({})
  const [duplicateCheckTimeout, setDuplicateCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [showCustomSupplierInput, setShowCustomSupplierInput] = useState(false)
  const [customSupplierValue, setCustomSupplierValue] = useState("")
  const [showSupplierLookup, setShowSupplierLookup] = useState(false)
  const [supplierLookupPartNumber, setSupplierLookupPartNumber] = useState("")
  const [autoLookupTimeout, setAutoLookupTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isAutoLookingUp, setIsAutoLookingUp] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showTour, setShowTour] = useState(false)
  
  // Reorder dialog state
  const [showReorderDialog, setShowReorderDialog] = useState(false)
  const [reorderItem, setReorderItem] = useState<InventoryItem | null>(null)
  const [reorderFormData, setReorderFormData] = useState({
    quantity: "",
    timeframe: "1-2 weeks",
    urgency: "normal",
    notes: "",
    requester: ""
  })

  // Natural sort function for locations like H1-1, H1-2, etc.
  const naturalLocationSort = (str1: string, str2: string) => {
    const regex = /([A-Z]+)(\d+)-(\d+)/
    const match1 = str1.match(regex)
    const match2 = str2.match(regex)
    
    if (!match1 || !match2) {
      // Fallback to regular string comparison if pattern doesn't match
      return str1.localeCompare(str2)
    }
    
    const [, prefix1, shelf1, pos1] = match1
    const [, prefix2, shelf2, pos2] = match2
    
    // First compare prefixes (H, A, B, etc.)
    if (prefix1 !== prefix2) {
      return prefix1.localeCompare(prefix2)
    }
    
    // Then compare shelf numbers numerically
    const shelfDiff = parseInt(shelf1) - parseInt(shelf2)
    if (shelfDiff !== 0) {
      return shelfDiff
    }
    
    // Finally compare position numbers numerically
    return parseInt(pos1) - parseInt(pos2)
  }

  // Smart search normalization for electrical components
  const normalizeSearchTerm = (text: string): string => {
    if (!text) return ""
    
    return text
      .toLowerCase()
      .trim()
      // Normalize resistance units
      .replace(/\s*ω\s*/g, " ohm ")
      .replace(/\s*ohms?\s*/g, " ohm ")
      .replace(/\s*Ω\s*/g, " ohm ")
      // Normalize capacitance units
      .replace(/\s*μf\s*/g, " uf ")
      .replace(/\s*µf\s*/g, " uf ")
      .replace(/\s*microf\s*/g, " uf ")
      .replace(/\s*pf\s*/g, " pf ")
      .replace(/\s*nf\s*/g, " nf ")
      // Normalize voltage units
      .replace(/\s*volts?\s*/g, " v ")
      .replace(/\s*vdc\s*/g, " v ")
      .replace(/\s*vac\s*/g, " v ")
      // Normalize current units
      .replace(/\s*amps?\s*/g, " a ")
      .replace(/\s*amperes?\s*/g, " a ")
      .replace(/\s*ma\s*/g, " ma ")
      .replace(/\s*milliamps?\s*/g, " ma ")
      // Normalize frequency units
      .replace(/\s*hz\s*/g, " hz ")
      .replace(/\s*khz\s*/g, " khz ")
      .replace(/\s*mhz\s*/g, " mhz ")
      .replace(/\s*ghz\s*/g, " ghz ")
      // Normalize power units
      .replace(/\s*watts?\s*/g, " w ")
      .replace(/\s*milliwatts?\s*/g, " mw ")
      // Clean up multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  }

  const smartSearch = (item: InventoryItem, searchTerm: string): boolean => {
    const cleanSearchTerm = searchTerm.trim()
    if (!cleanSearchTerm) return true
    
    const normalizedSearchTerm = normalizeSearchTerm(cleanSearchTerm)
    
    // Check if this looks like a location pattern (H3, A2, B4-15, etc.)
    const isLocationPattern = /^[A-Z]\d+(-\d+)?$/i.test(cleanSearchTerm)
    
    if (isLocationPattern) {
      // For location patterns, ONLY search the location field
      const locationField = item.Location
      if (!locationField) return false
      
      const normalizedLocation = normalizeSearchTerm(locationField.toString())
      const locationRegex = new RegExp(`^${normalizedSearchTerm}(-|$)`, 'i')
      return locationRegex.test(normalizedLocation)
    }
    
    // For non-location searches, search all fields
    const searchFields = [
      { field: item["Part number"], type: 'text' },
      { field: item["Part description"], type: 'text' }, 
      { field: item.Location, type: 'location' },
      { field: item.Supplier, type: 'text' },
      { field: item.Package, type: 'text' },
      { field: item["MFG Part number"] || "", type: 'text' }
    ]
    
    // Bidirectional substring matching
    return searchFields.some(({ field }) => {
      if (!field) return false
      const normalizedField = normalizeSearchTerm(field.toString())
      return normalizedField.includes(normalizedSearchTerm) || normalizedSearchTerm.includes(normalizedField)
    })
  }

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
    requester: "",
  })

  useEffect(() => {
    loadInventoryFromDatabase()
    loadSettingsFromDatabase()
    loadPendingChanges()
    checkSlackConfiguration()
  }, [])

  // Extract unique suppliers from inventory
  useEffect(() => {
    const uniqueSuppliers = Array.from(new Set(
      inventory
        .map(item => item.Supplier)
        .filter(supplier => supplier && supplier.trim() !== "")
        .map(supplier => supplier.trim())
    )).sort()
    
    // Remove any duplicates that might exist
    const cleanSuppliers = Array.from(new Set(uniqueSuppliers))
    setSuppliers(cleanSuppliers)
  }, [inventory])

  // Location suggestion logic
  useEffect(() => {
    generateLocationSuggestion()
  }, [inventory, pendingChanges, batchEntryItems]) // Add batchEntryItems to dependencies

  const generateLocationSuggestion = async () => {
    try {
      // Get all current locations from inventory
      const currentLocations = inventory
        .map(item => item.Location)
        .filter(Boolean)
        .map(loc => loc.trim())

      console.log("📍 Current inventory locations:", currentLocations)

      // Get all pending locations from pending changes
      let pendingLocations: string[] = []
      try {
        const response = await fetch("/api/inventory/pending")
        if (response.ok) {
          const result = await response.json()
          if (result.success && Array.isArray(result.data)) {
            console.log("📍 Raw pending changes:", result.data)
            
            pendingLocations = result.data
              .map((change: any) => {
                // Check multiple possible change types and data structures
                if (change.item_data?.location) {
                  return change.item_data.location
                } else if (change.item_data?.Location) {
                  return change.item_data.Location
                } else if (change.location) {
                  return change.location
                } else if (change.Location) {
                  return change.Location
                }
                return null
              })
              .filter(Boolean)
              .map((loc: string) => loc.trim())
              
            console.log("📍 Extracted pending locations:", pendingLocations)
          }
        }
      } catch (error) {
        console.log("📍 Could not fetch pending changes for location suggestion:", error)
      }

      // Get all batch locations from current batch items
      const batchLocations = batchEntryItems
        .map(item => item.location)
        .filter(Boolean)
        .map(loc => loc.trim())

      console.log("📍 Current batch locations:", batchLocations)

      // Combine all locations
      const allLocations = [
        ...currentLocations, 
        ...pendingLocations,
        ...batchLocations // Include batch locations
      ]
      const uniqueAllLocations = Array.from(new Set(allLocations)).filter(Boolean)

      console.log("📍 All combined locations:", uniqueAllLocations)
      console.log("📍 Total unique locations found:", uniqueAllLocations.length)

      if (uniqueAllLocations.length === 0) {
        console.log("📍 No locations found, defaulting to H1-1")
        setSuggestedLocation("H1-1")
        return
      }

      // Natural sort function for locations like H1-1, H1-2, etc.
      const naturalLocationSort = (str1: string, str2: string) => {
        const regex = /([A-Z]+)(\d+)-(\d+)/
        const match1 = str1.match(regex)
        const match2 = str2.match(regex)
        
        if (!match1 || !match2) {
          return str1.localeCompare(str2)
        }
        
        const [, prefix1, shelf1, pos1] = match1
        const [, prefix2, shelf2, pos2] = match2
        
        if (prefix1 !== prefix2) {
          return prefix1.localeCompare(prefix2)
        }
        
        const shelfDiff = parseInt(shelf1) - parseInt(shelf2)
        if (shelfDiff !== 0) {
          return shelfDiff
        }
        
        return parseInt(pos1) - parseInt(pos2)
      }

      // Sort locations naturally
      const sortedLocations = uniqueAllLocations.sort((a, b) => {
        return naturalLocationSort(a, b)
      })

      console.log("📍 Sorted locations:", sortedLocations)

      // Find the highest location and suggest the next one
      const lastLocation = sortedLocations[sortedLocations.length - 1]
      console.log("📍 Last/highest location found:", lastLocation)

      const nextLocation = getNextLocation(lastLocation)
      console.log("📍 Suggested next location:", nextLocation)
      
      setSuggestedLocation(nextLocation || "H1-1")
    } catch (error) {
      console.error("📍 Error generating location suggestion:", error)
      setSuggestedLocation("H1-1")
    }
  }

  const getNextLocation = (currentLocation: string): string => {
    const regex = /([A-Z]+)(\d+)-(\d+)/
    const match = currentLocation.match(regex)
    
    if (!match) {
      console.log("📍 Location doesn't match expected pattern, defaulting to H1-1")
      return "H1-1"
    }
    
    const [, prefix, shelf, position] = match
    const shelfNum = parseInt(shelf)
    const posNum = parseInt(position)
    
    console.log(`📍 Parsing location: ${currentLocation} -> Prefix: ${prefix}, Shelf: ${shelfNum}, Position: ${posNum}`)
    
    // Increment position
    const nextPos = posNum + 1
    const nextLocation = `${prefix}${shelfNum}-${nextPos}`
    
    console.log(`📍 Next location calculated: ${nextLocation}`)
    
    return nextLocation
  }

  const refreshLocationSuggestion = async () => {
    await generateLocationSuggestion()
  }

  // Package type logic based on quantity
  const getPackageTypeFromQuantity = (quantity: number): string => {
    if (quantity >= 1 && quantity <= 100) {
      return "Exact"
    } else if (quantity >= 101 && quantity <= 500) {
      return "Estimated"
    } else if (quantity > 500) {
      return "Reel"
    }
    return "Exact" // Default fallback
  }

  const handleQuantityChange = (value: string) => {
    handleFormFieldChange('quantity', value)
    
    // Auto-update package type based on quantity
    const qty = parseInt(value)
    if (!isNaN(qty) && qty > 0) {
      const suggestedPackage = getPackageTypeFromQuantity(qty)
      // Always update package type based on quantity (override any existing package)
      handleFormFieldChange('package', suggestedPackage)
    }
  }

  // Get unique locations for analysis
  const uniqueLocations = useMemo(() => {
    const locations = inventory.map(item => item.Location).filter(Boolean)
    const uniqueLocations = Array.from(new Set(locations))
    return uniqueLocations.sort((a, b) => {
      const regex = /([A-Z]+)(\d+)-(\d+)/
      const matchA = a.match(regex)
      const matchB = b.match(regex)
      
      if (!matchA || !matchB) {
        return a.localeCompare(b)
      }
      
      const [, prefixA, shelfA, posA] = matchA
      const [, prefixB, shelfB, posB] = matchB
      
      if (prefixA !== prefixB) {
        return prefixA.localeCompare(prefixB)
      }
      
      const shelfDiff = parseInt(shelfA) - parseInt(shelfB)
      if (shelfDiff !== 0) {
        return shelfDiff
      }
      
      return parseInt(posA) - parseInt(posB)
    })
  }, [inventory])

  // Get location statistics
  const locationStats = useMemo(() => {
    const stats = {
      totalLocations: uniqueLocations.length,
      shelves: new Set<string>(),
      maxShelf: 0,
      maxPosition: 0
    }

    uniqueLocations.forEach(location => {
      const regex = /([A-Z]+)(\d+)-(\d+)/
      const match = location.match(regex)
      if (match) {
        const [, prefix, shelf, position] = match
        const shelfNum = parseInt(shelf)
        const posNum = parseInt(position)
        
        stats.shelves.add(`${prefix}${shelf}`)
        stats.maxShelf = Math.max(stats.maxShelf, shelfNum)
        stats.maxPosition = Math.max(stats.maxPosition, posNum)
      }
    })

    return stats
  }, [uniqueLocations])

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
          // Check for items with empty QTY and log them
          const itemsWithEmptyQty = result.data.filter(item => 
            item.QTY === null || item.QTY === undefined || item.QTY === '' || isNaN(item.QTY)
          )
          
          if (itemsWithEmptyQty.length > 0) {
            console.warn(`⚠️ Found ${itemsWithEmptyQty.length} items with empty/invalid QTY:`, itemsWithEmptyQty)
          }
          
          // Clean the data by ensuring QTY is always a number
          const cleanedData = result.data.map(item => ({
            ...item,
            QTY: item.QTY && !isNaN(item.QTY) ? Number(item.QTY) : 0
          }))
          
          setInventory(cleanedData)
          setShowUpload(cleanedData.length === 0)
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
          // Merge with defaults to ensure all properties exist
          setAlertSettings(prev => ({
            defaultReorderPoint: result.data.defaultReorderPoint ?? prev.defaultReorderPoint,
            lowStockThreshold: result.data.lowStockThreshold ?? prev.lowStockThreshold,
            enableSlackNotifications: result.data.enableSlackNotifications ?? prev.enableSlackNotifications,
            slackWebhookUrl: result.data.slackWebhookUrl ?? prev.slackWebhookUrl,
          }))
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error)
      // Keep default settings if loading fails
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
      const response = await fetch("/api/inventory/add-item", {
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
        item.reorderPoint || alertSettings.defaultReorderPoint || 10
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

  const handleEndpointsAccess = async () => {
    const password = prompt("Enter password to access All Endpoints:")
    if (!password) return

    try {
      const response = await fetch("/api/auth/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, type: "approval" })
      })

      const result = await response.json()
      
      if (result.success) {
        window.open('/endpoints', '_blank')
      } else {
        alert("❌ Incorrect password")
      }
    } catch (error) {
      console.error("Authentication error:", error)
      alert("❌ Authentication failed")
    }
  }

  const handleUploadAccess = async () => {
    const password = prompt("Enter password to upload new Excel file:")
    if (!password) return

    try {
      const response = await fetch("/api/auth/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, type: "approval" })
      })

      const result = await response.json()
      
      if (result.success) {
        setShowUpload(true)
      } else {
        alert("❌ Incorrect password")
      }
    } catch (error) {
      console.error("Authentication error:", error)
      alert("❌ Authentication failed")
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
    // Validate requester field
    if (!newItem.requester.trim()) {
      setShowRequesterWarning(true)
      return
    }

    // Check for comprehensive duplicates
    const duplicateCheck = await checkForComprehensiveDuplicate(newItem.partNumber)
    
    if (duplicateCheck) {
      setDuplicatePartInfo({
        partNumber: newItem.partNumber,
        mfgPartNumber: newItem.mfgPartNumber,
        description: newItem.description,
        newQuantity: parseInt(newItem.quantity) || 0,
        location: newItem.location,
        supplier: newItem.supplier,
        package: newItem.package,
        reorderPoint: parseInt(newItem.reorderPoint) || alertSettings.defaultReorderPoint || 10,
        existingItem: duplicateCheck.data,
        duplicateSource: duplicateCheck.source,
        duplicateData: duplicateCheck
      })
      setEditableAdditionalQty(newItem.quantity || "0")
      setShowDuplicateDialog(true)
      return
    }

    try {
      const itemData = {
        "Part number": newItem.partNumber,
        "MFG Part number": newItem.mfgPartNumber || "",
        "Part description": newItem.description,
        QTY: parseInt(newItem.quantity) || 0,
        Location: newItem.location,
        Supplier: newItem.supplier,
        Package: newItem.package,
        reorderPoint: parseInt(newItem.reorderPoint) || alertSettings.defaultReorderPoint || 10,
      }

      await addInventoryItem(itemData, newItem.requester.trim())
      
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
        requester: "",
      })
      
      // Reset form state
      setShowCustomLocationInput(false)
      setCustomLocationValue("")
      setShowCustomPackageInput(false)
      setCustomPackageValue("")
      setShowCustomSupplierInput(false)
      setCustomSupplierValue("")
      setAddItemFormModified(false)
      setShowRequesterWarning(false)
      
      setAddItemDialogOpen(false)
      alert("Item submitted for approval!")
      
      // Refresh location suggestion for next item
      await generateLocationSuggestion()
    } catch (error) {
      console.error("Failed to add item:", error)
      alert("Failed to add item. Please try again.")
    }
  }

  const handleBatchUpload = async () => {
    // Validate required fields
    if (!newItem.requester.trim()) {
      setShowRequesterWarning(true)
      return
    }
    if (!newItem.partNumber.trim() || !newItem.description.trim() || !newItem.quantity.trim()) {
      alert("Please fill in all required fields (Requester, Part Number, Description, Quantity)")
      return
    }

    // Check for comprehensive duplicates
    const duplicateCheck = await checkForComprehensiveDuplicate(newItem.partNumber)
    
    if (duplicateCheck) {
      setDuplicatePartInfo({
        partNumber: newItem.partNumber,
        mfgPartNumber: newItem.mfgPartNumber,
        description: newItem.description,
        newQuantity: parseInt(newItem.quantity) || 0,
        location: newItem.location,
        supplier: newItem.supplier,
        package: newItem.package,
        reorderPoint: parseInt(newItem.reorderPoint) || alertSettings.defaultReorderPoint || 10,
        existingItem: duplicateCheck.data,
        duplicateSource: duplicateCheck.source,
        duplicateData: duplicateCheck
      })
      setEditableAdditionalQty(newItem.quantity || "0")
      setShowDuplicateDialog(true)
      return
    }

    // Add to batch
    const batchItem = {
      partNumber: newItem.partNumber,
      mfgPartNumber: newItem.mfgPartNumber,
      description: newItem.description,
      quantity: newItem.quantity,
      location: newItem.location,
      supplier: newItem.supplier,
      package: newItem.package,
      reorderPoint: newItem.reorderPoint || alertSettings.defaultReorderPoint || 10,
      requester: newItem.requester
    }

    setBatchEntryItems(prev => [...prev, batchItem])

    // Clear form but keep requester and enter batch mode
    const requesterName = newItem.requester
    setNewItem({
      partNumber: "",
      mfgPartNumber: "",
      description: "",
      quantity: "",
      location: "",
      supplier: "",
      package: "",
      reorderPoint: "",
      requester: requesterName, // Keep requester for next item
    })

    // Reset form state but enter batch mode
    setShowCustomLocationInput(false)
    setCustomLocationValue("")
    setShowCustomPackageInput(false)
    setCustomPackageValue("")
    setShowCustomSupplierInput(false)
    setCustomSupplierValue("")
    setShowRequesterWarning(false)
    setBatchMode(true) // Enter batch mode
    
    // Refresh location suggestion for next item
    await generateLocationSuggestion()
  }

  const handleSubmitBatch = async () => {
    if (batchEntryItems.length === 0) {
      alert("No items in batch to submit")
      return
    }

    try {
      const requesterName = batchEntryItems[0]?.requester
      if (!requesterName) {
        alert("Missing requester information")
        return
      }

      // Submit the entire batch as a single batch request
      const response = await fetch("/api/inventory/batch-add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batch_items: batchEntryItems.map(item => ({
            part_number: item.partNumber,
            mfg_part_number: item.mfgPartNumber || "",
            part_description: item.description,
            quantity: parseInt(item.quantity) || 0,
            location: item.location,
            supplier: item.supplier,
            package: item.package,
            reorder_point: item.reorderPoint,
          })),
          requester: requesterName,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Unknown error occurred")
      }

      alert(`✅ Batch submitted! ${batchEntryItems.length} items submitted for batch approval.`)

      // Clear batch and close dialog
      setBatchEntryItems([])
      setBatchMode(false)
      setAddItemDialogOpen(false)
      
      // Refresh data
      await loadInventoryFromDatabase()
      await loadPendingChanges()
      await generateLocationSuggestion()
    } catch (error) {
      console.error("Failed to submit batch:", error)
      alert("Failed to submit batch. Please try again.")
    }
  }

  const handleBatchQuantityEdit = (index: number, newQuantity: string) => {
    setEditingBatchQuantity(prev => ({
      ...prev,
      [index]: newQuantity
    }))
  }

  const handleBatchQuantityUpdate = (index: number) => {
    const newQuantity = editingBatchQuantity[index]
    if (newQuantity && !isNaN(parseInt(newQuantity)) && parseInt(newQuantity) > 0) {
      setBatchEntryItems(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, quantity: newQuantity } : item
        )
      )
      setEditingBatchQuantity(prev => {
        const updated = { ...prev }
        delete updated[index]
        return updated
      })
    }
  }

  const handleBatchQuantityCancel = (index: number) => {
    setEditingBatchQuantity(prev => {
      const updated = { ...prev }
      delete updated[index]
      return updated
    })
  }

  // New handlers for editing all batch fields
  const handleBatchFieldEdit = (index: number, field: 'partNumber' | 'mfgPartNumber' | 'description' | 'location' | 'package' | 'supplier' | 'reorderPoint', currentValue: string) => {
    setEditingBatchFields(prev => ({
      ...prev,
      [index]: { field, value: currentValue }
    }))
  }

  const handleBatchFieldUpdate = (index: number) => {
    const editingField = editingBatchFields[index]
    if (!editingField) return

    const { field, value } = editingField
    
    // Validate the input based on field type
    if (field === 'reorderPoint' && value && (isNaN(parseInt(value)) || parseInt(value) < 0)) {
      alert('Reorder point must be a valid number')
      return
    }

    setBatchEntryItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    )
    
    setEditingBatchFields(prev => {
      const updated = { ...prev }
      delete updated[index]
      return updated
    })
  }

  const handleBatchFieldCancel = (index: number) => {
    setEditingBatchFields(prev => {
      const updated = { ...prev }
      delete updated[index]
      return updated
    })
  }

  const checkForDuplicateInBatch = (partNumber: string): number => {
    return batchEntryItems.findIndex(
      item => item.partNumber.toLowerCase() === partNumber.toLowerCase()
    )
  }

  // Edit item functions
  const handleEditItem = (item: InventoryItem) => {
    setEditFormData(prev => ({
      ...prev,
      [item.id]: {
        partNumber: item["Part number"],
        mfgPartNumber: item["MFG Part number"] || "",
        description: item["Part description"],
        quantity: (item.QTY || 0).toString(),
        location: item.Location,
        supplier: item.Supplier,
        package: item.Package,
        reorderPoint: (item.reorderPoint || alertSettings.defaultReorderPoint || 10).toString()
      }
    }))
    setEditDialogOpen(prev => ({
      ...prev,
      [item.id]: true
    }))
  }

  const handleEditFormChange = (itemId: string, field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }))
  }

  const handleSubmitEdit = async (itemId: string) => {
    const formData = editFormData[itemId]
    if (!formData) return

    const requesterName = prompt("Enter your name for approval tracking:")
    if (!requesterName) return

    try {
      console.log('Submitting edit with data:', { itemId, formData, requesterName })
      
      const response = await fetch("/api/inventory/edit-item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId,
          changes: formData,
          requester: requesterName,
        }),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error text:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('Response result:', result)
      
      if (!result.success) {
        throw new Error(result.error || "Unknown error occurred")
      }

      alert("Item changes submitted for approval!")
      setEditDialogOpen(prev => ({
        ...prev,
        [itemId]: false
      }))
      setEditFormData(prev => {
        const updated = { ...prev }
        delete updated[itemId]
        return updated
      })
      await loadPendingChanges()
    } catch (error) {
      console.error("Edit item failed:", error)
      alert("Failed to submit changes. Error: " + (error as Error).message)
    }
  }

  const checkForComprehensiveDuplicate = async (partNumber: string) => {
    const normalizedPartNumber = normalizeSearchTerm(partNumber)

    // Check inventory first
    const inventoryDuplicate = inventory.find(
      item => normalizeSearchTerm(item["Part number"]) === normalizedPartNumber
    )

    if (inventoryDuplicate) {
      return {
        source: 'inventory' as const,
        data: inventoryDuplicate
      }
    }

    // Check pending approvals
    try {
      const response = await fetch("/api/inventory/pending")
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          const pendingDuplicate = result.data.find((change: any) => {
            const changePartNumber = change.item_data?.part_number || 
                                   change.item_data?.["Part number"] ||
                                   change.item_data?.partNumber
            return changePartNumber && normalizeSearchTerm(changePartNumber) === normalizedPartNumber
          })

          if (pendingDuplicate) {
            return {
              source: 'pending' as const,
              data: pendingDuplicate
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking pending duplicates:", error)
    }

    // Check batch items
    const batchDuplicateIndex = batchEntryItems.findIndex(
      item => normalizeSearchTerm(item.partNumber) === normalizedPartNumber
    )
    if (batchDuplicateIndex !== -1) {
      return {
        source: 'batch' as const,
        data: batchEntryItems[batchDuplicateIndex],
        index: batchDuplicateIndex
      }
    }

    return null
  }

  const handleRealTimeDuplicateCheck = async (partNumber: string) => {
    if (!partNumber.trim() || partNumber.length < 2) {
      return // Don't check very short part numbers
    }

    // Clear existing timeout
    if (duplicateCheckTimeout) {
      clearTimeout(duplicateCheckTimeout)
    }

    // Set new timeout for debounced checking
    const timeout = setTimeout(async () => {
      setIsCheckingDuplicate(true)
      try {
        const duplicateCheck = await checkForComprehensiveDuplicate(partNumber)
        
        if (duplicateCheck) {
          setDuplicatePartInfo({
            partNumber: partNumber,
            mfgPartNumber: newItem.mfgPartNumber,
            description: newItem.description,
            newQuantity: parseInt(newItem.quantity) || 0,
            location: newItem.location,
            supplier: newItem.supplier,
            package: newItem.package,
            reorderPoint: parseInt(newItem.reorderPoint) || alertSettings.defaultReorderPoint || 10,
            existingItem: duplicateCheck.data,
            duplicateSource: duplicateCheck.source,
            duplicateData: duplicateCheck
          })
          setEditableAdditionalQty(newItem.quantity || "0")
          setShowDuplicateDialog(true)
        }
      } catch (error) {
        console.error("Error in real-time duplicate check:", error)
      } finally {
        setIsCheckingDuplicate(false)
      }
    }, 800) // 800ms delay after user stops typing

    setDuplicateCheckTimeout(timeout)
  }

  const handleAddStockToExisting = async (duplicateInfo: any, additionalQuantity: number) => {
    try {
      console.log('handleAddStockToExisting called with:', { duplicateInfo, additionalQuantity })
      
      // Validate requester field
      if (!newItem.requester.trim()) {
        setShowRequesterWarning(true)
        return
      }
      
      if (duplicateInfo.source === 'inventory') {
        console.log('Adding stock to inventory item:', duplicateInfo.data)
        
        // Add stock to existing inventory item
        const requestBody = {
          itemId: duplicateInfo.data.id,
          additionalQuantity: additionalQuantity,
          requester: newItem.requester.trim(),
          partNumber: duplicateInfo.data["Part number"] || newItem.partNumber
        }
        
        console.log('Request body:', requestBody)
        
        const response = await fetch("/api/inventory/add-stock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        console.log('Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Response error:', errorText)
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const result = await response.json()
        console.log('Response result:', result)
        
        if (!result.success) {
          throw new Error(result.error || "Unknown error occurred")
        }

        alert(`✅ Stock addition submitted for approval! Adding ${additionalQuantity} to existing inventory.`)
        
      } else if (duplicateInfo.source === 'pending') {
        // Add stock to pending approval item
        const response = await fetch("/api/inventory/add-stock-pending", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pendingId: duplicateInfo.data.id,
            additionalQuantity: additionalQuantity,
            requester: newItem.requester.trim(),
            partNumber: newItem.partNumber
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || "Unknown error occurred")
        }

        alert(`✅ Stock addition submitted for approval! Adding ${additionalQuantity} to pending item.`)
        
      } else if (duplicateInfo.source === 'batch') {
        // Update batch item directly
        const currentQty = parseInt(duplicateInfo.data.quantity) || 0
        const newTotalQty = currentQty + additionalQuantity

        setBatchEntryItems(prev => 
          prev.map((item, i) => 
            i === duplicateInfo.index 
              ? { ...item, quantity: newTotalQty.toString() }
              : item
          )
        )

        alert(`✅ Added ${additionalQuantity} to batch item! New total: ${newTotalQty}`)
      }

      // Refresh data
      await loadInventoryFromDatabase()
      await loadPendingChanges()
      
    } catch (error) {
      console.error("Failed to add stock:", error)
      alert("Failed to add stock. Please try again.")
    }
  }

  const handleQuantityIncrement = async (itemId: string, currentQuantity: number, increment: number) => {
    const newQuantity = Math.max(0, currentQuantity + increment)
    const requesterName = prompt("Enter your name for approval tracking:")
    if (!requesterName) return

    try {
      await updateItemQuantity(itemId, newQuantity, requesterName)
      alert(`Quantity ${increment > 0 ? 'increase' : 'decrease'} submitted for approval!`)
    } catch (error) {
      console.error("Failed to update quantity:", error)
      alert("Failed to update quantity. Please try again.")
    }
  }

  const handleAddItemDialogOpen = (open: boolean) => {
    if (!open && addItemFormModified) {
      // Check if user is trying to close with unsaved changes
      const hasContent = Object.values(newItem).some(value => value.trim() !== "")
      if (hasContent) {
        const confirmClose = window.confirm(
          "You have unsaved changes. Are you sure you want to close without submitting?"
        )
        if (!confirmClose) {
          return // Don't close the dialog
        }
      }
    }

    setAddItemDialogOpen(open)
    if (!open) {
      // Clear duplicate check timeout
      if (duplicateCheckTimeout) {
        clearTimeout(duplicateCheckTimeout)
        setDuplicateCheckTimeout(null)
      }
      
      // Clear auto-lookup timeout
      if (autoLookupTimeout) {
        clearTimeout(autoLookupTimeout)
        setAutoLookupTimeout(null)
      }
      
      // Reset all form state when closing
      setShowCustomLocationInput(false)
      setCustomLocationValue("")
      setShowCustomPackageInput(false)
      setCustomPackageValue("")
      setShowCustomSupplierInput(false)
      setCustomSupplierValue("")
      setAddItemFormModified(false)
      setShowRequesterWarning(false)
      setBatchMode(false)
      setBatchEntryItems([])
      setEditingBatchQuantity({})
      setEditingBatchFields({})
      setIsCheckingDuplicate(false)
      setIsAutoLookingUp(false)
      
      // Reset form data
      setNewItem({
        partNumber: "",
        mfgPartNumber: "",
        description: "",
        quantity: "",
        location: "",
        supplier: "",
        package: "",
        reorderPoint: "",
        requester: "",
      })
    }
  }

  const handleFormFieldChange = (field: string, value: string) => {
    setNewItem(prev => ({ ...prev, [field]: value }))
    setAddItemFormModified(true)
    
    // Clear requester warning when user starts typing in requester field
    if (field === 'requester' && showRequesterWarning) {
      setShowRequesterWarning(false)
    }

    // Trigger real-time duplicate check for part number
    if (field === 'partNumber') {
      handleRealTimeDuplicateCheck(value)
      // Also trigger auto-lookup for supplier data
      handleAutoLookup(value)
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
      // Use smart search instead of basic string matching
      const matchesSearch = smartSearch(item, searchTerm)

      const matchesCategory = categoryFilter === "all" || 
        (categoryFilter === "low" && (() => {
          const reorderPoint = item.reorderPoint || alertSettings.defaultReorderPoint || 10
          return item.QTY <= reorderPoint
        })()) ||
        (categoryFilter === "approaching" && (() => {
          const reorderPoint = item.reorderPoint || alertSettings.defaultReorderPoint || 10
          return item.QTY > reorderPoint && item.QTY <= reorderPoint * 1.5
        })())

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
        case "description":
          aValue = a["Part description"]
          bValue = b["Part description"]
          break
        case "location":
          aValue = a.Location
          bValue = b.Location
          break
        case "supplier":
          aValue = a.Supplier
          bValue = b.Supplier
          break
        case "package":
          aValue = a.Package
          bValue = b.Package
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
        // Use natural sorting for location field
        if (sortBy === "location") {
          const naturalCompare = naturalLocationSort(aValue, bValue)
          return sortOrder === "asc" ? naturalCompare : -naturalCompare
        } else {
          // Use regular string comparison for other fields
          return sortOrder === "asc" 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }
      } else {
        return sortOrder === "asc" 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })

    return filtered
  }, [inventory, searchTerm, categoryFilter, sortBy, sortOrder, alertSettings.defaultReorderPoint])

  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => {
      const reorderPoint = item.reorderPoint || alertSettings.defaultReorderPoint || 10
      return item.QTY <= reorderPoint // Only items at or below reorder point
    })
  }, [inventory, alertSettings.defaultReorderPoint])

  const getStockStatus = (item: InventoryItem) => {
    const reorderPoint = item.reorderPoint || alertSettings.defaultReorderPoint || 10
    
    if (item.QTY <= reorderPoint) {
      return { status: "low", color: "destructive" as const }
    } else if (item.QTY <= reorderPoint * 1.5) {
      return { status: "approaching", color: "secondary" as const }
    } else {
      return { status: "good", color: "default" as const }
    }
  }

  // Check if an item has pending changes awaiting approval
  const hasPendingApproval = (item: InventoryItem) => {
    return pendingChanges.some(change => 
      change.status === 'pending' && 
      (
        // Check if it's an edit for this specific item
        (change.item_data?.item_id === item.id) ||
        // Check if it's an add/stock change for this part number
        (change.item_data?.part_number === item["Part number"])
      )
    )
  }

  const handleAutoLookup = async (partNumber: string) => {
    if (!partNumber.trim() || partNumber.length < 3) {
      return // Don't lookup very short part numbers
    }

    // Clear existing timeout
    if (autoLookupTimeout) {
      clearTimeout(autoLookupTimeout)
    }

    // Set new timeout for debounced lookup (reduced to 500ms for faster response)
    const timeout = setTimeout(async () => {
      setIsAutoLookingUp(true)
      try {
        console.log('🔍 Auto-looking up part:', partNumber)
        
        const response = await fetch('/api/supplier-lookup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            partNumber: partNumber.trim(),
            suppliers: ['digikey', 'mouser']
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.results && data.results.length > 0) {
            const firstResult = data.results[0]
            console.log('✅ Auto-lookup found result:', firstResult)
            
            // Extract fields with fallbacks
            const mfgPartNumber = firstResult.manufacturerPartNumber || firstResult.partNumber || ""
            let description = typeof firstResult.description === 'object' 
              ? (firstResult.description.ProductDescription || firstResult.description.DetailedDescription || "")
              : (firstResult.description || "")
            
            // If description is empty, create one from manufacturer and part number
            if (!description && firstResult.manufacturer && mfgPartNumber) {
              description = `${firstResult.manufacturer} ${mfgPartNumber}`
            }
            
            const packageType = firstResult.packageType || firstResult.package || ""
            
            // Determine supplier with fallbacks
            let supplierName = firstResult.supplier
            if (!supplierName) {
              // Fallback: guess from part number format
              if (partNumber.includes('-ND') || partNumber.includes('-CT') || partNumber.includes('-TR')) {
                supplierName = 'Digi-Key'
              } else if (partNumber.match(/^\d+-/)) {
                supplierName = 'Mouser'
              } else {
                supplierName = 'Unknown'
              }
            }
            
            console.log('🔧 About to set supplier field:', {
              supplierFromResult: firstResult.supplier,
              supplierFallback: supplierName,
              partNumber: partNumber,
              resultKeys: Object.keys(firstResult)
            })
            
            // Always overwrite fields with supplier data
            setNewItem(prev => ({
              ...prev,
              partNumber: firstResult.partNumber || partNumber.toUpperCase(), // Use API part number or uppercase input
              mfgPartNumber: mfgPartNumber,
              description: description,
              supplier: supplierName, // Use determined supplier name
              // Don't override package - let quantity-based logic handle it
              package: prev.package // Keep existing package (quantity-based)
            }))
            
            // Add the supplier to the suppliers list if it's not already there
            if (supplierName && !suppliers.includes(supplierName)) {
              setSuppliers(prev => {
                const updated = [...prev, supplierName]
                // Remove duplicates and sort
                return Array.from(new Set(updated)).sort()
              })
            }
            
            setAddItemFormModified(true)
            
            // Show success feedback
            console.log('✅ Auto-populated fields:', {
              mfgPartNumber: mfgPartNumber,
              description: description,
              supplier: supplierName, // Show the determined supplier
              package: packageType,
              supplierFromResult: firstResult.supplier,
              allAvailableFields: Object.keys(firstResult)
            })
          } else {
            console.log('⚠️ No results found for part:', partNumber)
          }
        } else {
          console.error('❌ Auto-lookup API error:', response.status)
        }
      } catch (error) {
        console.error('❌ Auto-lookup error:', error)
      } finally {
        setIsAutoLookingUp(false)
      }
    }, 500) // Reduced from 1000ms to 500ms for faster response

    setAutoLookupTimeout(timeout)
  }

  const handleSupplierLookupResult = (result: any) => {
    // Pre-fill the add item form with supplier data
    setNewItem(prev => ({
      ...prev,
      partNumber: result.manufacturerPartNumber || result.partNumber || "",
      mfgPartNumber: result.manufacturerPartNumber || "",
      description: result.description || "",
      supplier: result.manufacturer || result.supplier || "",
      package: result.packageType || ""
    }))
    
    // Close supplier lookup and open add item dialog
    setShowSupplierLookup(false)
    setAddItemDialogOpen(true)
    setAddItemFormModified(true)
  }

  const handleReorderClick = (item: InventoryItem) => {
    setReorderItem(item)
    setReorderFormData({
      quantity: (item.reorderPoint || alertSettings.defaultReorderPoint || 10).toString(),
      timeframe: "1-2 weeks",
      urgency: item.QTY === 0 ? "urgent" : "normal",
      notes: "",
      requester: ""
    })
    setShowReorderDialog(true)
  }

  const handleReorderSubmit = async () => {
    if (!reorderItem || !reorderFormData.requester.trim()) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const response = await fetch("/api/reorder-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partNumber: reorderItem["Part number"],
          description: reorderItem["Part description"],
          currentQty: reorderItem.QTY,
          reorderPoint: reorderItem.reorderPoint || alertSettings.defaultReorderPoint || 10,
          supplier: reorderItem.Supplier,
          location: reorderItem.Location,
          quantity: parseInt(reorderFormData.quantity) || 0,
          timeframe: reorderFormData.timeframe,
          urgency: reorderFormData.urgency,
          requester: reorderFormData.requester,
          notes: reorderFormData.notes
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Send Slack notification
        try {
          await fetch("/api/slack/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: `🛒 **Reorder Request Submitted**\n\n**Part:** ${reorderItem["Part number"]} - ${reorderItem["Part description"]}\n**Current Stock:** ${reorderItem.QTY}\n**Requested Qty:** ${reorderFormData.quantity}\n**Urgency:** ${reorderFormData.urgency.toUpperCase()}\n**Timeframe:** ${reorderFormData.timeframe}\n**Requester:** ${reorderFormData.requester}\n**Notes:** ${reorderFormData.notes || "None"}\n\n**Request ID:** ${result.requestId}`,
              channel: "#inventory-alerts"
            })
          })
        } catch (slackError) {
          console.error("Failed to send Slack notification:", slackError)
        }

        alert("Reorder request submitted successfully!")
        setShowReorderDialog(false)
        setReorderItem(null)
        setReorderFormData({
          quantity: "",
          timeframe: "1-2 weeks", 
          urgency: "normal",
          notes: "",
          requester: ""
        })
      } else {
        throw new Error("Failed to submit reorder request")
      }
    } catch (error) {
      console.error("Reorder request failed:", error)
      alert("Failed to submit reorder request")
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
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management System</h1>
          <p className="text-muted-foreground">Managing {inventory.length} inventory items</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => handleAddItemDialogOpen(true)} className="flex items-center gap-2" data-tour="add-item-btn">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
          <Button variant="outline" onClick={() => setShowSupplierLookup(true)} className="flex items-center gap-2" data-tour="supplier-lookup-btn">
            <Globe className="h-4 w-4" />
            Supplier Lookup
          </Button>
          <Button variant="outline" onClick={() => window.open('/help', '_blank')} className="flex items-center gap-2" data-tour="help-btn">
            <HelpCircle className="h-4 w-4" />
            Help
          </Button>
          <Button variant="outline" onClick={() => setShowHelpModal(true)} className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Quick Help
          </Button>
          <Button variant="outline" onClick={() => setShowTour(true)} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Take Tour
          </Button>
          <Button variant="outline" onClick={handleDownloadExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          <Button variant="outline" onClick={handleUploadAccess} className="flex items-center gap-2">
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
          <Button variant="outline" onClick={() => window.open('/reorder-status', '_blank')}>
            Reorder Status
          </Button>
          <Button variant="outline" onClick={handleEndpointsAccess}>
            All Endpoints
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stock Status Definitions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">i</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Stock Status Definitions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                <span className="text-blue-800">At or below reorder point - Order immediately</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Approaching Low</Badge>
                <span className="text-blue-800">Within 50% above reorder point - Monitor closely</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs px-2 py-1 bg-gray-100 rounded">-</span>
                <span className="text-blue-800">Good stock - More than 50% above reorder point</span>
              </div>
            </div>
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="stats-cards">
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
            <Button 
              variant="outline" 
              size="sm"
              className="mt-2 w-full"
              onClick={() => window.open('/low-stock', '_blank')}
            >
              View Low Stock Page
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingChanges.filter(change => change.status === 'pending').length}</div>
            <Button 
              variant="outline" 
              size="sm"
              className="mt-2 w-full"
              onClick={() => window.open('/approvals', '_blank')}
            >
              View Approvals Page
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending Changes Display */}
      {pendingChanges.filter(change => change.status === 'pending').length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Pending Approvals ({pendingChanges.filter(change => change.status === 'pending').length})
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('/approvals', '_blank')}
            >
              View Approvals Page
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50">
              {pendingChanges
                .filter(change => change.status === 'pending')
                .slice(0, 10)
                .map((change) => (
                <div key={change.id} className="bg-white p-3 rounded border shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {change.item_data?.part_number || 'N/A'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          change.change_type === 'add' ? 'bg-green-100 text-green-800' :
                          change.change_type === 'update' ? 'bg-blue-100 text-blue-800' :
                          change.change_type === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {change.change_type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {change.change_type === 'update' && change.item_data?.additional_quantity ? 
                          `Stock Addition: +${change.item_data.additional_quantity} (${change.item_data.current_quantity} → ${change.item_data.new_total_quantity})` :
                          change.item_data?.part_description || 'No description'
                        }
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>👤 {change.requested_by || change.requester || 'Unknown'}</span>
                        {change.item_data?.location && (
                          <span>📍 {change.item_data.location}</span>
                        )}
                        {change.item_data?.quantity && (
                          <span>📦 Qty: {change.item_data.quantity}</span>
                        )}
                        <span>🕒 {change.created_at ? new Date(change.created_at).toLocaleDateString() : 'Invalid Date'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {pendingChanges.filter(change => change.status === 'pending').length > 10 && (
                <div className="text-center py-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open('/approvals', '_blank')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View {pendingChanges.filter(change => change.status === 'pending').length - 10} more pending changes...
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search parts (add space after term for exact match: 'H3-15 ')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            data-tour="search-bar"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low">Low Stock Only</SelectItem>
            <SelectItem value="approaching">Approaching Low Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="part_number">Part Number</SelectItem>
            <SelectItem value="description">Description</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="package">Package</SelectItem>
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
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
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
                  const awaitingApproval = hasPendingApproval(item)
                  
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
                        {awaitingApproval ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            Awaiting Approval
                          </Badge>
                        ) : (
                          <>
                            {stockStatus.status === "low" && (
                              <Badge variant="destructive">
                                Low Stock
                              </Badge>
                            )}
                            {stockStatus.status === "approaching" && (
                              <Badge variant="secondary">
                                Approaching Low
                              </Badge>
                            )}
                            {stockStatus.status === "good" && (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2">
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditItem(item)}
                            className="h-6 px-2"
                            title="Edit all item details"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReorderClick(item)}
                            className="h-6 px-1 text-xs"
                            title="Request reorder"
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
                            title="Delete item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={handleAddItemDialogOpen}>
        <DialogContent className={`${batchMode && batchEntryItems.length > 0 ? 'max-w-6xl' : 'max-w-lg'} max-h-[95vh] flex flex-col`}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Add a new item to the inventory
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Requester Warning */}
            {showRequesterWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Requester name is required for submission. Please enter your name.
                </AlertDescription>
              </Alert>
            )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="requester">Requester Name *</Label>
              <Input
                id="requester"
                value={newItem.requester}
                onChange={(e) => handleFormFieldChange('requester', e.target.value)}
                placeholder="Enter your name"
                className={showRequesterWarning ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your name for approval tracking
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="part-number">Part Number *</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Auto-populates from Digi-Key & Mouser</p>
                    <p>Digi-Key: ends in -ND, -CT, -TR</p>
                    <p>Mouser: starts with numbers</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="relative">
                <Input
                  id="part-number"
                  value={newItem.partNumber}
                  onChange={(e) => handleFormFieldChange('partNumber', e.target.value)}
                  placeholder="Enter part number (auto-fills from Digi-Key & Mouser)"
                  className={isCheckingDuplicate || isAutoLookingUp ? "pr-8" : ""}
                />
                {(isCheckingDuplicate || isAutoLookingUp) && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              {isCheckingDuplicate && (
                <p className="text-xs text-blue-600 mt-1">
                  Checking for duplicates...
                </p>
              )}
              {isAutoLookingUp && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Searching Digi-Key & Mouser for part info...
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="mfg-part-number">MFG Part Number</Label>
              <Input
                id="mfg-part-number"
                value={newItem.mfgPartNumber}
                onChange={(e) => handleFormFieldChange('mfgPartNumber', e.target.value)}
                placeholder="Enter manufacturer part number"
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={newItem.description}
                onChange={(e) => handleFormFieldChange('description', e.target.value)}
                placeholder="Enter description"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={newItem.quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="Enter quantity"
              />
              {newItem.quantity && !isNaN(parseInt(newItem.quantity)) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Suggested package: {getPackageTypeFromQuantity(parseInt(newItem.quantity))}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              {showCustomLocationInput ? (
                <div className="flex gap-2">
                  <Input
                    id="location"
                    value={customLocationValue}
                    onChange={(e) => {
                      setCustomLocationValue(e.target.value)
                      setAddItemFormModified(true)
                    }}
                    placeholder="Enter custom location"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleFormFieldChange('location', customLocationValue)
                      setShowCustomLocationInput(false)
                      setCustomLocationValue("")
                    }}
                    disabled={!customLocationValue.trim()}
                  >
                    Use
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCustomLocationInput(false)
                      setCustomLocationValue("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select
                  value={newItem.location}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setShowCustomLocationInput(true)
                    } else {
                      handleFormFieldChange('location', value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or enter location" />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedLocation && (
                      <SelectItem value={suggestedLocation}>
                        🎯 {suggestedLocation} (Suggested)
                      </SelectItem>
                    )}
                    <Separator />
                    {uniqueLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        📍 {location}
                      </SelectItem>
                    ))}
                    <Separator />
                    <SelectItem value="custom">
                      ✏️ Custom Location...
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {newItem.location && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {newItem.location}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              {showCustomSupplierInput ? (
                <div className="flex gap-2">
                  <Input
                    id="supplier"
                    value={customSupplierValue}
                    onChange={(e) => setCustomSupplierValue(e.target.value)}
                    placeholder="Enter new supplier"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleFormFieldChange('supplier', customSupplierValue)
                        setShowCustomSupplierInput(false)
                        setCustomSupplierValue("")
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      handleFormFieldChange('supplier', customSupplierValue)
                      setShowCustomSupplierInput(false)
                      setCustomSupplierValue("")
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCustomSupplierInput(false)
                      setCustomSupplierValue("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select 
                  value={newItem.supplier} 
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setShowCustomSupplierInput(true)
                    } else {
                      handleFormFieldChange('supplier', value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier} value={supplier}>
                        {supplier}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">+ Add Custom Supplier</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="package">Package Type</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Quantity-based packaging:</p>
                    <p>Exact: 1-100 pieces</p>
                    <p>Estimated: 101-500 pieces</p>
                    <p>Reel: 500+ pieces</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {showCustomPackageInput ? (
                <div className="flex gap-2">
                  <Input
                    id="package"
                    value={customPackageValue}
                    onChange={(e) => {
                      setCustomPackageValue(e.target.value)
                      setAddItemFormModified(true)
                    }}
                    placeholder="Enter custom package type"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleFormFieldChange('package', customPackageValue)
                      setShowCustomPackageInput(false)
                      setCustomPackageValue("")
                    }}
                    disabled={!customPackageValue.trim()}
                  >
                    Use
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCustomPackageInput(false)
                      setCustomPackageValue("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select
                  value={newItem.package}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setShowCustomPackageInput(true)
                    } else {
                      handleFormFieldChange('package', value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select package type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Exact">
                      📦 Exact (1-100 pieces)
                    </SelectItem>
                    <SelectItem value="Estimated">
                      📊 Estimated (101-500 pieces)
                    </SelectItem>
                    <SelectItem value="Reel">
                      🎞️ Reel (500+ pieces)
                    </SelectItem>
                    <Separator />
                    <SelectItem value="Kit">
                      🧰 Kit
                    </SelectItem>
                    <Separator />
                    <SelectItem value="custom">
                      ✏️ Custom Package...
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {newItem.package && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {newItem.package}
                </p>
              )}
              {newItem.quantity && !isNaN(parseInt(newItem.quantity)) && newItem.package && (
                <div className="text-xs mt-1">
                  {(() => {
                    const qty = parseInt(newItem.quantity)
                    const suggested = getPackageTypeFromQuantity(qty)
                    if (newItem.package === suggested) {
                      return <span className="text-green-600">✅ Package matches quantity range</span>
                    } else if (newItem.package === "Kit" || (newItem.package !== "Exact" && newItem.package !== "Estimated" && newItem.package !== "Reel")) {
                      return <span className="text-blue-600">ℹ️ Custom package selected</span>
                    } else {
                      return <span className="text-orange-600">⚠️ Consider {suggested} for {qty} pieces</span>
                    }
                  })()}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="reorder-point">Reorder Point</Label>
              <Input
                id="reorder-point"
                type="number"
                value={newItem.reorderPoint}
                onChange={(e) => handleFormFieldChange('reorderPoint', e.target.value)}
                placeholder={`Leave empty for default (${alertSettings.defaultReorderPoint || 10})`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default reorder point is {alertSettings.defaultReorderPoint || 10} if not specified
              </p>
            </div>
          </div>

          {/* Batch Items Display */}
          {batchMode && batchEntryItems.length > 0 && (
            <div className="space-y-4 border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Batch Items ({batchEntryItems.length})</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setBatchEntryItems([])
                    setBatchMode(false)
                    setEditingBatchQuantity({})
                    setEditingBatchFields({})
                    setAddItemFormModified(false)
                  }}
                >
                  Clear Batch
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="text-left p-3 border-r border-gray-200 font-medium min-w-[140px]">Part Number</th>
                          <th className="text-left p-3 border-r border-gray-200 font-medium min-w-[140px]">Mfg Part Number</th>
                          <th className="text-left p-3 border-r border-gray-200 font-medium min-w-[180px]">Description</th>
                          <th className="text-left p-3 border-r border-gray-200 font-medium min-w-[100px]">Qty</th>
                          <th className="text-left p-3 border-r border-gray-200 font-medium min-w-[120px]">Location</th>
                          <th className="text-left p-3 border-r border-gray-200 font-medium min-w-[120px]">Package</th>
                          <th className="text-left p-3 border-r border-gray-200 font-medium min-w-[120px]">Supplier</th>
                          <th className="text-left p-3 border-r border-gray-200 font-medium min-w-[100px]">Reorder Point</th>
                          <th className="text-left p-3 font-medium min-w-[100px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchEntryItems.map((item, index) => {
                          const renderEditableCell = (
                            field: 'partNumber' | 'mfgPartNumber' | 'description' | 'location' | 'package' | 'supplier' | 'reorderPoint',
                            displayValue: string,
                            inputType: 'text' | 'number' = 'text',
                            className: string = "text-xs break-all"
                          ) => {
                            const isEditing = editingBatchFields[index]?.field === field
                            
                            if (isEditing) {
                              return (
                                <div className="flex gap-1 items-center">
                                  <Input
                                    type={inputType}
                                    value={editingBatchFields[index]?.value || ''}
                                    onChange={(e) => setEditingBatchFields(prev => ({
                                      ...prev,
                                      [index]: { field, value: e.target.value }
                                    }))}
                                    className="h-7 px-2 text-xs min-w-[100px]"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleBatchFieldUpdate(index)
                                      } else if (e.key === 'Escape') {
                                        handleBatchFieldCancel(index)
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleBatchFieldUpdate(index)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBatchFieldCancel(index)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )
                            }
                            
                            return (
                              <div className="flex gap-1 items-center group">
                                <span className={className}>{displayValue}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleBatchFieldEdit(index, field, displayValue)}
                                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )
                          }

                          return (
                            <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                              {/* Part Number */}
                              <td className="p-3 border-r border-gray-200">
                                {renderEditableCell('partNumber', item.partNumber, 'text', 'font-mono text-xs break-all')}
                              </td>
                              
                              {/* Mfg Part Number */}
                              <td className="p-3 border-r border-gray-200">
                                {renderEditableCell('mfgPartNumber', item.mfgPartNumber || '', 'text', 'font-mono text-xs break-all')}
                              </td>
                              
                              {/* Description */}
                              <td className="p-3 border-r border-gray-200">
                                {renderEditableCell('description', item.description, 'text', 'text-xs break-words max-w-[200px]')}
                              </td>
                              
                              {/* Quantity - Keep the existing quantity editing logic */}
                              <td className="p-3 border-r border-gray-200">
                                {editingBatchQuantity[index] !== undefined ? (
                                  <div className="flex gap-1 items-center">
                                    <Input
                                      type="number"
                                      value={editingBatchQuantity[index]}
                                      onChange={(e) => handleBatchQuantityEdit(index, e.target.value)}
                                      className="h-7 w-20 px-2 text-xs"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleBatchQuantityUpdate(index)
                                        } else if (e.key === 'Escape') {
                                          handleBatchQuantityCancel(index)
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleBatchQuantityUpdate(index)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleBatchQuantityCancel(index)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 items-center group">
                                    <span className="text-sm font-medium">{item.quantity}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleBatchQuantityEdit(index, item.quantity)}
                                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                              
                              {/* Location */}
                              <td className="p-3 border-r border-gray-200">
                                {renderEditableCell('location', item.location, 'text', 'text-xs break-all')}
                              </td>
                              
                              {/* Package */}
                              <td className="p-3 border-r border-gray-200">
                                {renderEditableCell('package', item.package, 'text', 'text-xs break-all')}
                              </td>
                              
                              {/* Supplier */}
                              <td className="p-3 border-r border-gray-200">
                                {renderEditableCell('supplier', item.supplier || '', 'text', 'text-xs break-all')}
                              </td>
                              
                              {/* Reorder Point */}
                              <td className="p-3 border-r border-gray-200">
                                {renderEditableCell('reorderPoint', item.reorderPoint?.toString() || '', 'number', 'text-xs')}
                              </td>
                              
                              {/* Actions */}
                              <td className="p-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setBatchEntryItems(prev => prev.filter((_, i) => i !== index))
                                    setAddItemFormModified(true)
                                    // Clear any editing state for this item
                                    setEditingBatchQuantity(prev => {
                                      const updated = { ...prev }
                                      delete updated[index]
                                      return updated
                                    })
                                    setEditingBatchFields(prev => {
                                      const updated = { ...prev }
                                      delete updated[index]
                                      return updated
                                    })
                                    // Exit batch mode if no items left
                                    if (batchEntryItems.length === 1) {
                                      setBatchMode(false)
                                    }
                                  }}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  ×
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => handleAddItemDialogOpen(false)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {!batchMode ? (
                  // Normal mode - show both single item and batch upload options
                  <>
                    <Button 
                      onClick={handleAddItem}
                      disabled={!newItem.partNumber || !newItem.description || !newItem.quantity || !newItem.requester}
                    >
                      Add Item
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleBatchUpload}
                      disabled={!newItem.partNumber || !newItem.description || !newItem.quantity || !newItem.requester}
                    >
                      Batch Upload
                    </Button>
                  </>
                ) : (
                  // Batch mode - show add to batch and submit batch options
                  <>
                    <Button 
                      variant="outline"
                      onClick={handleBatchUpload}
                      disabled={!newItem.partNumber || !newItem.description || !newItem.quantity || !newItem.requester}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Batch
                    </Button>
                    <Button 
                      onClick={handleSubmitBatch}
                      disabled={batchEntryItems.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Submit Batch ({batchEntryItems.length})
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Part Number Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Duplicate Part Number Found</DialogTitle>
            <DialogDescription>
              This part number already exists. You can add stock to the existing entry.
            </DialogDescription>
          </DialogHeader>
          
          {duplicatePartInfo && (
            <div className="space-y-4">
              {/* Existing Item Information */}
              <div className={`p-4 rounded-lg border ${
                duplicatePartInfo.duplicateSource === 'inventory' ? 'bg-green-50 border-green-200' :
                duplicatePartInfo.duplicateSource === 'pending' ? 'bg-orange-50 border-orange-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <h4 className={`font-medium mb-2 ${
                  duplicatePartInfo.duplicateSource === 'inventory' ? 'text-green-800' :
                  duplicatePartInfo.duplicateSource === 'pending' ? 'text-orange-800' :
                  'text-blue-800'
                }`}>
                  {duplicatePartInfo.duplicateSource === 'inventory' ? '📦 Existing Inventory Item:' :
                   duplicatePartInfo.duplicateSource === 'pending' ? '⏳ Pending Approval Item:' :
                   '📋 Current Batch Item:'}
                </h4>
                <div className="text-sm space-y-1">
                  <div><strong>Part Number:</strong> {
                    duplicatePartInfo.duplicateSource === 'inventory' 
                      ? duplicatePartInfo.existingItem["Part number"]
                      : duplicatePartInfo.duplicateSource === 'pending'
                      ? (duplicatePartInfo.existingItem.item_data?.part_number || duplicatePartInfo.existingItem.item_data?.["Part number"])
                      : duplicatePartInfo.existingItem.partNumber
                  }</div>
                  <div><strong>Description:</strong> {
                    duplicatePartInfo.duplicateSource === 'inventory' 
                      ? duplicatePartInfo.existingItem["Part description"]
                      : duplicatePartInfo.duplicateSource === 'pending'
                      ? (duplicatePartInfo.existingItem.item_data?.part_description || duplicatePartInfo.existingItem.item_data?.["Part description"])
                      : duplicatePartInfo.existingItem.description
                  }</div>
                  <div><strong>Current Quantity:</strong> {
                    duplicatePartInfo.duplicateSource === 'inventory' 
                      ? duplicatePartInfo.existingItem.QTY
                      : duplicatePartInfo.duplicateSource === 'pending'
                      ? (duplicatePartInfo.existingItem.item_data?.quantity || duplicatePartInfo.existingItem.item_data?.QTY)
                      : duplicatePartInfo.existingItem.quantity
                  } units</div>
                  <div><strong>Location:</strong> {
                    duplicatePartInfo.duplicateSource === 'inventory' 
                      ? duplicatePartInfo.existingItem.Location
                      : duplicatePartInfo.duplicateSource === 'pending'
                      ? (duplicatePartInfo.existingItem.item_data?.location || duplicatePartInfo.existingItem.item_data?.Location)
                      : duplicatePartInfo.existingItem.location
                  }</div>
                  <div><strong>Supplier:</strong> {
                    duplicatePartInfo.duplicateSource === 'inventory' 
                      ? duplicatePartInfo.existingItem.Supplier
                      : duplicatePartInfo.duplicateSource === 'pending'
                      ? (duplicatePartInfo.existingItem.item_data?.supplier || duplicatePartInfo.existingItem.item_data?.Supplier)
                      : duplicatePartInfo.existingItem.supplier
                  }</div>
                  <div><strong>Package:</strong> {
                    duplicatePartInfo.duplicateSource === 'inventory' 
                      ? duplicatePartInfo.existingItem.Package
                      : duplicatePartInfo.duplicateSource === 'pending'
                      ? (duplicatePartInfo.existingItem.item_data?.package || duplicatePartInfo.existingItem.item_data?.Package)
                      : duplicatePartInfo.existingItem.package
                  }</div>
                  {duplicatePartInfo.duplicateSource === 'pending' && (
                    <div><strong>Status:</strong> <span className="text-orange-600">Pending Approval</span></div>
                  )}
                </div>
              </div>

              {/* New Item Information */}
              <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <h4 className="font-medium mb-2 text-blue-800">
                  ➕ New Stock to Add:
                </h4>
                <div className="text-sm space-y-2">
                  <div><strong>Part Number:</strong> {duplicatePartInfo.partNumber}</div>
                  <div><strong>Description:</strong> {duplicatePartInfo.description}</div>
                  <div className="flex items-center gap-2">
                    <strong>Additional Quantity:</strong>
                    <Input
                      type="number"
                      min="1"
                      value={editableAdditionalQty}
                      onChange={(e) => setEditableAdditionalQty(e.target.value)}
                      className="w-20 h-8"
                      placeholder="0"
                    />
                    <span>units</span>
                  </div>
                  <div><strong>Location:</strong> {duplicatePartInfo.location}</div>
                  <div><strong>Supplier:</strong> {duplicatePartInfo.supplier}</div>
                  <div><strong>Package:</strong> {duplicatePartInfo.package}</div>
                </div>
              </div>

              {/* Calculation Summary */}
              <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                <h4 className="font-medium mb-2 text-gray-800">
                  📊 After Adding Stock:
                </h4>
                <div className="text-sm">
                  <div><strong>New Total Quantity:</strong> {
                    (duplicatePartInfo.duplicateSource === 'inventory' 
                      ? duplicatePartInfo.existingItem.QTY
                      : duplicatePartInfo.duplicateSource === 'pending'
                      ? (duplicatePartInfo.existingItem.item_data?.quantity || duplicatePartInfo.existingItem.item_data?.QTY || 0)
                      : parseInt(duplicatePartInfo.existingItem.quantity) || 0
                    ) + (parseInt(editableAdditionalQty) || 0)
                  } units</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (duplicatePartInfo) {
                  const additionalQty = parseInt(editableAdditionalQty) || 0
                  if (additionalQty <= 0) {
                    alert("Please enter a valid quantity greater than 0")
                    return
                  }
                  await handleAddStockToExisting(duplicatePartInfo.duplicateData, additionalQty)
                  
                  // Clear form
                  const requesterName = newItem.requester
                  setNewItem({
                    partNumber: "",
                    mfgPartNumber: "",
                    description: "",
                    quantity: "",
                    location: "",
                    supplier: "",
                    package: "",
                    reorderPoint: "",
                    requester: batchMode ? requesterName : "", // Keep requester in batch mode
                  })

                  setShowDuplicateDialog(false)
                  setDuplicatePartInfo(null)
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Add Stock to Existing
            </Button>
            {batchMode && (
              <Button 
                onClick={() => {
                  if (duplicatePartInfo) {
                    // Add to batch anyway (create separate entry)
                    const batchItem = {
                      partNumber: duplicatePartInfo.partNumber,
                      mfgPartNumber: duplicatePartInfo.mfgPartNumber,
                      description: duplicatePartInfo.description,
                      quantity: duplicatePartInfo.newQuantity.toString(),
                      location: duplicatePartInfo.location,
                      supplier: duplicatePartInfo.supplier,
                      package: duplicatePartInfo.package,
                      reorderPoint: duplicatePartInfo.reorderPoint,
                      requester: newItem.requester
                    }

                    setBatchEntryItems(prev => [...prev, batchItem])

                    // Clear form but keep requester and stay in batch mode
                    const requesterName = newItem.requester
                    setNewItem({
                      partNumber: "",
                      mfgPartNumber: "",
                      description: "",
                      quantity: "",
                      location: "",
                      supplier: "",
                      package: "",
                      reorderPoint: "",
                      requester: requesterName,
                    })

                    setBatchMode(true)
                    setShowDuplicateDialog(false)
                    setDuplicatePartInfo(null)
                  }
                }}
              >
                Add to Batch Anyway
              </Button>
            )}
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
          onOpenChange={(open) => {
            setEditDialogOpen(prev => ({
              ...prev,
              [item.id]: open
            }))
            if (!open) {
              // Clear form data when closing
              setEditFormData(prev => {
                const updated = { ...prev }
                delete updated[item.id]
                return updated
              })
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Make changes to {item["Part number"]} - {item["Part description"]}
              </DialogDescription>
            </DialogHeader>
            {editFormData[item.id] && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-part-number">Part Number</Label>
                  <Input
                    id="edit-part-number"
                    value={editFormData[item.id].partNumber}
                    onChange={(e) => handleEditFormChange(item.id, 'partNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mfg-part-number">Manufacturer Part Number</Label>
                  <Input
                    id="edit-mfg-part-number"
                    value={editFormData[item.id].mfgPartNumber}
                    onChange={(e) => handleEditFormChange(item.id, 'mfgPartNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editFormData[item.id].description}
                    onChange={(e) => handleEditFormChange(item.id, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-quantity">Quantity</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={editFormData[item.id].quantity}
                    onChange={(e) => handleEditFormChange(item.id, 'quantity', e.target.value)}
                    onWheel={(e) => {
                      // Prevent page scroll when focused on input
                      e.preventDefault()
                      
                      const currentValue = parseInt(editFormData[item.id].quantity) || 0
                      const delta = e.deltaY > 0 ? -1 : 1 // Scroll down = decrease, scroll up = increase
                      const newValue = Math.max(0, currentValue + delta) // Don't allow negative quantities
                      
                      handleEditFormChange(item.id, 'quantity', newValue.toString())
                    }}
                    onFocus={(e) => {
                      // Select all text when focused for easy editing
                      e.target.select()
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={editFormData[item.id].location}
                    onChange={(e) => handleEditFormChange(item.id, 'location', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-supplier">Supplier</Label>
                  <Input
                    id="edit-supplier"
                    value={editFormData[item.id].supplier}
                    onChange={(e) => handleEditFormChange(item.id, 'supplier', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-package">Package</Label>
                  <Input
                    id="edit-package"
                    value={editFormData[item.id].package}
                    onChange={(e) => handleEditFormChange(item.id, 'package', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-reorder-point">Reorder Point</Label>
                  <Input
                    id="edit-reorder-point"
                    type="number"
                    value={editFormData[item.id].reorderPoint}
                    onChange={(e) => handleEditFormChange(item.id, 'reorderPoint', e.target.value)}
                    onWheel={(e) => {
                      // Prevent page scroll when focused on input
                      e.preventDefault()
                      
                      const currentValue = parseInt(editFormData[item.id].reorderPoint) || 0
                      const delta = e.deltaY > 0 ? -1 : 1 // Scroll down = decrease, scroll up = increase
                      const newValue = Math.max(0, currentValue + delta) // Don't allow negative values
                      
                      handleEditFormChange(item.id, 'reorderPoint', newValue.toString())
                    }}
                    onFocus={(e) => {
                      // Select all text when focused for easy editing
                      e.target.select()
                    }}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditDialogOpen(prev => ({
                  ...prev,
                  [item.id]: false
                }))}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSubmitEdit(item.id)}>
                Submit Changes
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

      {/* Supplier Lookup Dialog */}
      <SupplierLookup
        open={showSupplierLookup}
        onOpenChange={setShowSupplierLookup}
        initialPartNumber={supplierLookupPartNumber}
        onSelectResult={handleSupplierLookupResult}
      />

      {/* Interactive Tour */}
      <InteractiveTour
        isActive={showTour}
        onComplete={() => setShowTour(false)}
        onSkip={() => setShowTour(false)}
      />

      {/* Help Modal */}
      <HelpModal
        open={showHelpModal}
        onOpenChange={setShowHelpModal}
      />

      {/* Reorder Request Dialog */}
      <Dialog open={showReorderDialog} onOpenChange={setShowReorderDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Reorder</DialogTitle>
            <DialogDescription>
              Submit a reorder request for {reorderItem?.["Part number"]}
            </DialogDescription>
          </DialogHeader>
          
          {reorderItem && (
            <div className="space-y-4">
              {/* Part Info */}
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm font-medium">{reorderItem["Part number"]}</div>
                <div className="text-xs text-gray-600">{reorderItem["Part description"]}</div>
                <div className="text-xs text-red-600 mt-1">
                  Current Stock: {reorderItem.QTY} | Reorder Point: {reorderItem.reorderPoint || alertSettings.defaultReorderPoint || 10}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reorder-quantity">Quantity to Order *</Label>
                  <Input
                    id="reorder-quantity"
                    type="number"
                    value={reorderFormData.quantity}
                    onChange={(e) => setReorderFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Enter quantity"
                  />
                </div>
                
                <div>
                  <Label htmlFor="reorder-urgency">Urgency *</Label>
                  <Select value={reorderFormData.urgency} onValueChange={(value) => setReorderFormData(prev => ({ ...prev, urgency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Can wait</SelectItem>
                      <SelectItem value="normal">Normal - Standard delivery</SelectItem>
                      <SelectItem value="high">High - Expedite if possible</SelectItem>
                      <SelectItem value="urgent">Urgent - Rush order needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="reorder-timeframe">Timeframe *</Label>
                <Select value={reorderFormData.timeframe} onValueChange={(value) => setReorderFormData(prev => ({ ...prev, timeframe: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASAP">ASAP - Rush delivery</SelectItem>
                    <SelectItem value="1 week">1 week</SelectItem>
                    <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
                    <SelectItem value="2-4 weeks">2-4 weeks</SelectItem>
                    <SelectItem value="1 month+">1 month or more</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reorder-requester">Your Name *</Label>
                <Input
                  id="reorder-requester"
                  value={reorderFormData.requester}
                  onChange={(e) => setReorderFormData(prev => ({ ...prev, requester: e.target.value }))}
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <Label htmlFor="reorder-notes">Notes (Optional)</Label>
                <textarea
                  id="reorder-notes"
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                  value={reorderFormData.notes}
                  onChange={(e) => setReorderFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions or notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowReorderDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleReorderSubmit}>
                  Submit Reorder Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}
