"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock } from "lucide-react"

interface EndpointStatus {
  name: string
  url: string
  status: "checking" | "success" | "error"
  response?: any
  error?: string
}

export default function StatusPage() {
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([
    { name: "Test API", url: "/api/test", status: "checking" },
    { name: "Slack Send", url: "/api/slack/send", status: "checking" },
    { name: "Slack Test", url: "/api/slack/test", status: "checking" },
    { name: "Low Stock Page", url: "/low-stock", status: "checking" },
  ])

  const checkEndpoint = async (endpoint: EndpointStatus) => {
    try {
      const response = await fetch(endpoint.url)
      if (response.ok) {
        const data = await response.json().catch(() => "OK")
        return { status: "success" as const, response: data }
      } else {
        return { status: "error" as const, error: `HTTP ${response.status}` }
      }
    } catch (error) {
      return { status: "error" as const, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  const checkAllEndpoints = async () => {
    setEndpoints((prev) => prev.map((ep) => ({ ...ep, status: "checking" })))

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i]
      const result = await checkEndpoint(endpoint)

      setEndpoints((prev) =>
        prev.map((ep, index) =>
          index === i
            ? {
                ...ep,
                status: result.status,
                response: result.response,
                error: result.error,
              }
            : ep,
        ),
      )

      // Add a small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  useEffect(() => {
    checkAllEndpoints()
  }, [])

  const getStatusIcon = (status: EndpointStatus["status"]) => {
    switch (status) {
      case "checking":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: EndpointStatus["status"]) => {
    switch (status) {
      case "checking":
        return <Badge variant="secondary">Checking...</Badge>
      case "success":
        return <Badge variant="default">Working</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Status</h1>
          <p className="text-muted-foreground">Check if all endpoints are working properly</p>
        </div>
        <Button onClick={checkAllEndpoints}>Refresh Status</Button>
      </div>

      <div className="grid gap-4">
        {endpoints.map((endpoint, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(endpoint.status)}
                  {endpoint.name}
                </div>
                {getStatusBadge(endpoint.status)}
              </CardTitle>
              <CardDescription>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{endpoint.url}</code>
              </CardDescription>
            </CardHeader>
            {(endpoint.response || endpoint.error) && (
              <CardContent>
                {endpoint.error && (
                  <div className="text-red-600 text-sm">
                    <strong>Error:</strong> {endpoint.error}
                  </div>
                )}
                {endpoint.response && (
                  <div className="text-green-600 text-sm">
                    <strong>Response:</strong>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {typeof endpoint.response === "string"
                        ? endpoint.response
                        : JSON.stringify(endpoint.response, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="text-sm text-blue-800">
            <strong>Quick Links:</strong>
            <ul className="mt-2 space-y-1">
              <li>
                •{" "}
                <a href="/api/test" target="_blank" className="underline" rel="noreferrer">
                  Test API endpoint
                </a>
              </li>
              <li>
                •{" "}
                <a href="/low-stock" target="_blank" className="underline" rel="noreferrer">
                  Low stock page
                </a>
              </li>
              <li>
                •{" "}
                <a href="/verify-slack" target="_blank" className="underline" rel="noreferrer">
                  Slack verification
                </a>
              </li>
              <li>
                •{" "}
                <a href="/" target="_blank" className="underline" rel="noreferrer">
                  Main dashboard
                </a>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
