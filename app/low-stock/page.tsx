import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingCart, AlertTriangle } from "lucide-react"
import Link from "next/link"

// This is a simplified version that would normally fetch data from your database
// For demo purposes, we're using mock data
export default function LowStockPage() {
  // Mock data - in a real app, you would fetch this from your database
  const lowStockItems = [
    {
      partNumber: "490-12158-ND",
      description: "CAP KIT CER 5.1PF-47PF 1260PCS",
      supplier: "DIGIKEY",
      location: "H2-58",
      currentStock: 2,
      reorderPoint: 10,
    },
    {
      partNumber: "490-12157-ND",
      description: "CAP KIT CERAMIC 0.1PF-5PF 1000PC",
      supplier: "DIGIKEY",
      location: "H2-59",
      currentStock: 3,
      reorderPoint: 10,
    },
    {
      partNumber: "490-12158-ND",
      description: "CAP KIT CER 5.1PF-47PF 1260PCS",
      supplier: "DIGIKEY",
      location: "H2-60",
      currentStock: 2,
      reorderPoint: 10,
    },
    {
      partNumber: "311-1.00KCRCT-ND",
      description: "RES 1.00K OHM 1/4W 1% AXIAL",
      supplier: "DIGIKEY",
      location: "C3-D4",
      currentStock: 3,
      reorderPoint: 15,
    },
    {
      partNumber: "296-8502-1-ND",
      description: "IC MCU 8BIT 32KB FLASH 28DIP",
      supplier: "Microchip",
      location: "E5-F6",
      currentStock: 2,
      reorderPoint: 8,
    },
    {
      partNumber: "445-173212-ND",
      description: "CAP CERAMIC 10UF 25V X7R 0805",
      supplier: "TDK",
      location: "G7-H8",
      currentStock: 1,
      reorderPoint: 20,
    },
    {
      partNumber: "RMCF0603FT10K0CT-ND",
      description: "RES 10K OHM 1/10W 1% 0603 SMD",
      supplier: "Stackpole",
      location: "I9-J10",
      currentStock: 4,
      reorderPoint: 25,
    },
  ]

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
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.partNumber}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">{item.currentStock}</Badge>
                  </TableCell>
                  <TableCell>{item.reorderPoint}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{item.location}</TableCell>
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
