"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Server, Database, MessageSquare, Clock, Settings, AlertTriangle, FileText } from "lucide-react"
import Link from "next/link"

interface EndpointGroup {
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  endpoints: {
    path: string
    method: string
    description: string
    purpose: string
  }[]
}

export default function EndpointsPage() {
  const endpointGroups: EndpointGroup[] = [
    {
      title: "Inventory Management",
      description: "Core inventory data and operations",
      icon: Database,
      color: "bg-blue-500",
      endpoints: [
        {
          path: "/api/inventory",
          method: "GET",
          description: "Get all inventory items",
          purpose: "Load inventory data from database"
        },
        {
          path: "/api/inventory/load-from-db",
          method: "GET", 
          description: "Load inventory from database",
          purpose: "Fetch current inventory state"
        },
        {
          path: "/api/excel",
          method: "PUT",
          description: "Process Excel inventory file",
          purpose: "Upload and process inventory spreadsheet"
        }
      ]
    },
    {
      title: "Reorder Management",
      description: "New simplified reorder system",
      icon: Server,
      color: "bg-green-500",
      endpoints: [
        {
          path: "/api/reorder-requests",
          method: "GET",
          description: "Get all reorder requests",
          purpose: "View all submitted reorder requests"
        },
        {
          path: "/api/reorder-requests",
          method: "POST",
          description: "Create new reorder request",
          purpose: "Submit new reorder request"
        },
        {
          path: "/api/reorder-requests/update-status",
          method: "POST",
          description: "Update request status",
          purpose: "Change status and notify requester"
        }
      ]
    },
    {
      title: "Slack Integration",
      description: "Slack notifications and messaging",
      icon: MessageSquare,
      color: "bg-purple-500",
      endpoints: [
        {
          path: "/api/slack/submit-reorder",
          method: "POST",
          description: "Submit reorder to Slack",
          purpose: "Send reorder request to Slack channel"
        },
        {
          path: "/api/slack/send-change-request",
          method: "POST",
          description: "Send change request message",
          purpose: "Notify requester of needed changes"
        },
        {
          path: "/api/slack/send-denial",
          method: "POST",
          description: "Send denial message",
          purpose: "Notify requester of request denial"
        }
      ]
    },
    {
      title: "Alert System",
      description: "Automated DST-aware scheduling",
      icon: Clock,
      color: "bg-orange-500",
      endpoints: [
        {
          path: "/api/alerts/cron",
          method: "GET",
          description: "Monday inventory alerts",
          purpose: "Send weekly low stock alerts"
        },
        {
          path: "/api/alerts/dst-monitor",
          method: "GET",
          description: "DST monitoring",
          purpose: "Check for DST transitions daily"
        },
        {
          path: "/api/alerts/test-timezone",
          method: "GET",
          description: "Test timezone functions",
          purpose: "Verify DST calculations"
        },
        {
          path: "/api/alerts/timezone-info",
          method: "GET",
          description: "Get timezone information",
          purpose: "Current timezone and DST status"
        }
      ]
    },
    {
      title: "Settings & Configuration",
      description: "System settings and preferences",
      icon: Settings,
      color: "bg-gray-500",
      endpoints: [
        {
          path: "/api/settings",
          method: "GET",
          description: "Get alert settings",
          purpose: "Retrieve current alert configuration"
        },
        {
          path: "/api/settings",
          method: "POST",
          description: "Update alert settings",
          purpose: "Modify alert preferences"
        }
      ]
    },
    {
      title: "Testing & Debug",
      description: "Development and testing endpoints",
      icon: AlertTriangle,
      color: "bg-yellow-500",
      endpoints: [
        {
          path: "/api/alerts/test-cron",
          method: "GET",
          description: "Test cron functionality",
          purpose: "Verify cron job configuration"
        },
        {
          path: "/api/alerts/test-simple",
          method: "GET",
          description: "Simple cron test",
          purpose: "Basic cron test without auth"
        },
        {
          path: "/api/debug/env-status",
          method: "GET",
          description: "Environment status",
          purpose: "Check environment variables"
        }
      ]
    }
  ]

  const pages = [
    {
      title: "Dashboard",
      path: "/",
      description: "Main inventory dashboard",
      icon: Database
    },
    {
      title: "Low Stock Items",
      path: "/low-stock",
      description: "Items below reorder point",
      icon: AlertTriangle
    },
    {
      title: "Reorder Status",
      path: "/reorder-status",
      description: "Manage reorder request status",
      icon: Server
    },
    {
      title: "Pending Changes",
      path: "/pending-changes",
      description: "Review inventory changes",
      icon: FileText
    },
    {
      title: "Approvals",
      path: "/approvals",
      description: "Approve or deny inventory changes",
      icon: FileText
    },
    {
      title: "Test Cron Browser",
      path: "/test-cron-browser",
      description: "Browser-based cron testing",
      icon: Clock
    }
  ]

  const getMethodBadge = (method: string) => {
    const colors = {
      GET: "bg-green-100 text-green-800",
      POST: "bg-blue-100 text-blue-800",
      PUT: "bg-yellow-100 text-yellow-800",
      DELETE: "bg-red-100 text-red-800"
    }
    return colors[method as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Endpoints</h1>
          <p className="text-muted-foreground">Complete directory of all API endpoints and pages</p>
        </div>
        <Link href="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>

      {/* Pages Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Application Pages
          </CardTitle>
          <CardDescription>User interface pages and dashboards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => {
              const Icon = page.icon
              return (
                <Link key={page.path} href={page.path}>
                  <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{page.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{page.description}</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{page.path}</code>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      {endpointGroups.map((group) => {
        const Icon = group.icon
        return (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${group.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                {group.title}
              </CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.endpoints.map((endpoint) => (
                  <div key={`${endpoint.method}-${endpoint.path}`} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge className={getMethodBadge(endpoint.method)}>
                          {endpoint.method}
                        </Badge>
                        <code className="font-mono text-sm">{endpoint.path}</code>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const baseUrl = window.location.origin
                          const fullUrl = `${baseUrl}${endpoint.path}`
                          if (endpoint.method === 'GET') {
                            window.open(fullUrl, '_blank')
                          } else {
                            navigator.clipboard.writeText(fullUrl)
                            alert('URL copied to clipboard!')
                          }
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {endpoint.method === 'GET' ? 'Open' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{endpoint.description}</p>
                    <p className="text-xs text-gray-500">{endpoint.purpose}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common development and testing tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => window.open('/api/alerts/test-timezone', '_blank')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Clock className="h-6 w-6" />
              <span>Test Timezone</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('/api/inventory', '_blank')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Database className="h-6 w-6" />
              <span>View Inventory</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('/api/reorder-requests', '_blank')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Server className="h-6 w-6" />
              <span>View Requests</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('/api/settings', '_blank')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Settings className="h-6 w-6" />
              <span>View Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
