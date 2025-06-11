"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Minimal versions of components to avoid the React error #130
const MinimalInventoryDashboard = () => {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Dashboard (Minimal Version)</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is a minimal version of the dashboard to fix the React error.</p>
          <p className="mt-4 text-green-600">
            If you're seeing this, the minimal version is working! You can now replace your components one by one.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MinimalApp() {
  return (
    <div>
      <MinimalInventoryDashboard />
    </div>
  )
}
