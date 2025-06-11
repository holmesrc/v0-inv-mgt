"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Import minimal versions of components
import MinimalInventoryDashboard from "@/components/minimal-inventory-dashboard"
import MinimalAddInventoryItem from "@/components/minimal-add-inventory-item"
import MinimalFileUpload from "@/components/minimal-file-upload"

export default function ReplaceComponentsPage() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Replace Components</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This page uses minimal versions of your components to fix the React error #130. You can use these as
            temporary replacements until you fix the original components.
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="add-item">Add Item</TabsTrigger>
              <TabsTrigger value="file-upload">File Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <MinimalInventoryDashboard />
            </TabsContent>

            <TabsContent value="add-item" className="flex justify-center py-8">
              <MinimalAddInventoryItem />
            </TabsContent>

            <TabsContent value="file-upload">
              <MinimalFileUpload
                onDataLoaded={(data, note) => {
                  console.log("Data loaded:", data)
                  console.log("Note:", note)
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="mt-8 p-4 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">How to use these components:</h3>
            <ol className="list-decimal pl-5 space-y-2 text-blue-700">
              <li>Identify which component is causing the React error #130 using the Component Test page</li>
              <li>Replace that component with the minimal version from this page</li>
              <li>Once your app is working again, you can gradually restore functionality</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
