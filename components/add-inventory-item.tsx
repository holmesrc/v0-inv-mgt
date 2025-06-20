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
  currentBatchLocations: string[] // Add this new prop
  disabled?: boolean
  placeholder?: string
}

function LocationInput({
  value,
  onChange,
  existingLocations,
  pendingLocations,
  currentBatchLocations, // Add this
  disabled,
  placeholder,
}: LocationInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredLocations, setFilteredLocations] = useState<string[]>([])
  const [suggestedNext, setSuggestedNext] = useState<string>("")
  const inputRef = useRef<HTMLInputElement>(null)

  const predictNextLocation = useCallback((existingLocs: string[], pendingLocs: string[], batchLocs: string[]) => {
    console.log("🎯 === LOCATION PREDICTION START ===")
    console.log("📦 Existing locations (last 10):", existingLocs.slice(-10))
    console.log("⏳ Pending locations:", pendingLocs)
    console.log("🔄 Current batch locations:", batchLocs)
    console.log(
      "🔢 Existing count:",
      existingLocs.length,
      "Pending count:",
      pendingLocs.length,
      "Batch count:",
      batchLocs.length,
    )

    const allLocations = [...existingLocs, ...pendingLocs, ...batchLocs]
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
    const allLocations = [...existingLocations, ...pendingLocations, ...currentBatchLocations]

    if (!value.trim()) {
      setFilteredLocations(existingLocations.slice(0, 10)) // Show first 10 existing when empty
      setSuggestedNext(predictNextLocation(existingLocations, pendingLocations, currentBatchLocations))
    } else {
      const filtered = allLocations.filter((loc) => loc.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
      setFilteredLocations(filtered)

      // Only show suggestion if current value doesn't exactly match existing
      const exactMatch = allLocations.some((loc) => loc.toLowerCase() === value.toLowerCase())
      if (!exactMatch) {
        setSuggestedNext(predictNextLocation(existingLocations, pendingLocations, currentBatchLocations))
      } else {
        setSuggestedNext("")
      }
    }
  }, [value, existingLocations, pendingLocations, currentBatchLocations, predictNextLocation])

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

  // Add these new state variables at the top of the component (around line 200):
  const [quickUpdateQty, setQuickUpdateQty] = useState(0)
  const [quickUpdateLoading, setQuickUpdateLoading] = useState(false)

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
        const base =
          (typeof window !== "undefined" ? window.location.origin : "") || process.env.NEXT_PUBLIC_APP_URL || ""
        const response = await fetch(`${base}/api/inventory/pending`)
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

  // Extract locations from current batch items
  const currentBatchLocations = useMemo(() => {
    return batchItems
      .map((item) => item.Location)
      .filter((location) => location && location.trim())
      .map((location) => location.trim())
  }, [batchItems])

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
    setQuickUpdateQty(0)
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

  // Add this new function to handle the quick quantity update (around line 400):
  const handleQuickQuantityUpdate = async (existingItem: InventoryItem) => {
    if (!requesterName.trim()) {
      setError("Requester name is required")
      return
    }

    if (quickUpdateQty <= 0) {
      setError("Please enter a valid quantity to add")
      return
    }

    setQuickUpdateLoading(true)
    setError(null)

    try {
      console.log(`🔄 Quick updating quantity for ${existingItem["Part number"]}`)
      console.log(
        `📊 Current: ${existingItem.QTY}, Adding: ${quickUpdateQty}, New total: ${existingItem.QTY + quickUpdateQty}`,
      )

      // Create the updated item data
      const updatedItem = {
        part_number: existingItem["Part number"],
        mfg_part_number: existingItem["MFG Part number"],
        qty: existingItem.QTY + quickUpdateQty,
        part_description: existingItem["Part description"],
        supplier: existingItem.Supplier,
        location: existingItem.Location,
        package: existingItem.Package,
        reorder_point: existingItem.reorderPoint || 10,
      }

      console.log("📤 Sending quantity update to API:", updatedItem)

      // Submit the quantity update as a pending change
      const response = await fetch("/api/inventory/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType: "update",
          itemData: updatedItem,
          originalData: {
            part_number: existingItem["Part number"],
            mfg_part_number: existingItem["MFG Part number"],
            qty: existingItem.QTY,
            part_description: existingItem.Supplier,
            supplier: existingItem.Supplier,
            location: existingItem.Location,
            package: existingItem.Package,
            reorder_point: existingItem.reorderPoint || 10,
          },
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
        // Send Slack notification for the quantity update
        try {
          const slackResponse = await fetch("/api/slack/send-approval-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              changeType: "update",
              itemData: updatedItem, // <-- correct key
              originalData: {
                // <-- correct key
                part_number: existingItem["Part number"],
                mfg_part_number: existingItem["MFG Part number"],
                qty: existingItem.QTY,
                part_description: existingItem["Part description"],
                supplier: existingItem.Supplier,
                location: existingItem.Location,
                package: existingItem.Package,
                reorder_point: existingItem.reorderPoint || 10,
              },
              requestedBy: requesterName.trim(),
              changeId: result.data.id,
            }),
          })

          if (slackResponse.ok) {
            console.log("✅ Slack notification sent successfully")
          } else {
            console.warn("⚠️ Slack notification failed, but update was submitted successfully")
          }
        } catch (slackError) {
          console.error("❌ Failed to send Slack notification:", slackError)
          // Don't fail the entire operation if Slack fails
        }

        console.log("✅ Quantity update submitted successfully")
        setSuccess(
          `Successfully submitted quantity update for ${existingItem["Part number"]}! Added ${quickUpdateQty} (${existingItem.QTY} → ${existingItem.QTY + quickUpdateQty})`,
        )

        // Reset the quick update form
        setQuickUpdateQty(0)
        setCurrentItem((prev) => ({ ...prev, partNumber: "" }))

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(result.error || "Failed to submit quantity update")
      }
    } catch (error) {
      console.error("❌ Error updating quantity:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to submit quantity update"
      setError(`Quantity update failed: ${errorMessage}`)
    } finally {
      setQuickUpdateLoading(false)
    }
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
                      placeholder="Enter part number"
                      required
                      disabled={loading}
                      className={partNumberCheck.isDuplicate ? "border-orange-300 bg-orange-50" : ""}
                    />
                    {partNumberCheck.isChecking && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced duplicate warning with quick update option */}
                  {partNumberCheck.isDuplicate && partNumberCheck.existingItem && (
                    <Alert className="bg-orange-50 border-orange-200">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <div className="space-y-3">
                          <div>
                            <strong>⚠️ Part already exists in inventory!</strong>
                            <br />
                            <strong>Location:</strong> {partNumberCheck.existingItem.Location} • <strong>Qty:</strong>{" "}
                            {partNumberCheck.existingItem.QTY} • <strong>Package:</strong>{" "}
                            {partNumberCheck.existingItem.Package}
                          </div>

                          <div className="bg-white p-3 rounded border border-orange-200">
                            <div className="text-sm font-medium text-orange-900 mb-2">💡 Quick Quantity Update</div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={quickUpdateQty || ""}
                                onChange={(e) => setQuickUpdateQty(Number(e.target.value) || 0)}
                                placeholder="Qty to add"
                                className="w-24 h-8 text-sm"
                                disabled={quickUpdateLoading}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleQuickQuantityUpdate(partNumberCheck.existingItem!)}
                                disabled={quickUpdateLoading || quickUpdateQty <= 0 || !requesterName.trim()}
                                className="h-8 text-xs"
                              >
                                {quickUpdateLoading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <Edit className="w-3 h-3 mr-1" />
                                    Add {quickUpdateQty > 0 ? quickUpdateQty : "?"} qty
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="text-xs text-orange-700 mt-1">
                              Current: {partNumberCheck.existingItem.QTY} → New:{" "}
                              {partNumberCheck.existingItem.QTY + (quickUpdateQty || 0)}
                            </div>
                          </div>

                          <div className="text-sm text-orange-700">
                            Use the Edit function in the main inventory table to modify existing items.
                          </div>
                        </div>
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
                    placeholder="Enter manufacturer part number"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity *</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    value={currentItem.qty}
                    onChange={(e) => handleInputChange("qty", Number(e.target.value) || "")}
                    placeholder="Enter quantity"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
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
                    onChange={(e) => handleInputChange("reorderPoint", Number(e.target.value) || 0)}
                    placeholder="Enter reorder point"
                    disabled={loading}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Part Description *</Label>
                  <Input
                    id="description"
                    value={currentItem.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Enter part description"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  {useCustomSupplier ? (
                    <Input
                      ref={supplierInputRef}
                      value={currentItem.supplier}
                      onChange={(e) => handleInputChange("supplier", e.target.value)}
                      placeholder="Enter custom supplier"
                      disabled={loading}
                      onBlur={() => {
                        if (!currentItem.supplier.trim()) {
                          setUseCustomSupplier(false)
                        }
                      }}
                    />
                  ) : (
                    <Select
                      value={currentItem.supplier}
                      onValueChange={(value) => handleSelectChange("supplier", value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueSuppliers.map((supplier) => (
                          <SelectItem key={supplier} value={supplier}>
                            {supplier}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Add Custom Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  {useCustomLocation ? (
                    <Input
                      ref={locationInputRef}
                      value={currentItem.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="Enter custom location"
                      disabled={loading}
                      onBlur={() => {
                        if (!currentItem.location.trim()) {
                          setUseCustomLocation(false)
                        }
                      }}
                    />
                  ) : (
                    <LocationInput
                      value={currentItem.location}
                      onChange={(value) => handleInputChange("location", value)}
                      existingLocations={uniqueLocations}
                      pendingLocations={pendingLocations}
                      currentBatchLocations={currentBatchLocations}
                      disabled={loading}
                      placeholder="Type location or select existing"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="package">Package Type</Label>
                  {useCustomPackage ? (
                    <Input
                      ref={packageInputRef}
                      value={currentItem.package}
                      onChange={(e) => handleInputChange("package", e.target.value)}
                      placeholder="Enter custom package type"
                      disabled={loading}
                      onBlur={() => {
                        if (!currentItem.package.trim()) {
                          setUseCustomPackage(false)
                        }
                      }}
                    />
                  ) : (
                    <Select
                      value={currentItem.package}
                      onValueChange={(value) => handleSelectChange("package", value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select package type" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniquePackageTypes.map((packageType) => (
                          <SelectItem key={packageType} value={packageType}>
                            {packageType}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Add Custom Package</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Package auto-selected based on quantity. You can override for kits or custom packages.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={addToBatch} disabled={loading || partNumberCheck.isDuplicate} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Batch
                </Button>
                <Button type="button" variant="outline" onClick={resetCurrentItem} disabled={loading}>
                  Clear Form
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Batch Items Display */}
          {batchItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Items in Batch ({batchItems.length})</span>
                  <Badge variant="secondary">{batchItems.length} items ready</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {batchItems.map((item) => (
                    <div key={item.batchId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      {editingBatchId === item.batchId ? (
                        <div className="flex-1 grid grid-cols-6 gap-2 mr-4">
                          <Input
                            value={editingItem?.["Part number"] || ""}
                            onChange={(e) => handleEditingItemChange("Part number", e.target.value)}
                            placeholder="Part Number"
                            className="text-sm"
                          />
                          <Input
                            value={editingItem?.["Part description"] || ""}
                            onChange={(e) => handleEditingItemChange("Part description", e.target.value)}
                            placeholder="Description"
                            className="text-sm"
                          />
                          <Input
                            type="number"
                            value={editingItem?.QTY || ""}
                            onChange={(e) => handleEditingItemChange("QTY", Number(e.target.value) || "")}
                            placeholder="Qty"
                            className="text-sm"
                          />
                          <Input
                            value={editingItem?.Supplier || ""}
                            onChange={(e) => handleEditingItemChange("Supplier", e.target.value)}
                            placeholder="Supplier"
                            className="text-sm"
                          />
                          <Input
                            value={editingItem?.Location || ""}
                            onChange={(e) => handleEditingItemChange("Location", e.target.value)}
                            placeholder="Location"
                            className="text-sm"
                          />
                          <Input
                            value={editingItem?.Package || ""}
                            onChange={(e) => handleEditingItemChange("Package", e.target.value)}
                            placeholder="Package"
                            className="text-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="font-medium">{item["Part number"]}</div>
                          <div className="text-sm text-gray-600">
                            {item["Part description"]} • Qty: {item.QTY} • {item.Supplier} • {item.Location} •{" "}
                            {item.Package}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-1">
                        {editingBatchId === item.batchId ? (
                          <>
                            <Button size="sm" variant="outline" onClick={saveEditingBatchItem}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditingBatchItem}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => startEditingBatchItem(item)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => removeFromBatch(item.batchId)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={submitBatch}
            disabled={loading || batchItems.length === 0 || !requesterName.trim()}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              `Submit Batch (${batchItems.length})`
            )}
          </Button>
        </DialogFooter>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard Changes?</DialogTitle>
              <DialogDescription>
                You have unsaved changes in the form. Are you sure you want to discard them?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={cancelClose}>
                Keep Editing
              </Button>
              <Button variant="destructive" onClick={confirmCancel}>
                Discard Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch Confirmation Dialog */}
        <Dialog open={showBatchConfirm} onOpenChange={setShowBatchConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard Batch?</DialogTitle>
              <DialogDescription>
                You have {batchItems.length} items in your batch that haven't been submitted. Are you sure you want to
                discard them?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={cancelClose}>
                Keep Editing
              </Button>
              <Button variant="destructive" onClick={confirmCancel}>
                Discard Batch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
