"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, RefreshCw, Upload, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function ExcelFileInfo({ onUploadNew }: { onUploadNew: () => void }) {
  const [fileInfo, setFileInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState(true)

  const loadFileInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/excel")
      const data = await response.json()

      if (data.configured === false) {
        setConfigured(false)
        setError("Supabase is not configured")
        setFileInfo(null)
      } else if (data.exists) {
        setFileInfo(data.metadata)
        setConfigured(true)
        setError(null)
      } else {
        setFileInfo(null)
        setConfigured(true)
        setError(null)
      }
    } catch (err) {
      console.error("Error loading file info:", err)
      setError("Failed to load Excel file information")
      setConfigured(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFileInfo()
  }, [])

  if (loading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-center p-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mr-2" />
            <span className="text-blue-700">Loading Excel file information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!configured) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-800 mb-1">Supabase Not Configured</h3>
              <p className="text-sm text-orange-700 mb-2">
                Excel file storage requires Supabase configuration. Your inventory will be stored locally in your
                browser only.
              </p>
              <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                <p className="font-medium mb-1">To enable persistent Excel storage:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Set up a Supabase account at supabase.com</li>
                  <li>Create a new project</li>
                  <li>Add environment variables to your deployment</li>
                  <li>Run the database setup script</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && configured) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800 mb-1">Error Loading File Information</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!fileInfo) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Upload className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 mb-1">No Excel File Found</h3>
              <p className="text-sm text-yellow-700 mb-2">
                You haven't uploaded an Excel file yet. Upload one to enable persistent inventory management.
              </p>
              <Button size="sm" onClick={onUploadNew}>
                Upload Excel File
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-800 mb-1">Excel File Source Active</h3>
            <p className="text-sm text-green-700">Your inventory is being managed from the Excel file you uploaded.</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-green-700">
              <div>
                <span className="font-medium">Last Updated:</span>{" "}
                {fileInfo.lastModified
                  ? formatDistanceToNow(new Date(fileInfo.lastModified), { addSuffix: true })
                  : "Unknown"}
              </div>
              <div>
                <span className="font-medium">File Size:</span>{" "}
                {fileInfo.size ? `${(fileInfo.size / 1024).toFixed(1)} KB` : "Unknown"}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={loadFileInfo}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button size="sm" onClick={onUploadNew}>
                Upload New File
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
