"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingCart, AlertTriangle, Upload, RefreshCw } from "lucide-react"
import Link from "next/link"
import { ReorderButton } from "@/components/reorder-button"

export default function LowStockPage() {
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLowStockItems()
  }, [])

  const loadLowStockItems = async () => {
    try {
      setLoading(true)

      // Try to load from Excel file first
      const response = await fetch("/api/excel", { method: "PUT" })
      const result = await response.json()

      if (result.success && result.inventory.length > 0) {
        // Filter for low stock items
        const lowStock = result.inventory.filter((item: any) => {
          const reorderPoint = item.reorderPoint || 10
          return item.QTY <= reorderPoint
        })
        setLowStockItems(lowStock)
      } else {
        // Fallback to database API
        const dbResponse = await fetch("/api/inventory")
        const dbResult = await dbResponse.json()

        if (dbResult.success && dbResult.data.length > 0) {
          // Filter for low stock items
          const lowStock = dbResult.data.filter((item: any) => {
            const reorderPoint = item.reorderPoint || 10
            return item.QTY <= reorderPoint
          })
          setLowStockItems(lowStock)
        } else {
          // Fallback to localStorage
          const storedInventory = localStorage.getItem("inventory")
          const storedSettings = localStorage.getItem("alertSettings")

          if (storedInventory) {
            const inventory = JSON.parse(storedInventory)
            const settings = storedSettings ? JSON.parse(storedSettings) : { defaultReorderPoint: 10 }

            const lowStock = inventory.filter((item: any) => {
              const reorderPoint = item.reorderPoint || settings.defaultReorderPoint
              return item.QTY <= reorderPoint
            })

            setLowStockItems(lowStock)
          } else {
            setError("No inventory data found. Please upload your inventory file first.")
          }
        }
      }
    } catch (err) {
      console.error("Error loading low stock items:", err)
      setError("Error loading inventory data")
    } finally {
      setLoading(false)
    }
  }

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

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Low Stock Items</h1>
            <p className="text-muted-foreground">Unable to load inventory data</p>
          </div>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Upload className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">No Inventory Data</h3>
                <p className="text-sm text-yellow-700 mb-3">{error}</p>
                <Link href="/">
                  <Button size="sm">Go to Dashboard to Upload Inventory</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (lowStockItems.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Low Stock Items</h1>
            <p className="text-muted-foreground">No items below reorder point</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadLowStockItems}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link href="/">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-800 mb-1">All Stock Levels Good</h3>
                <p className="text-sm text-green-700">
                  No items are currently below their reorder points. All inventory levels are adequate.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Low Stock Items</h1>
          <p className="text-muted-foreground">{lowStockItems.length} items below reorder point</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadLowStockItems}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800 mb-1">Low Stock Alert</h3>
              <p className="text-sm text-red-700">
                All items below are at or below their reorder point and require attention. Use the "Send to Slack" button 
                to send a notification with a workflow link that you can click directly in Slack.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>Items that need to be reordered - click "Send to Slack" for workflow link</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Number</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="font-medium">{item["Part number"]}</TableCell>
                  <TableCell>{item["Part description"]}</TableCell>
                  <TableCell>
                    <Badge variant={item.QTY <= 0 ? "destructive" : "secondary"}>
                      {item.QTY}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.reorderPoint || 10}</TableCell>
                  <TableCell>{item.Supplier || 'TBD'}</TableCell>
                  <TableCell>{item.Location || 'Unknown'}</TableCell>
                  <TableCell>
                    <ReorderButton
                      partNumber={item["Part number"]}
                      description={item["Part description"]}
                      currentQty={item.QTY}
                      reorderPoint={item.reorderPoint || 10}
                      supplier={item.Supplier}
                      location={item.Location}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Reorder Process</h3>
              <p className="text-sm text-blue-700 mb-2">
                Each "Send to Slack" button will:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 ml-4">
                <li>• Send a detailed notification to your Slack channel</li>
                <li>• Include a clickable workflow link within Slack</li>
                <li>• Provide all part information in the message</li>
                <li>• Allow you to click the workflow link directly in Slack</li>
              </ul>
              <p className="text-sm text-blue-700 mt-2">
                <strong>Note:</strong> Workflow links only work within Slack, not in web browsers. 
                After clicking "Send to Slack", go to your Slack channel and click the workflow link there.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
