"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, AlertCircle, RefreshCw } from "lucide-react"
import { parseExcelFile } from "@/lib/excel-parser"

interface FileUploadProps {
  onDataLoaded: (data: any[], packageNote: string, excelUrl?: string, filename?: string) => void
  onCancel?: () => void
  isReplacement?: boolean
}

export default function FileUpload({ onDataLoaded, onCancel, isReplacement = false }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
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
    setUploadProgress(0)
    setError(null)

    try {
      // First upload file to blob storage
      setUploadProgress(10)
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/excel/upload-to-blob", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload Excel file to storage")
      }

      const { url } = await uploadResponse.json()
      setUploadProgress(50)

      // Then parse the file for immediate use
      const { data, packageNote } = await parseExcelFile(file)
      setUploadProgress(100)

      // Pass the data, package note, and the blob URL to the parent component
      onDataLoaded(data, packageNote, url, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file")
      setUploadProgress(0)
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
          <p className="text-lg text-gray-600">
            {isReplacement
              ? "Upload a new Excel file to replace your current inventory"
              : "Upload your Excel file to get started"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              {isReplacement ? "Replace Inventory Excel File" : "Upload Your Inventory Excel File"}
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
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : "Processing..."}
                    </>
                  ) : (
                    "Upload & Process"
                  )}
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isReplacement && (
              <div className="flex justify-end mt-4">
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
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

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Your Excel file will be stored as the persistent source of truth for your
                inventory. The system will always read directly from this file when loading data.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
