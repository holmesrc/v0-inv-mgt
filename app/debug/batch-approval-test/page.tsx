"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Search } from "lucide-react"

interface BatchAnalysis {
  id: string
  created_at: string
  requested_by: string
  status: string
  change_type: string
  is_batch_flag: boolean
  batch_items_count: number
  batch_items_sample: any[]
  has_valid_items: boolean
  validation_issues: string[]
}

interface SimulationResult {
  index: number
  original_item: any
  transformed_item: any
  validation_passed: boolean
  validation_errors: string[]
  duplicate_check: string
}

export default function BatchApprovalTestPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchAnalysis, setBatchAnalysis] = useState<BatchAnalysis[]>([])
  const [simulationResults, setSimulationResults] = useState<any>(null)
  const [selectedBatchId, setSelectedBatchId] = useState("")

  const loadBatchAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/batch-approval-test")
      const result = await response.json()

      if (result.success) {
        setBatchAnalysis(result.analysis)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batch analysis")
    } finally {
      setLoading(false)
    }
  }

  const runSimulation = async (batchId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/batch-approval-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchId,
          dryRun: true,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSimulationResults(result)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run simulation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Batch Approval Test</h1>
          <p className="text-muted-foreground">Debug and test batch approval operations</p>
        </div>
        <Button onClick={loadBatchAnalysis} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Load Batch Analysis
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Batch Analysis Results */}
      {batchAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Batch Operations</CardTitle>
            <CardDescription>Found {batchAnalysis.length} batch operations pending approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {batchAnalysis.map((batch) => (
                <div key={batch.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Batch ID: {batch.id}</h3>
                      <p className="text-sm text-muted-foreground">
                        Requested by: {batch.requested_by} • {new Date(batch.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={batch.status === "pending" ? "secondary" : "default"}>{batch.status}</Badge>
                      <Badge variant={batch.has_valid_items ? "default" : "destructive"}>
                        {batch.has_valid_items ? "Valid" : "Has Issues"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Change Type:</span> {batch.change_type}
                    </div>
                    <div>
                      <span className="font-medium">Is Batch:</span> {batch.is_batch_flag ? "Yes" : "No"}
                    </div>
                    <div>
                      <span className="font-medium">Items Count:</span> {batch.batch_items_count}
                    </div>
                    <div>
                      <span className="font-medium">Issues:</span> {batch.validation_issues.length}
                    </div>
                  </div>

                  {batch.validation_issues.length > 0 && (
                    <div className="bg-red-50 p-3 rounded">
                      <h4 className="font-medium text-red-800 mb-2">Validation Issues:</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {batch.validation_issues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {batch.batch_items_sample.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded">
                      <h4 className="font-medium mb-2">Sample Items:</h4>
                      <div className="space-y-2">
                        {batch.batch_items_sample.map((item, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">Item {index + 1}:</span> {item.part_number} -{" "}
                            {item.part_description} (Qty: {item.qty})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => runSimulation(batch.id)} disabled={loading}>
                      Run Simulation
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedBatchId(batch.id)} disabled={loading}>
                      Select for Testing
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Simulation */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Simulation</CardTitle>
          <CardDescription>Test a specific batch ID</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Batch ID</Label>
              <Input
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                placeholder="Enter batch ID to test"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => runSimulation(selectedBatchId)} disabled={!selectedBatchId || loading}>
                Run Simulation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Results */}
      {simulationResults && (
        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
            <CardDescription>
              Batch {simulationResults.batch_id} - {simulationResults.total_items} items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{simulationResults.valid_items}</div>
                  <div className="text-sm text-muted-foreground">Valid Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{simulationResults.invalid_items}</div>
                  <div className="text-sm text-muted-foreground">Invalid Items</div>
                </div>
                <div className="text-center">
                  <div className="flex justify-center">
                    {simulationResults.summary.would_succeed ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {simulationResults.summary.would_succeed ? "Would Succeed" : "Would Fail"}
                  </div>
                </div>
              </div>

              {simulationResults.summary.issues_found.length > 0 && (
                <div className="bg-red-50 p-4 rounded">
                  <h4 className="font-medium text-red-800 mb-2">Issues Found:</h4>
                  <div className="space-y-2">
                    {simulationResults.summary.issues_found.map((issue: any, index: number) => (
                      <div key={index} className="text-sm text-red-700">
                        <span className="font-medium">Item {issue.index + 1}</span> ({issue.part_number}):{" "}
                        {issue.errors.join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="max-h-96 overflow-y-auto">
                <h4 className="font-medium mb-2">Detailed Results:</h4>
                <div className="space-y-2">
                  {simulationResults.simulation_results.map((result: SimulationResult, index: number) => (
                    <div
                      key={index}
                      className={`border rounded p-3 ${
                        result.validation_passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">Item {result.index + 1}</span>
                        <Badge variant={result.validation_passed ? "default" : "destructive"}>
                          {result.validation_passed ? "Valid" : "Invalid"}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium">Part Number:</span> {result.transformed_item.part_number}
                        </div>
                        <div>
                          <span className="font-medium">Description:</span> {result.transformed_item.part_description}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {result.transformed_item.qty}
                        </div>
                        <div>
                          <span className="font-medium">Duplicate Check:</span> {result.duplicate_check}
                        </div>
                        {result.validation_errors.length > 0 && (
                          <div className="text-red-600">
                            <span className="font-medium">Errors:</span> {result.validation_errors.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
