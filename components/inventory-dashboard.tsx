"use client"

import { useState, useMemo } from "react"
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
} from "lucide-react"
import type { InventoryItem, PurchaseRequest, AlertSettings } from "@/types/inventory"
import {
  sendSlackMessage,
  formatPurchaseRequest,
  sendInteractiveLowStockAlert,
  sendInteractiveFullLowStockAlert,
} from "@/lib/slack"
import { downloadExcelFile } from "@/lib/excel-generator"
import FileUpload from "./file-upload"
import AddInventoryItem from "./add-inventory-item"

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

  // Show upload screen if no inventory data
  const [showUpload, setShowUpload] = useState(inventory.length === 0)

  // Filter and search logic
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item["Part number"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["MFG Part number"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Part description"].toLowerCase().includes(searchTerm.toLowerCase()) ||
        item["Supplier"].toLowerCase().includes(searchTerm.toLowerCase())

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

  const locations = useMemo(() => {
    const uniqueLocations = Array.from(new Set(inventory.map((item) => item["Location"]).filter(Boolean)))
    return uniqueLocations.sort() // Sort alphabetically for consistency
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
  const addInventoryItem = (newItem: Omit<InventoryItem, "id" | "lastUpdated">) => {
    const item: InventoryItem = {
      ...newItem,
      id: `item-${Date.now()}`,
      lastUpdated: new Date(),
    }
    setInventory((prev) => [...prev, item])
  }

  // Update reorder point
  const updateReorderPoint = (itemId: string, newReorderPoint: number) => {
    setInventory((prev) => prev.map((item) => (item.id === itemId ? { ...item, reorderPoint: newReorderPoint } : item)))
  }

  // Update inventory item quantity
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, QTY: newQuantity, lastUpdated: new Date() } : item)),
    )
  }

  // Delete inventory item
  const deleteInventoryItem = (itemId: string) => {
    setInventory((prev) => prev.filter((item) => item.id !== itemId))
  }

  // Download Excel file
  const handleDownloadExcel = () => {
    downloadExcelFile(inventory, packageNote, "inventory_updated")
  }

  // Create purchase request
  const createPurchaseRequest = async (item: InventoryItem, quantity: number, urgency: "low" | "medium" | "high") => {
    const request: PurchaseRequest = {
      id: Date.now().toString(),
      partNumber: item["Part number"],
      description: item["Part description"],
      quantity,
      urgency,
      requestedBy: "System User",
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
    if (lowStockItems.length > 0) {
      const formattedItems = lowStockItems.map((item) => ({
        partNumber: item["Part number"],
        description: item["Part description"],
        supplier: item["Supplier"],
        location: item["Location"],
        currentStock: item["QTY"],
        reorderPoint: item.reorderPoint || alertSettings.defaultReorderPoint,
      }))

      try {
        await sendInteractiveLowStockAlert(formattedItems)
      } catch (error) {
        console.error("Failed to send interactive low stock alert, trying simple version:", error)
        try {
          // Try the simple interactive version
          const { sendSimpleInteractiveLowStockAlert } = await import("@/lib/slack")
          await sendSimpleInteractiveLowStockAlert(formattedItems)
        } catch (fallbackError) {
          console.error("Failed to send simple interactive alert, using text fallback:", fallbackError)
          // Final fallback to text message
          const { createLowStockAlertMessage } = await import("@/lib/slack")
          const message = createLowStockAlertMessage(formattedItems)
          await sendSlackMessage(message)
        }
      }
    } else {
      alert("No low stock items to report!")
    }
  }

  // Send full low stock alert
  const sendFullAlert = async () => {
    if (lowStockItems.length > 0) {
      const formattedItems = lowStockItems.map((item) => ({
        partNumber: item["Part number"],
        description: item["Part description"],
        supplier: item["Supplier"],
        location: item["Location"],
        currentStock: item["QTY"],
        reorderPoint: item.reorderPoint || alertSettings.defaultReorderPoint,
      }))

      try {
        await sendInteractiveFullLowStockAlert(formattedItems)
      } catch (error) {
        console.error("Failed to send interactive full alert:", error)
        alert("Failed to send full Slack alert. Please check your Slack webhook configuration.")
      }
    } else {
      alert("No low stock items to report!")
    }
  }

  // Handle data loading
  const handleDataLoaded = (data: any[], note: string) => {
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
            locations={locations}
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
                    onChange={(e) => setAlertSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <Label>Enable weekly alerts</Label>
                </div>
                <div>
                  <Label>Day of week</Label>
                  <Select
                    value={alertSettings.dayOfWeek.toString()}
                    onValueChange={(value) =>
                      setAlertSettings((prev) => ({ ...prev, dayOfWeek: Number.parseInt(value) }))
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
                    onChange={(e) => setAlertSettings((prev) => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Default reorder point</Label>
                  <Input
                    type="number"
                    value={alertSettings.defaultReorderPoint}
                    onChange={(e) =>
                      setAlertSettings((prev) => ({
                        ...prev,
                        defaultReorderPoint: Number.parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Package Sorting Note */}
      {packageNote && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">Package Sorting Information</h3>
                <p className="text-sm text-yellow-700">{packageNote}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Management Info */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-800 mb-1">File Management</h3>
              <p className="text-sm text-green-700">
                You can add new items using the "Add New Item" button and download an updated Excel file with all your
                changes. The downloaded file will include all original data plus any new entries you've added.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slack Integration Status */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Slack Integration Active</h3>
              <p className="text-sm text-blue-700">
                Low stock alerts will be sent to #inventory-alerts with links to your Purchase Request shortcut.
                {lowStockItems.length > 0 && ` Currently ${lowStockItems.length} items need attention.`}
                {lowStockItems.length > 3 && " Use 'Send Full Alert' to see all items in Slack."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Removed Package Types and Pending Requests */}
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
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approaching Low</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{approachingLowStockItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by part number, MFG part number, description, or supplier..."
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
                      return <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
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
                              createPurchaseRequest(item, quantity, urgency)
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
