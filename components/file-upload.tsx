"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from "lucide-react"
import { parseExcelFile } from "@/lib/excel-parser"

interface FileUploadProps {
  onDataLoaded: (data: any[], note: string) => void
}

export default function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      setError(null)
      setSuccess(null)

      try {
        console.log("Processing file:", file.name)
        const result = await parseExcelFile(file)

        if (result.success && result.data.length > 0) {
          console.log(`Parsed ${result.data.length} items from Excel file`)
          onDataLoaded(result.data, result.packageNote || "")
          setSuccess(`Successfully loaded ${result.data.length} items from ${file.name}`)
        } else {
          throw new Error(result.error || "No data found in file")
        }
      } catch (error) {
        console.error("Error processing file:", error)
        setError(error instanceof Error ? error.message : "Failed to process file")
      } finally {
        setUploading(false)
      }
    },
    [onDataLoaded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  })

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Inventory Management System</h1>
        <p className="text-muted-foreground">Upload your Excel inventory file to get started</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload Inventory File
          </CardTitle>
          <CardDescription>Upload an Excel file (.xlsx or .xls) containing your inventory data</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} disabled={uploading} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the Excel file here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  {uploading ? "Processing file..." : "Drag & drop your Excel file here"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">or click to select a file</p>
                <Button variant="outline" disabled={uploading}>
                  {uploading ? "Processing..." : "Select File"}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Expected Excel Format:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Part number</li>
              <li>• MFG Part number</li>
              <li>• QTY (quantity)</li>
              <li>• Part description</li>
              <li>• Supplier</li>
              <li>• Location</li>
              <li>• Package</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
