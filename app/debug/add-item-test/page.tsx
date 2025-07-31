"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

export default function AddItemTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testItem, setTestItem] = useState({
    "Part number": "TEST-12345",
    "MFG Part number": "TEST-MFG-12345",
    QTY: 10,
    "Part description": "Test Item for Diagnostic",
    Supplier: "Test Supplier",
    Location: "TEST-LOC",
    Package: "TEST-PKG",
    reorderPoint: 5,
  })

  const runTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/add-item-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testItem }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        logs: ["Error running test"],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Add Item Test</h1>
        <p className="text-muted-foreground">Test adding individual items to the database</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Item Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Part Number</Label>
              <Input
                value={testItem["Part number"]}
                onChange={(e) => setTestItem({ ...testItem, "Part number": e.target.value })}
              />
            </div>
            <div>
              <Label>MFG Part Number</Label>
              <Input
                value={testItem["MFG Part number"]}
                onChange={(e) => setTestItem({ ...testItem, "MFG Part number": e.target.value })}
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={testItem.QTY}
                onChange={(e) => setTestItem({ ...testItem, QTY: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Reorder Point</Label>
              <Input
                type="number"
                value={testItem.reorderPoint}
                onChange={(e) => setTestItem({ ...testItem, reorderPoint: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input
                value={testItem["Part description"]}
                onChange={(e) => setTestItem({ ...testItem, "Part description": e.target.value })}
              />
            </div>
            <div>
              <Label>Supplier</Label>
              <Input
                value={testItem.Supplier}
                onChange={(e) => setTestItem({ ...testItem, Supplier: e.target.value })}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={testItem.Location}
                onChange={(e) => setTestItem({ ...testItem, Location: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={runTest} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Add Item
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
              <AlertDescription className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>
                  <strong>{result.success ? "Success:" : "Error:"}</strong> {result.message || result.error}
                </span>
              </AlertDescription>
            </Alert>

            {result.success && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-sm font-medium">Before Count</div>
                  <div className="text-2xl font-bold">{result.beforeCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">After Count</div>
                  <div className="text-2xl font-bold">{result.afterCount}</div>
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Detailed Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
                  {result.logs?.map((log: string, index: number) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  )) || "No logs available"}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
