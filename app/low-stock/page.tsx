"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingCart, AlertTriangle, Upload } from "lucide-react"
import Link from "next/link"

export default function LowStockPage() {
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Try to get inventory data from localStorage (where the dashboard stores it)
    try {
      const storedInventory = localStorage.getItem("inventory")
      const storedSettings = localStorage.getItem("alertSettings")

      if (storedInventory) {
        const inventory = JSON.parse(storedInventory)
        const settings = storedSettings ? JSON.parse(storedSettings) : { defaultReorderPoint: 10 }

        // Filter for low stock items
        const lowStock = inventory.filter((item: any) => {
          const reorderPoint = item.reorderPoint || settings.defaultReorderPoint
          return item.QTY <= reorderPoint
        })

        setLowStockItems(lowStock)
      } else {
        setError("No inventory data found. Please upload your inventory file first.")
      }
    } catch (err) {
      setError("Error loading inventory data")
      console.error("Error loading inventory:", err)
    } finally {
      setLoading(false)
    }
  }, [])

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
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
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
        <Link href="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>

      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800 mb-1">Low Stock Alert</h3>
              <p className="text-sm text-red-700">
                All items below are at or below their reorder point and require attention. Use the "Create Purchase
                Request" button to reorder items.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>Items that need to be reordered</CardDescription>
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
                    <Badge variant="destructive">{item.QTY}</Badge>
                  </TableCell>
                  <TableCell>{item.reorderPoint || 10}</TableCell>
                  <TableCell>{item.Supplier}</TableCell>
                  <TableCell>{item.Location}</TableCell>
                  <TableCell>
                    <a
                      href="https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Create Purchase Request
                      </Button>
                    </a>
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
