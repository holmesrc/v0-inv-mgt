"use client"
import { useState, useRef, useMemo, useEffect, useCallback } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, AlertTriangle, X, Package, User, Edit } from "lucide-react"
import type { InventoryItem } from "@/types/inventory"

interface AddInventoryItemProps {
  onAddItem: (item: Omit<InventoryItem, "id" | "lastUpdated">, requester: string) => void
  packageTypes: string[]
  suppliers: string[]
  locations: string[]
  defaultReorderPoint: number
  inventory: InventoryItem[]
}

interface BatchItem extends Omit<InventoryItem, "id" | "lastUpdated"> {
  batchId: string
}

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  existingLocations: string[]
  pendingLocations: string[]
  disabled?: boolean
  placeholder?: string
}

function LocationInput({
  value,
  onChange,
  existingLocations,
  pendingLocations,
  disabled,
  placeholder,
}: LocationInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredLocations, setFilteredLocations] = useState<string[]>([])
  const [suggestedNext, setSuggestedNext] = useState<string>("")
  const inputRef = useRef<HTMLInputElement>(null)

  const predictNextLocation = useCallback((existingLocs: string[], pendingLocs: string[]) => {
    console.log("🎯 === LOCATION PREDICTION START ===")
    console.log("📦 Existing locations (last 10):", existingLocs.slice(-10))
    console.log("⏳ Pending locations:", pendingLocs)
    console.log("🔢 Existing count:", existingLocs.length, "Pending count:", pendingLocs.length)

    const allLocations = [...existingLocs, ...pendingLocs]
    console.log("🔗 Combined locations (last 15):", allLocations.slice(-15))
    console.log("🔢 Total combined count:", allLocations.length)

    if (allLocations.length === 0) {
      console.log("❌ No locations found, returning empty")
      return ""
    }

    // Parse locations to find the highest numerical sequence
    const locationData = allLocations
      .map((loc) => {
        const match = loc.match(/^([A-Za-z]+)(\d+)-(\d+)$/)
        if (match) {
          const [, prefix, shelf, position] = match
          const parsed = {
            original: loc,
            prefix: prefix.toUpperCase(),
            shelf: Number.parseInt(shelf, 10),
            position: Number.parseInt(position, 10),
            sortKey: `${prefix.toUpperCase()}-${shelf.padStart(3, "0")}-${position.toString().padStart(3, "0")}`,
          }
          console.log(`  📍 Parsed ${loc} ->`, parsed)
          return parsed
        } else {
          console.log(`  ❌ Could not parse location: ${loc}`)
          return null
        }
      })
      .filter(Boolean)

    console.log("📊 Parsed location data:", locationData)

    if (locationData.length === 0) {
      console.log("❌ No parseable locations found, returning empty")
      return ""
    }

    // Sort by prefix, then shelf, then position
    locationData.sort((a, b) => {
      if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix)
      if (a.shelf !== b.shelf) return a.shelf - b.shelf
      return a.position - b.position
    })

    console.log("📈 Sorted location data:", locationData)

    // Find the highest location
    const highest = locationData[locationData.length - 1]
    console.log("🏆 Highest location found:", highest)

    // Suggest next position
    const suggestion = `${highest.prefix}${highest.shelf}-${highest.position + 1}`
    console.log("💡 Suggested next location:", suggestion)
    console.log("🎯 === LOCATION PREDICTION END ===")

    return suggestion
  }, [])

  // Update filtered locations and suggestion when value or locations change
  useEffect(() => {
    const allLocations = [...existingLocations, ...pendingLocations]

    if (!value.trim()) {
      setFilteredLocations(existingLocations.slice(0, 10)) // Show first 10 existing when empty
      setSuggestedNext(predictNextLocation(existingLocations, pendingLocations))
    } else {
      const filtered = allLocations.filter((loc) => loc.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
      setFilteredLocations(filtered)

      // Only show suggestion if current value doesn't exactly match existing
      const exactMatch = allLocations.some((loc) => loc.toLowerCase() === value.toLowerCase())
      if (!exactMatch) {
        setSuggestedNext(predictNextLocation(existingLocations, pendingLocations))
      } else {
        setSuggestedNext("")
      }
    }
  }, [value, existingLocations, pendingLocations, predictNextLocation])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setIsOpen(true)
  }

  const handleSelectLocation = (location: string) => {
    onChange(location)
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    } else if (e.key === "Enter" && suggestedNext && !isOpen) {
      e.preventDefault()
      onChange(suggestedNext)
    }
  }

  const showSuggestions = isOpen && (filteredLocations.length > 0 || suggestedNext)

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
      />

      {/* Suggestion indicator */}
      {suggestedNext && !value && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
          Next: {suggestedNext}
        </div>
      )}

      {/* Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {/* Smart suggestion */}
          {suggestedNext && !existingLocations.includes(suggestedNext) && (
            <div
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 bg-blue-25"
              onClick={() => handleSelectLocation(suggestedNext)}
            >
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-medium">🎯 {suggestedNext}</span>
                <span className="text-xs text-blue-500">(Suggested Next)</span>
              </div>
            </div>
          )}

          {/* Existing locations */}
          {filteredLocations.map((location, index) => (
            <div
              key={`${location}-${index}`}
              className="px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
              onClick={() => handleSelectLocation(location)}
            >
              <span>{location}</span>
              <span className="text-xs text-muted-foreground">Existing</span>
            </div>
          ))}

          {/* No matches */}
          {filteredLocations.length === 0 && !suggestedNext && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matching locations found</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AddInventoryItem({
  onAddItem,
  packageTypes,
  suppliers,
  locations,
  defaultReorderPoint,
  inventory,
}: AddInventoryItemProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [requesterName, setRequesterName] = useState("")
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [currentItem, setCurrentItem] = useState({
    partNumber: "",
    mfgPartNumber: "",
    qty: "",
    description: "",
    supplier: "",
    location: "",
    package: "",
    reorderPoint: defaultReorderPoint,
  })

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)
  const [pendingLocations, setPendingLocations] = useState<string[]>([])

  // Track which item is being edited
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<BatchItem | null>(null)

  // Track if we're using custom input values
  const [useCustomSupplier, setUseCustomSupplier] = useState(false)
  const [useCustomLocation, setUseCustomLocation] = useState(false)
  const [useCustomPackage, setUseCustomPackage] = useState(false)

  // Refs for input fields
  const supplierInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const packageInputRef = useRef<HTMLInputElement>(null)

  const [partNumberCheck, setPartNumberCheck] = useState<{
    isChecking: boolean
    isDuplicate: boolean
    existingItem: InventoryItem | null
  }>({
    isChecking: false,
    isDuplicate: false,
    existingItem: null,
  })

  // Aggressive deduplication with debugging
  const uniquePackageTypes = useMemo(() => {
    const cleaned = packageTypes
      .filter((type) => type && typeof type === "string" && type.trim().length > 0)
      .map((type) => type.trim().toUpperCase())
    const uniqueSet = new Set(cleaned)
    const uniqueArray = Array.from(uniqueSet).sort()
    return uniqueArray
  }, [packageTypes])

  const uniqueSuppliers = useMemo(() => {
    const cleaned = suppliers
      .filter((supplier) => supplier && typeof supplier === "string" && supplier.trim().length > 0)
      .map((supplier) => supplier.trim())
    const uniqueSet = new Set(cleaned)
    return Array.from(uniqueSet).sort()
  }, [suppliers])

  const uniqueLocations = useMemo(() => {
    const cleaned = locations
      .filter((location) => location && typeof location === "string" && location.trim().length > 0)
      .map((location) => location.trim())

    const uniqueLocations = Array.from(new Set(cleaned))

    const sortedLocations = uniqueLocations.sort((a, b) => {
      const extractParts = (loc: string) => {
        const match = loc.match(/^([A-Za-z]*)(\d*)(?:[^A-Za-z0-9]*([A-Za-z]*)(\d*))?/)
        if (!match) return { prefix1: loc, num1: 0, prefix2: "", num2: 0 }

        const [, prefix1 = "", numStr1 = "", prefix2 = "", numStr2 = ""] = match
        const num1 = numStr1 ? Number.parseInt(numStr1, 10) : 0
        const num2 = numStr2 ? Number.parseInt(numStr2, 10) : 0

        return { prefix1, num1, prefix2, num2 }
      }

      const partsA = extractParts(a)
      const partsB = extractParts(b)

      if (partsA.prefix1 !== partsB.prefix1) {
        return partsA.prefix1.localeCompare(partsB.prefix1)
      }

      if (partsA.num1 !== partsB.num1) {
        return partsA.num1 - partsB.num1
      }

      if (partsA.prefix2 !== partsB.prefix2) {
        return partsA.prefix2.localeCompare(partsB.prefix2)
      }

      if (partsA.num2 !== partsB.num2) {
        return partsA.num2 - partsB.num2
      }

      return a.localeCompare(b)
    })

    return sortedLocations
  }, [locations])

  // Debounced duplicate checking
  const checkPartNumberDuplicate = useCallback(
    debounce((partNumber: string) => {
      if (!partNumber.trim()) {
        setPartNumberCheck({ isChecking: false, isDuplicate: false, existingItem: null })
        return
      }

      setPartNumberCheck((prev) => ({ ...prev, isChecking: true }))

      // Check against existing inventory
      const duplicateItem = inventory?.find(
        (item) => item["Part number"].toLowerCase() === partNumber.trim().toLowerCase(),
      )

      // Check against current batch items
      const batchDuplicate = batchItems.some(
        (item) => item["Part number"].toLowerCase() === partNumber.trim().toLowerCase(),
      )

      setPartNumberCheck({
        isChecking: false,
        isDuplicate: !!duplicateItem || batchDuplicate,
        existingItem: duplicateItem || null,
      })
    }, 300),
    [inventory, batchItems],
  )

  // Helper debounce function
  function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout
    return ((...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }) as T
  }

  // Real-time duplicate checking
  useEffect(() => {
    checkPartNumberDuplicate(currentItem.partNumber)
  }, [currentItem.partNumber, checkPartNumberDuplicate])

  // Debug logging for locations
  useEffect(() => {
    console.log("AddInventoryItem received locations:", locations)
  }, [locations])

  // Fetch pending locations to include in location prediction
  useEffect(() => {
    const fetchPendingLocations = async () => {
      try {
        console.log("🔍 Fetching pending locations...")
        const response = await fetch("/api/inventory/pending")
        if (response.ok) {
          const data = await response.json()
          console.log("📋 Raw pending data received:", data)

          // Extract locations from pending changes - handle both individual items and batch items
          const locations = []
          const debugInfo = {
            totalChanges: data.data?.length || 0,
            processedChanges: [],
            extractedLocations: [],
          }

          if (data.data) {
            for (const change of data.data) {
              const changeInfo = {
                id: change.id,
                changeType: change.change_type,
                status: change.status,
                hasItemData: !!change.item_data,
                hasBatchItems: !!(change.item_data && change.item_data.batch_items),
                hasDirectLocation: !!(change.item_data && change.item_data.location),
                extractedFromThis: [],
              }

              // Handle batch changes (batch_items array in item_data)
              if (change.item_data && change.item_data.batch_items && Array.isArray(change.item_data.batch_items)) {
                console.log(`📦 Processing batch change ${change.id} with ${change.item_data.batch_items.length} items`)
                for (const item of change.item_data.batch_items) {
                  if (item.location && item.location.trim()) {
                    const loc = item.location.trim()
                    locations.push(loc)
                    changeInfo.extractedFromThis.push(loc)
                    console.log(`  ✅ Found batch location: ${loc}`)
                  }
                }
              }
              // Handle individual changes (direct location field in item_data)
              else if (change.item_data && change.item_data.location && change.item_data.location.trim()) {
                const loc = change.item_data.location.trim()
                locations.push(loc)
                changeInfo.extractedFromThis.push(loc)
                console.log(`  ✅ Found individual location: ${loc}`)
              }

              debugInfo.processedChanges.push(changeInfo)
            }
          }

          debugInfo.extractedLocations = locations
          console.log("📍 Final extracted pending locations:", locations)
          console.log("🔍 Debug info:", debugInfo)

          setPendingLocations(locations)
        } else {
          console.warn("⚠️ Failed to fetch pending changes:", response.status)
        }
      } catch (error) {
        console.error("❌ Failed to fetch pending locations:", error)
      }
    }

    if (open) {
      fetchPendingLocations()
    }
  }, [open])

  const resetCurrentItem = () => {
    setCurrentItem({
      partNumber: "",
      mfgPartNumber: "",
      qty: "",
      description: "",
      supplier: "",
      location: "",
      package: "",
      reorderPoint: defaultReorderPoint,
    })
    setUseCustomSupplier(false)
    setUseCustomLocation(false)
    setUseCustomPackage(false)
  }

  const resetAll = () => {
    setRequesterName("")
    setBatchItems([])
    resetCurrentItem()
    setError(null)
    setSuccess(null)
  }

  const addToBatch = () => {
    // Validate current item
    if (!currentItem.partNumber.trim()) {
      setError("Part number is required")
      return
    }

    // Check for duplicate part numbers in batch
    const isDuplicate = batchItems.some((item) => item["Part number"] === currentItem.partNumber.trim())
    if (isDuplicate) {
      setError("This part number is already in the batch")
      return
    }

    // NEW: Check for duplicate part numbers in existing inventory
    const duplicateItem = inventory?.find(
      (item) => item["Part number"].toLowerCase() === currentItem.partNumber.trim().toLowerCase(),
    )
    if (duplicateItem) {
      setError(
        `Part number "${currentItem.partNumber.trim()}" already exists in inventory at location: ${duplicateItem.Location || "Unknown"}. Quantity: ${duplicateItem.QTY}, Package: ${duplicateItem.Package || "Unknown"}. Use the Edit function to modify existing items.`,
      )
      return
    }

    const newBatchItem: BatchItem = {
      batchId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      "Part number": currentItem.partNumber.trim(),
      "MFG Part number": currentItem.mfgPartNumber,
      QTY: currentItem.qty,
      "Part description": currentItem.description,
      Supplier: currentItem.supplier,
      Location: currentItem.location,
      Package: currentItem.package,
      reorderPoint: currentItem.reorderPoint,
    }

    setBatchItems((prev) => [...prev, newBatchItem])
    resetCurrentItem()
    setError(null)
    setSuccess(`Added ${newBatchItem["Part number"]} to batch (${batchItems.length + 1} items total)`)

    // Clear success message after 2 seconds
    setTimeout(() => setSuccess(null), 2000)
  }

  const removeFromBatch = (batchId: string) => {
    setBatchItems((prev) => prev.filter((item) => item.batchId !== batchId))
  }

  const submitBatch = async () => {
    if (!requesterName.trim()) {
      setError("Requester name is required")
      return
    }

    if (requesterName.trim().toLowerCase() === "current user") {
      setError("'Current User' is not a valid requester name. Please enter your actual name.")
      return
    }

    if (batchItems.length === 0) {
      setError("No items to submit. Add at least one item to the batch.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`🚀 Submitting batch of ${batchItems.length} items for requester: ${requesterName}`)

      // Transform batch items to database format with validation
      const transformedBatchItems = batchItems.map((item, index) => {
        const transformed = {
          part_number: String(item["Part number"] || "").trim(),
          mfg_part_number: String(item["MFG Part number"] || "").trim(),
          qty: item.QTY === "" || isNaN(Number(item.QTY)) ? 0 : Math.max(0, Number(item.QTY)),
          part_description: String(item["Part description"] || "").trim(),
          supplier: String(item.Supplier || "").trim(),
          location: String(item.Location || "").trim(),
          package: String(item.Package || "").trim(),
          reorder_point: isNaN(Number(item.reorderPoint)) ? 10 : Math.max(0, Number(item.reorderPoint)),
        }

        // Validate required fields
        if (!transformed.part_number) {
          throw new Error(`Item ${index + 1}: Part number is required`)
        }
        if (!transformed.part_description) {
          throw new Error(`Item ${index + 1}: Part description is required`)
        }

        console.log(`📦 Item ${index + 1}:`, transformed)
        return transformed
      })

      console.log("📤 Sending batch to API:", {
        itemCount: transformedBatchItems.length,
        requester: requesterName.trim(),
        firstItem: transformedBatchItems[0],
      })

      // Submit as a single batch
      const response = await fetch("/api/inventory/batch-pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchItems: transformedBatchItems,
          requestedBy: requesterName.trim(),
        }),
      })

      console.log("📥 API Response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API Error Response:", errorText)
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const result = await response.json()
      console.log("📋 API Result:", result)

      if (result.success) {
        // Send Slack notification for the batch
        try {
          console.log("📨 Sending Slack notification...")
          const slackResponse = await fetch("/api/slack/send-batch-approval-request", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              batchItems: transformedBatchItems,
              requestedBy: requesterName.trim(),
              changeId: result.data.id,
            }),
          })

          if (slackResponse.ok) {
            console.log("✅ Slack notification sent successfully")
          } else {
            console.warn("⚠️ Slack notification failed, but batch was submitted successfully")
          }
        } catch (slackError) {
          console.error("❌ Failed to send Slack notification:", slackError)
          // Don't fail the entire operation if Slack fails
        }

        console.log("✅ Batch submitted successfully")
        setSuccess(`Successfully submitted batch of ${batchItems.length} items for approval!`)

        // Reset everything after successful submission
        setTimeout(() => {
          resetAll()
          setOpen(false)
        }, 2000)
      } else {
        throw new Error(result.error || "Failed to submit batch for approval")
      }
    } catch (error) {
      console.error("❌ Error submitting batch:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to submit batch for approval"
      setError(`Submission failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const startEditingBatchItem = (item: BatchItem) => {
    setEditingBatchId(item.batchId)
    setEditingItem({ ...item })
  }

  const cancelEditingBatchItem = () => {
    setEditingBatchId(null)
    setEditingItem(null)
  }

  const saveEditingBatchItem = () => {
    if (!editingItem) return

    // Validate the edited item
    if (!editingItem["Part number"].trim()) {
      setError("Part number is required")
      return
    }

    // Check for duplicate part numbers in batch (excluding the item being edited)
    const isDuplicate = batchItems.some(
      (item) => item.batchId !== editingItem.batchId && item["Part number"] === editingItem["Part number"].trim(),
    )
    if (isDuplicate) {
      setError("This part number is already in the batch")
      return
    }

    // Check for duplicate part numbers in existing inventory
    const duplicateItem = inventory?.find(
      (item) => item["Part number"].toLowerCase() === editingItem["Part number"].trim().toLowerCase(),
    )
    if (duplicateItem) {
      setError(
        `Part number "${editingItem["Part number"].trim()}" already exists in inventory at location: ${duplicateItem.Location || "Unknown"}. Quantity: ${duplicateItem.QTY}, Package: ${duplicateItem.Package || "Unknown"}. Use the Edit function to modify existing items.`,
      )
      return
    }

    // Update the batch item
    setBatchItems((prev) =>
      prev.map((item) =>
        item.batchId === editingItem.batchId
          ? { ...editingItem, "Part number": editingItem["Part number"].trim() }
          : item,
      ),
    )

    setEditingBatchId(null)
    setEditingItem(null)
    setError(null)
    setSuccess("Item updated successfully")
    setTimeout(() => setSuccess(null), 2000)
  }

  const handleEditingItemChange = (field: string, value: string | number) => {
    if (!editingItem) return

    setEditingItem((prev) => {
      if (!prev) return null

      const updated = {
        ...prev,
        [field]: value,
      }

      // Auto-select package type based on quantity
      if (field === "QTY" && typeof value === "number") {
        let autoPackage = ""
        if (value >= 1 && value <= 100) {
          autoPackage = "EXACT"
        } else if (value >= 101 && value <= 500) {
          autoPackage = "ESTIMATED"
        } else if (value > 500) {
          autoPackage = "REEL"
        }

        // Only auto-set if current package is empty or matches one of the auto types
        const currentPkg = prev.Package.toUpperCase()
        if (!currentPkg || currentPkg === "EXACT" || currentPkg === "ESTIMATED" || currentPkg === "REEL") {
          updated.Package = autoPackage
        }
      }

      return updated
    })
  }

  const handleInputChange = (field: string, value: string | number) => {
    setCurrentItem((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      }

      // Auto-select package type based on quantity
      if (field === "qty" && typeof value === "number" && value > 0) {
        let autoPackage = ""
        if (value >= 1 && value <= 100) {
          autoPackage = "EXACT"
        } else if (value >= 101 && value <= 500) {
          autoPackage = "ESTIMATED"
        } else if (value > 500) {
          autoPackage = "REEL"
        }

        // Only auto-set if current package is empty or matches one of the auto types
        const currentPkg = prev.package.toUpperCase()
        if (!currentPkg || currentPkg === "EXACT" || currentPkg === "ESTIMATED" || currentPkg === "REEL") {
          updated.package = autoPackage
        }
      }

      return updated
    })
  }

  const handleSelectChange = (field: string, value: string) => {
    if (value === "custom") {
      if (field === "supplier") {
        setUseCustomSupplier(true)
        setTimeout(() => supplierInputRef.current?.focus(), 100)
      } else if (field === "location") {
        setUseCustomLocation(true)
        setTimeout(() => locationInputRef.current?.focus(), 100)
      } else if (field === "package") {
        setUseCustomPackage(true)
        setTimeout(() => packageInputRef.current?.focus(), 100)
      }
    } else {
      handleInputChange(field, value)
      if (field === "supplier") setUseCustomSupplier(false)
      else if (field === "location") setUseCustomLocation(false)
      else if (field === "package") setUseCustomPackage(false)
    }
  }

  const hasUnsavedWork = () => {
    const hasCurrentItemData =
      currentItem.partNumber.trim() ||
      currentItem.mfgPartNumber.trim() ||
      currentItem.description.trim() ||
      currentItem.supplier.trim() ||
      currentItem.location.trim() ||
      currentItem.package.trim() ||
      (currentItem.qty !== "" && currentItem.qty > 0)

    return hasCurrentItemData || batchItems.length > 0
  }

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedWork()) {
      if (batchItems.length > 0) {
        setShowBatchConfirm(true)
      } else {
        setShowCancelConfirm(true)
      }
    } else {
      setOpen(newOpen)
      if (!newOpen) {
        resetAll()
      }
    }
  }

  const confirmCancel = () => {
    setShowCancelConfirm(false)
    setShowBatchConfirm(false)
    resetAll()
    setOpen(false)
  }

  const cancelClose = () => {
    setShowCancelConfirm(false)
    setShowBatchConfirm(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Inventory Items</DialogTitle>
          <DialogDescription>
            Add one or more inventory items. The entire batch will be submitted as one approval request.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Requester Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Requester Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="requester">Requester Name *</Label>
                <Input
                  id="requester"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  The entire batch will be submitted under this name as one approval request.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current Item Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Add Item to Batch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partNumber">Part Number *</Label>
                  <div className="relative">
                    <Input
                      id="partNumber"
                      value={currentItem.partNumber}
                      onChange={(e) => handleInputChange("partNumber", e.target.value)}
                      placeholder=""
                      disabled={loading}
                      className={`${
                        partNumberCheck.isDuplicate
                          ? "border-amber-500 focus:border-amber-500 focus:ring-amber-500"
                          : ""
                      }`}
                    />
                    {partNumberCheck.isChecking && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>

                  {partNumberCheck.isDuplicate && partNumberCheck.existingItem && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <div className="font-medium">⚠️ Part already exists in inventory!</div>
                        <div className="text-sm mt-1">
                          <strong>Location:</strong> {partNumberCheck.existingItem.Location || "Unknown"} •
                          <strong>Qty:</strong> {partNumberCheck.existingItem.QTY} •<strong>Package:</strong>{" "}
                          {partNumberCheck.existingItem.Package || "Unknown"}
                        </div>
                        <div className="text-xs mt-1 text-amber-700">
                          Use the Edit function in the main inventory table to modify existing items.
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {partNumberCheck.isDuplicate && !partNumberCheck.existingItem && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <div className="font-medium">⚠️ Part already added to current batch!</div>
                        <div className="text-xs mt-1">This part number is already in your current batch above.</div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mfgPartNumber">MFG Part Number *</Label>
                  <Input
                    id="mfgPartNumber"
                    value={currentItem.mfgPartNumber}
                    onChange={(e) => handleInputChange("mfgPartNumber", e.target.value)}
                    placeholder=""
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity *</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="0"
                    value={currentItem.qty}
                    onChange={(e) =>
                      handleInputChange("qty", e.target.value === "" ? "" : Number.parseInt(e.target.value) || "")
                    }
                    disabled={loading}
                    placeholder=""
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-selects: Exact (1-100), Estimated (101-500), Reel (500+)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    min="0"
                    value={currentItem.reorderPoint}
                    onChange={(e) => handleInputChange("reorderPoint", Number.parseInt(e.target.value) || 0)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Part Description *</Label>
                  <Input
                    id="description"
                    value={currentItem.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder=""
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  {!useCustomSupplier ? (
                    <Select
                      value={currentItem.supplier}
                      onValueChange={(value) => handleSelectChange("supplier", value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueSuppliers.map((supplier, index) => (
                          <SelectItem key={`supplier-${index}-${supplier}`} value={supplier}>
                            {supplier}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Enter custom supplier...</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      ref={supplierInputRef}
                      placeholder="Enter supplier name"
                      value={currentItem.supplier}
                      onChange={(e) => handleInputChange("supplier", e.target.value)}
                      onBlur={() => {
                        if (!currentItem.supplier) setUseCustomSupplier(false)
                      }}
                      disabled={loading}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <LocationInput
                    value={currentItem.location}
                    onChange={(value) => handleInputChange("location", value)}
                    existingLocations={uniqueLocations}
                    pendingLocations={pendingLocations}
                    disabled={loading}
                    placeholder="Type location or select existing"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package">Package Type</Label>
                  {!useCustomPackage ? (
                    <Select
                      value={currentItem.package}
                      onValueChange={(value) => handleSelectChange("package", value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select package type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXACT">📦 EXACT (1-100 qty)</SelectItem>
                        <SelectItem value="ESTIMATED">📊 ESTIMATED (101-500 qty)</SelectItem>
                        <SelectItem value="REEL">🎯 REEL (500+ qty)</SelectItem>
                        {uniquePackageTypes
                          .filter((pkg) => !["EXACT", "ESTIMATED", "REEL"].includes(pkg))
                          .map((packageType, index) => (
                            <SelectItem key={`package-${index}-${packageType}`} value={packageType}>
                              {packageType}
                            </SelectItem>
                          ))}
                        <SelectItem value="custom">✏️ Enter custom package...</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      ref={packageInputRef}
                      placeholder="Enter package type"
                      value={currentItem.package}
                      onChange={(e) => handleInputChange("package", e.target.value)}
                      onBlur={() => {
                        if (!currentItem.package) setUseCustomPackage(false)
                      }}
                      disabled={loading}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Package auto-selected based on quantity. You can override for kits or custom packages.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  onClick={addToBatch}
                  disabled={loading || !currentItem.partNumber.trim() || partNumberCheck.isDuplicate}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Batch
                </Button>
                <Button type="button" variant="outline" onClick={resetCurrentItem} disabled={loading}>
                  Clear Form
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Batch Items List */}
          {batchItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Items in Batch ({batchItems.length})</span>
                  <Badge variant="secondary">{batchItems.length} items ready</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {batchItems.map((item, index) => (
                    <div key={item.batchId} className="p-3 border rounded-lg">
                      {editingBatchId === item.batchId && editingItem ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Part Number</Label>
                              <Input
                                value={editingItem["Part number"]}
                                onChange={(e) => handleEditingItemChange("Part number", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">MFG Part Number</Label>
                              <Input
                                value={editingItem["MFG Part number"]}
                                onChange={(e) => handleEditingItemChange("MFG Part number", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min="0"
                                value={editingItem.QTY}
                                onChange={(e) => handleEditingItemChange("QTY", Number.parseInt(e.target.value) || 0)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Reorder Point</Label>
                              <Input
                                type="number"
                                min="0"
                                value={editingItem.reorderPoint}
                                onChange={(e) =>
                                  handleEditingItemChange("reorderPoint", Number.parseInt(e.target.value) || 0)
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Description</Label>
                              <Input
                                value={editingItem["Part description"]}
                                onChange={(e) => handleEditingItemChange("Part description", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Supplier</Label>
                              <Input
                                value={editingItem.Supplier}
                                onChange={(e) => handleEditingItemChange("Supplier", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Location</Label>
                              <LocationInput
                                value={editingItem.Location}
                                onChange={(value) => handleEditingItemChange("Location", value)}
                                existingLocations={uniqueLocations}
                                pendingLocations={pendingLocations}
                                disabled={false}
                                placeholder="Enter location"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Package</Label>
                              <Input
                                value={editingItem.Package}
                                onChange={(e) => handleEditingItemChange("Package", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={cancelEditingBatchItem}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={saveEditingBatchItem}>
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display Mode
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{item["Part number"]}</div>
                            <div className="text-sm text-muted-foreground">
                              {item["Part description"]} • Qty: {item.QTY} • {item.Supplier} • {item.Location} •{" "}
                              {item.Package}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingBatchItem(item)}
                              disabled={loading}
                              title="Edit item"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromBatch(item.batchId)}
                              disabled={loading}
                              title="Remove item"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            {batchItems.length > 0 && (
              <Button type="button" variant="outline" onClick={() => setBatchItems([])} disabled={loading}>
                Clear Batch
              </Button>
            )}
          </div>
          <Button onClick={submitBatch} disabled={loading || batchItems.length === 0 || !requesterName.trim()}>
            {loading ? "Submitting..." : `Submit Batch of ${batchItems.length} Items for Approval`}
          </Button>
        </DialogFooter>
      </DialogContent>
      {/* Cancel Current Entry Confirmation */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Entry?</DialogTitle>
            <DialogDescription>
              You have unsaved changes in the current item. Are you sure you want to cancel and lose this information?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelClose}>
              Keep Editing
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              Yes, Cancel Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Confirmation Dialog */}
      <Dialog open={showBatchConfirm} onOpenChange={setShowBatchConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Batch Items</DialogTitle>
            <DialogDescription>
              You have {batchItems.length} item{batchItems.length !== 1 ? "s" : ""} in your batch that haven't been
              submitted yet. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelClose}>
              Keep Editing
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              Discard Batch
            </Button>
            <Button onClick={submitBatch} disabled={loading || !requesterName.trim()}>
              Submit Batch Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
