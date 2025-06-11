"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileSpreadsheet, Upload } from "lucide-react"

export default function MinimalFileUpload({ onDataLoaded = () => {} }) {
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleUpload = () => {
    if (!file) return

    // Simulate successful upload
    setTimeout(() => {
      onDataLoaded([{ "Part number": "TEST-001", QTY: 10 }], "Test package note")
      alert("File uploaded successfully!")
    }, 1000)
  }

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
            <CardDescription>Minimal version to fix React error #130</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg text-gray-600">Drag and drop your Excel file here</p>
                <p className="text-sm text-gray-500">or use the button below</p>
              </div>
            </div>

            <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />

            {file && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="text-sm font-medium text-blue-900">{file.name}</span>
                    <p className="text-xs text-blue-600">({(file.size / 1024).toFixed(1)} KB)</p>
                  </div>
                </div>
                <Button onClick={handleUpload}>Upload & Process</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
