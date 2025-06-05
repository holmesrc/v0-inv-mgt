"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function TestUploadPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Create a test file
      const testContent = "test,content\n1,2"
      const testFile = new File([testContent], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // Create form data
      const formData = new FormData()
      formData.append("file", testFile)

      // Test the endpoint
      const response = await fetch("/api/test-upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      setResult({
        status: response.status,
        data: data,
        success: response.ok,
      })
    } catch (error) {
      setResult({
        status: "ERROR",
        data: { error: error instanceof Error ? error.message : "Unknown error" },
        success: false,
      })
    } finally {
      setLoading(false)
    }
  }

  const testRealFile = async (file: File) => {
    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/test-upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      setResult({
        status: response.status,
        data: data,
        success: response.ok,
        fileName: file.name,
      })
    } catch (error) {
      setResult({
        status: "ERROR",
        data: { error: error instanceof Error ? error.message : "Unknown error" },
        success: false,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Test 1: Fake File Test</h3>
            <Button onClick={runTest} disabled={loading}>
              {loading ? "Testing..." : "Run Test with Fake File"}
            </Button>
          </div>

          <div>
            <h3 className="font-medium mb-2">Test 2: Real Excel File Test</h3>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  testRealFile(file)
                }
              }}
            />
          </div>

          {result && (
            <Card className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CardHeader>
                <CardTitle className={result.success ? "text-green-800" : "text-red-800"}>
                  Test Result - Status: {result.status}
                  {result.fileName && ` (File: ${result.fileName})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto bg-white p-3 rounded border">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <h3 className="font-medium text-blue-800 mb-2">Instructions:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. First click "Run Test with Fake File" to test the basic functionality</li>
            <li>2. Then use "Real Excel File Test" to upload your actual Excel file</li>
            <li>3. Copy the result and send it to me</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
