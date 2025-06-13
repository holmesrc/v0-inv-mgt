"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"

export default function ApprovalPage() {
  const params = useParams()
  const router = useRouter()
  const changeId = params.changeId as string

  const [loading, setLoading] = useState(true)
  const [change, setChange] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState<any>(null)

  // Fetch the change details
  useEffect(() => {
    const fetchChange = async () => {
      try {
        setLoading(true)
        console.log(`Fetching change details for ID: ${changeId}`)

        const response = await fetch(`/api/inventory/pending/${changeId}`)
        const responseText = await response.text()

        console.log(`API response status: ${response.status}`)
        console.log(`API response text: ${responseText.substring(0, 200)}...`)

        if (!response.ok) {
          throw new Error(`Failed to fetch change: ${response.status} - ${responseText}`)
        }

        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`)
        }

        if (!data.data) {
          throw new Error(`No change data found: ${JSON.stringify(data)}`)
        }

        setChange(data.data)
      } catch (err) {
        console.error("Error fetching change:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch change details")
      } finally {
        setLoading(false)
      }
    }

    if (changeId) {
      fetchChange()
    }
  }, [changeId])

  // Handle approve/reject actions
  const handleAction = async (action: "approve" | "reject") => {
    try {
      setActionLoading(true)
      setActionResult(null)

      console.log(`Processing ${action} action for change ID: ${changeId}`)

      const response = await fetch(`/api/approval/${changeId}?action=${action}`, {
        method: "POST", // Changed to POST for better semantics
      })

      const responseText = await response.text()
      console.log(`API response status: ${response.status}`)
      console.log(`API response text: ${responseText.substring(0, 200)}...`)

      if (!response.ok) {
        throw new Error(`Failed to ${action} change: ${response.status} - ${responseText}`)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`)
      }

      setActionResult({ success: true, action, message: result.message || `Change ${action}d successfully` })

      // Redirect to success page after a short delay
      setTimeout(() => {
        router.push("/approval-success")
      }, 2000)
    } catch (err) {
      console.error(`Error during ${action} action:`, err)
      setActionResult({
        success: false,
        action,
        error: err instanceof Error ? err.message : `Failed to ${action} change`,
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Display loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading change details...</p>
      </div>
    )
  }

  // Display error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/")}>Return to Dashboard</Button>
      </div>
    )
  }

  // Display change not found
  if (!change) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Change Not Found</AlertTitle>
          <AlertDescription>The requested change could not be found or has already been processed.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/")}>Return to Dashboard</Button>
      </div>
    )
  }

  // Determine what data to show based on change type
  const changeType = change.change_type
  const displayData = changeType === "delete" ? change.original_data || change : change

  // Create a summary of the change
  let summary = ""
  let actionDescription = ""
  if (changeType === "add") {
    summary = `Add new item: ${displayData.part_number || "Unknown item"}`
    actionDescription = "Add this item to inventory"
  } else if (changeType === "delete") {
    summary = `Delete item: ${displayData.part_number || "Unknown item"}`
    actionDescription = "Remove this item from inventory"
  } else if (changeType === "update") {
    summary = `Update item: ${displayData.part_number || "Unknown item"}`
    actionDescription = "Update this item in inventory"
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Inventory Change Approval</CardTitle>
          <CardDescription>Review and approve or reject this inventory change</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Action Result Alert */}
          {actionResult && (
            <Alert variant={actionResult.success ? "default" : "destructive"}>
              {actionResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{actionResult.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{actionResult.success ? actionResult.message : actionResult.error}</AlertDescription>
            </Alert>
          )}

          {/* Change Summary */}
          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium text-lg mb-2">{summary}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Requested by: {change.requested_by || change.requester || "Unknown"}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Part Number</p>
                <p>{displayData.part_number || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p>{displayData.description || displayData.part_description || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Quantity</p>
                <p>{displayData.current_stock || displayData.qty || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Location</p>
                <p>{displayData.location || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Supplier</p>
                <p>{displayData.supplier || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Package</p>
                <p>{displayData.package || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Action Description */}
          <Alert>
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>{actionDescription}</AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="destructive" onClick={() => handleAction("reject")} disabled={actionLoading}>
            {actionLoading && actionResult?.action === "reject" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Reject
          </Button>
          <Button variant="default" onClick={() => handleAction("approve")} disabled={actionLoading}>
            {actionLoading && actionResult?.action === "approve" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Approve
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
