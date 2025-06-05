"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Database, ExternalLink, Copy } from "lucide-react"

export default function SupabaseSetupGuide() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const envVars = `NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key`

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Supabase Setup Required
        </CardTitle>
        <CardDescription>
          Configure Supabase to enable persistent Excel file storage and database features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            To enable persistent Excel file storage and database features, you need to set up Supabase.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div>
            <h4 className="font-medium mb-2">Setup Steps:</h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li className="flex items-center gap-2">
                <span>Create a free Supabase account</span>
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  supabase.com <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Create a new project in your Supabase dashboard</li>
              <li>Go to Settings → API to find your project URL and keys</li>
              <li>Add the environment variables to your Vercel deployment</li>
              <li>Run the database setup script in the Supabase SQL editor</li>
            </ol>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Environment Variables Needed:</h5>
            <div className="relative">
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{envVars}</pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(envVars)}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-1">What You Get With Supabase:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Persistent Excel file storage in the cloud</li>
              <li>• Database backup of your inventory data</li>
              <li>• Multi-device access to your inventory</li>
              <li>• Automatic data synchronization</li>
              <li>• Settings persistence across sessions</li>
            </ul>
          </div>

          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <h5 className="font-medium text-yellow-900 mb-1">Without Supabase:</h5>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Data is stored only in your browser (localStorage)</li>
              <li>• Data will be lost if you clear browser data</li>
              <li>• No access from other devices</li>
              <li>• Excel file upload works but isn't persistent</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
