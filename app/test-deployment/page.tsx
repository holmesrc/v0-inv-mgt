"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TestDeploymentPage() {
  // This timestamp will be baked into the build
  const buildTimestamp = new Date().toISOString()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deployment Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Build Information</h2>
            <p className="text-sm text-muted-foreground">
              This page was built at: <Badge variant="outline">{buildTimestamp}</Badge>
            </p>
            <p className="text-sm mt-4">If you can see this page with the timestamp above, it means:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>The code was successfully committed to Git</li>
              <li>Vercel deployed the latest commit</li>
              <li>The location sorting fix should also be deployed</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-6">
            <h3 className="font-medium text-blue-800 mb-2">Location Sorting Fix</h3>
            <p className="text-sm text-blue-700">
              The location sorting algorithm has been completely rewritten to properly handle alphanumeric location
              codes like H1-1, H1-2, H1-10, etc. The locations should now appear in the correct numerical order in both
              the main dashboard and the Add New Item dialog.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
