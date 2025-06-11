"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export default function MinimalInventoryDashboard() {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management System</h1>
          <p className="text-muted-foreground">Minimal version to fix React error #130</p>
        </div>
        <div className="flex gap-2">
          <Button>Add New Item</Button>
          <Button variant="outline">Download Excel</Button>
          <Button variant="outline">Upload</Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8">
            This is a minimal version of the inventory dashboard to fix the React error #130.
          </p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setError("This is a test error message. You can dismiss it.")} variant="outline">
              Test Error Message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
