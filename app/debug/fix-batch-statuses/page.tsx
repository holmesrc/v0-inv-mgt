"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, AlertTriangle, RefreshCw, ArrowLeft, Wrench, Database, Info } from "lucide-react"
import Link from "next/link"

interface BatchAnalysis {
  id: string
  requestedBy: string
  createdAt: string
  totalItems: number
  statusCounts: {
    pending: number
    approved: number
    rejected: number
    inInventory: number
  }
  needsFix: boolean
}

export default function FixBatchStatusesPage() {
  const [analysis, setAnalysis] = useState<BatchAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fixResult, setFixResult] = useState<any>(null)

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/fix-batch-statuses")
      const result = await response.json()

      if (result.success) {
        setAnalysis(result.analysis)
      } else {
        setError(result.error || "Failed to load analysis")
      }
    } catch (error) {
      console.error("Error loading analysis:", error)
      setError(error instanceof Error ? error.message : "Failed to load analysis")
    } finally {
      setLoading(false)
    }
  }

  const fixBatchStatuses = async () => {
    try {
      setFixing(true)
      setError(null)
      setFixResult(null)

      const response = await fetch("/api/debug/fix-batch-statuses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (result.success) {
        setFixResult(result)
        // Reload analysis to see updated data
        await loadAnalysis()
      } else {
        setError(result.error || "Failed to fix batch statuses")
      }
    } catch (error) {
      console.error("Error fixing batch statuses:", error)
      setError(error instanceof Error ? error.message : "Failed to fix batch statuses")
    } finally {
      setFixing(false)
    }
  }

  const batchesNeedingFix = analysis.filter((a) => a.needsFix).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fix Batch Statuses</h1>
          <p className="text-muted-foreground">Analyze and fix batch item statuses to match actual inventory state</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAnalysis} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Load Analysis
          </Button>
          <Link href="/approvals">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Approvals
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Fix Result Alert */}
      {fixResult && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{fixResult.message}</p>
              <div className="text-sm">
                <p>• Fixed: {fixResult.fixedBatches.length} batches</p>
                <p>• Already correct: {fixResult.alreadyCorrect.length} batches</p>
                <p>• Total processed: {fixResult.totalProcessed} batches</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="ml-2" onClick={() => setFixResult(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Info className="w-5 h-5" />
            How This Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700">
          <div className="space-y-2">
            <p>
              <strong>Problem:</strong> Some approved batch items still show as "pending" even though they were
              successfully added to inventory.
            </p>
            <p>
              <strong>Solution:</strong> This tool checks each item in approved batches against the actual inventory and
              updates the status to "approved" if the item exists in inventory.
            </p>
            <p>
              <strong>Safe:</strong> This only updates status tracking data, it doesn't modify your actual inventory.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {analysis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.length}</div>
              <p className="text-xs text-muted-foreground">Approved batches found</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Need Fixing</CardTitle>
              <Wrench className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{batchesNeedingFix}</div>
              <p className="text-xs text-muted-foreground">Batches with incorrect statuses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Already Correct</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{analysis.length - batchesNeedingFix}</div>
              <p className="text-xs text-muted-foreground">Batches with correct statuses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Action Required</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <Button
                onClick={fixBatchStatuses}
                disabled={fixing || batchesNeedingFix === 0}
                className="w-full"
                variant={batchesNeedingFix > 0 ? "default" : "outline"}
              >
                {fixing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                {fixing ? "Fixing..." : batchesNeedingFix > 0 ? `Fix ${batchesNeedingFix} Batches` : "All Fixed"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Analysis</CardTitle>
          <CardDescription>
            Review batch statuses and identify which ones need fixing. Items "In Inventory" should match "Approved"
            count.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {loading ? "Loading analysis..." : "Click 'Load Analysis' to check batch statuses"}
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Items</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>In Inventory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.map((batch) => (
                    <TableRow key={batch.id} className={batch.needsFix ? "bg-yellow-50" : ""}>
                      <TableCell>
                        {batch.needsFix ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Wrench className="w-3 h-3 mr-1" />
                            Needs Fix
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Correct
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{batch.id.slice(0, 8)}...</TableCell>
                      <TableCell>{batch.requestedBy}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(batch.createdAt).toLocaleDateString()}
                          <br />
                          <span className="text-muted-foreground">
                            {new Date(batch.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{batch.totalItems}</TableCell>
                      <TableCell className="text-center">
                        {batch.statusCounts.pending > 0 ? (
                          <Badge variant="secondary">{batch.statusCounts.pending}</Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {batch.statusCounts.approved > 0 ? (
                          <Badge variant="default">{batch.statusCounts.approved}</Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {batch.statusCounts.rejected > 0 ? (
                          <Badge variant="destructive">{batch.statusCounts.rejected}</Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            batch.statusCounts.inInventory === batch.statusCounts.approved
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {batch.statusCounts.inInventory}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
