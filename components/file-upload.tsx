"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, AlertCircle, Database } from "lucide-react"
import { parseExcelFile } from "@/lib/excel-parser"

interface FileUploadProps {
  onDataLoaded: (data: any[], packageNote: string) => void
}

export default function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleChooseFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleUpload = useCallback(async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setUploadSuccess(null)

    try {
      // First, parse the file locally to get the data
      const { data, packageNote } = await parseExcelFile(file)

      // Then, upload the file to storage
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/excel", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload file")
      }

      const result = await response.json()
      setUploadSuccess(`File uploaded successfully! ${result.inventoryCount} items stored permanently.`)

      // Pass the data to the parent component
      onDataLoaded(data, packageNote)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file")
    } finally {
      setLoading(false)
    }
  }, [file, onDataLoaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      setFile(droppedFile)
      setError(null)
    } else {
      setError("Please upload an Excel file (.xlsx or .xls)")
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Inventory Management System</h1>
          <p className="text-lg text-gray-600">Upload your Excel file to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Upload Your Inventory Excel File
            </CardTitle>
            <CardDescription>
              Upload your Excel file with columns: Part number, MFG Part number, QTY, Part description, Supplier,
              Location, Package
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg text-gray-600">Drag and drop your Excel file here</p>
                <p className="text-sm text-gray-500">or use the button below</p>
              </div>
            </div>

            <Input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />

            <div className="text-center">
              <Button variant="outline" onClick={handleChooseFileClick}>
                Choose File
              </Button>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="text-sm font-medium text-blue-900">{file.name}</span>
                    <p className="text-xs text-blue-600">({(file.size / 1024).toFixed(1)} KB)</p>
                  </div>
                </div>
                <Button onClick={handleUpload} disabled={loading}>
                  {loading ? "Processing..." : "Upload & Process"}
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {uploadSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <Database className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{uploadSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Expected Excel Format:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Column A: Part number</p>
                <p>• Column B: MFG Part number</p>
                <p>• Column C: QTY</p>
                <p>• Column D: Part description</p>
                <p>• Column E: Supplier</p>
                <p>• Column F: Location</p>
                <p>• Column G: Package</p>
                <p className="text-xs text-gray-500 mt-2">Note: Cell J1 should contain package sorting information</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-800 mb-1">Persistent Excel Storage</h3>
                  <p className="text-sm text-blue-700">
                    Your Excel file will be stored securely in the cloud. The system will always use this file as the
                    source of truth for your inventory data.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
