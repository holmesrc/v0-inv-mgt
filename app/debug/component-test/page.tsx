"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Import components individually to test them
import FileUpload from "@/components/file-upload"
// We'll conditionally render these based on user selection
// import InventoryDashboard from "@/components/inventory-dashboard"
// import AddInventoryItem from "@/components/add-inventory-item"

export default function ComponentTestPage() {
  const [activeComponent, setActiveComponent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mock props for components that need them
  const mockProps = {
    onDataLoaded: (data: any[], note: string) => {
      console.log("Data loaded:", data.length, "items")
      console.log("Package note:", note)
    },
    onAddItem: (item: any, requester: string) => {
      console.log("Adding item:", item)
      console.log("Requested by:", requester)
    },
    packageTypes: ["0201", "0402", "0603", "0805", "1206"],
    suppliers: ["Digi-Key", "Mouser", "Arrow"],
    locations: ["H1-1", "H1-2", "H2-1"],
    defaultReorderPoint: 10,
  }

  const renderComponent = () => {
    try {
      switch (activeComponent) {
        case "file-upload":
          return <FileUpload onDataLoaded={mockProps.onDataLoaded} />
        case "inventory-dashboard":
          // We'll dynamically import this to avoid the error on page load
          const InventoryDashboard = require("@/components/inventory-dashboard").default
          return <InventoryDashboard />
        case "add-inventory-item":
          // We'll dynamically import this to avoid the error on page load
          const AddInventoryItem = require("@/components/add-inventory-item").default
          return (
            <AddInventoryItem
              onAddItem={mockProps.onAddItem}
              packageTypes={mockProps.packageTypes}
              suppliers={mockProps.suppliers}
              locations={mockProps.locations}
              defaultReorderPoint={mockProps.defaultReorderPoint}
            />
          )
        default:
          return <div className="p-4 text-center">Select a component to test</div>
      }
    } catch (err) {
      setError(`Error rendering ${activeComponent}: ${err instanceof Error ? err.message : String(err)}`)
      return <div className="p-4 bg-red-50 text-red-800 rounded-md">{error}</div>
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Component Diagnostic Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This tool helps identify which component is causing the React error #130.</p>

          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={activeComponent === "file-upload" ? "default" : "outline"}
              onClick={() => {
                setActiveComponent("file-upload")
                setError(null)
              }}
            >
              Test FileUpload
            </Button>
            <Button
              variant={activeComponent === "inventory-dashboard" ? "default" : "outline"}
              onClick={() => {
                setActiveComponent("inventory-dashboard")
                setError(null)
              }}
            >
              Test InventoryDashboard
            </Button>
            <Button
              variant={activeComponent === "add-inventory-item" ? "default" : "outline"}
              onClick={() => {
                setActiveComponent("add-inventory-item")
                setError(null)
              }}
            >
              Test AddInventoryItem
            </Button>
          </div>

          {error && (
            <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-bold text-red-800">Error Detected:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="border rounded-md p-1">
            <div className="bg-gray-50 p-4 rounded-md">{renderComponent()}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minimal Component Replacements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            If you identified the problematic component above, you can use one of these minimal replacements to get your
            app working again:
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function InventoryDashboard() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Dashboard (Minimal Version)</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is a minimal version of the dashboard to fix the React error.</p>
        </CardContent>
      </Card>
    </div>
  )
}`)
                alert("Minimal InventoryDashboard copied to clipboard!")
              }}
            >
              Copy Minimal InventoryDashboard
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function AddInventoryItem({ onAddItem, packageTypes, suppliers, locations, defaultReorderPoint }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Add New Item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Inventory Item (Minimal Version)</DialogTitle>
        </DialogHeader>
        <p>This is a minimal version to fix the React error.</p>
      </DialogContent>
    </Dialog>
  )
}`)
                alert("Minimal AddInventoryItem copied to clipboard!")
              }}
            >
              Copy Minimal AddInventoryItem
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function FileUpload({ onDataLoaded }) {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>File Upload (Minimal Version)</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is a minimal version of the file upload to fix the React error.</p>
          <Button 
            onClick={() => onDataLoaded([], "Test note")}
            className="mt-4"
          >
            Simulate Upload
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}`)
                alert("Minimal FileUpload copied to clipboard!")
              }}
            >
              Copy Minimal FileUpload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
