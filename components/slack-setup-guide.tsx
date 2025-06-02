"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Info, ExternalLink } from "lucide-react"

export default function SlackSetupGuide() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Slack Integration Setup
        </CardTitle>
        <CardDescription>Configure your Slack app to enable interactive features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            To enable the approve/deny workflow, you need to configure your Slack app with interactive components.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div>
            <h4 className="font-medium mb-2">Required Slack App Configuration:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                Enable Interactive Components in your Slack app
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                Set Request URL to:{" "}
                <code className="bg-gray-100 px-1 rounded">your-domain.com/api/slack/interactions</code>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                Add the Purchase Request shortcut:{" "}
                <a
                  href="https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Slack Shortcut <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline">4</Badge>
                Ensure bot has permissions for #inventory-alerts and #PHL10-hw-lab-requests channels
              </li>
            </ul>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-1">Interactive Workflow Overview:</h5>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Low stock alert shows first 3 items with individual "Reorder" buttons</li>
              <li>2. Click "Show All Low Stock Items" to see complete list with reorder buttons</li>
              <li>3. Click "Reorder" buttons to launch the Purchase Request shortcut</li>
              <li>4. Complete purchase requests and send to #PHL10-hw-lab-requests channel</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
