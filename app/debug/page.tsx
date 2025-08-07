"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Database, Slack, Settings, Package, AlertTriangle, Search } from "lucide-react"
import Link from "next/link"

export default function DebugPage() {
  const debugEndpoints = [
    {
      name: "Environment Status",
      path: "/debug/env-status",
      description: "Check environment variables and configuration",
      icon: <Settings className="w-4 h-4" />,
      category: "System"
    },
    {
      name: "Slack Test",
      path: "/debug/slack-test", 
      description: "Test Slack webhook connectivity",
      icon: <Slack className="w-4 h-4" />,
      category: "Integrations"
    },
    {
      name: "Slack URL Test",
      path: "/debug/slack-url-test",
      description: "Advanced Slack webhook testing",
      icon: <Slack className="w-4 h-4" />,
      category: "Integrations"
    },
    {
      name: "Sync Test",
      path: "/debug/sync-test",
      description: "Test database synchronization",
      icon: <Database className="w-4 h-4" />,
      category: "Database"
    },
    {
      name: "Detailed Sync",
      path: "/debug/detailed-sync",
      description: "Detailed database sync diagnostics",
      icon: <Database className="w-4 h-4" />,
      category: "Database"
    },
    {
      name: "Environment Variables",
      path: "/debug/env-vars",
      description: "View environment variable status",
      icon: <Settings className="w-4 h-4" />,
      category: "System"
    },
    {
      name: "Environment Access Test",
      path: "/debug/env-access-test",
      description: "Test environment variable access",
      icon: <Settings className="w-4 h-4" />,
      category: "System"
    },
    {
      name: "Environment History",
      path: "/debug/env-history",
      description: "View environment configuration history",
      icon: <Settings className="w-4 h-4" />,
      category: "System"
    },
    {
      name: "Add Item Test",
      path: "/debug/add-item-test",
      description: "Test inventory item addition",
      icon: <Package className="w-4 h-4" />,
      category: "Inventory"
    },
    {
      name: "Approved Item Check",
      path: "/debug/approved-item-check",
      description: "Check approved item status",
      icon: <Package className="w-4 h-4" />,
      category: "Inventory"
    },
    {
      name: "Pending Locations",
      path: "/debug/pending-locations",
      description: "View pending location changes",
      icon: <Package className="w-4 h-4" />,
      category: "Inventory"
    },
    {
      name: "Batch Approval Test",
      path: "/debug/batch-approval-test",
      description: "Test batch approval functionality",
      icon: <Package className="w-4 h-4" />,
      category: "Approvals"
    },
    {
      name: "Fix Batch Statuses",
      path: "/debug/fix-batch-statuses",
      description: "Fix batch approval statuses",
      icon: <AlertTriangle className="w-4 h-4" />,
      category: "Approvals"
    },
    {
      name: "Batch References",
      path: "/debug/batch-references",
      description: "View batch reference data",
      icon: <Package className="w-4 h-4" />,
      category: "Approvals"
    },
    {
      name: "Duplicates Check",
      path: "/debug/duplicates",
      description: "Check for duplicate entries",
      icon: <AlertTriangle className="w-4 h-4" />,
      category: "Data Quality"
    },
    {
      name: "RLS Test",
      path: "/debug/rls-test",
      description: "Test Row Level Security",
      icon: <Database className="w-4 h-4" />,
      category: "Database"
    },
    {
      name: "Settings Test",
      path: "/debug/settings-test",
      description: "Test settings functionality",
      icon: <Settings className="w-4 h-4" />,
      category: "System"
    },
    {
      name: "Comprehensive Test",
      path: "/debug/comprehensive-test",
      description: "Run comprehensive system tests",
      icon: <AlertTriangle className="w-4 h-4" />,
      category: "Testing"
    },
    {
      name: "Restore Environment Access",
      path: "/debug/restore-env-access",
      description: "Restore environment variable access",
      icon: <Settings className="w-4 h-4" />,
      category: "System"
    },
    {
      name: "Part Lookup Test",
      path: "/debug/part-lookup-test",
      description: "Test part scraping functionality",
      icon: <Search className="w-4 h-4" />,
      category: "Testing"
    }
  ]

  const categories = Array.from(new Set(debugEndpoints.map(endpoint => endpoint.category)))

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Debug Endpoints</h1>
          <p className="text-muted-foreground">System diagnostics and testing tools</p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {categories.map(category => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category === "System" && <Settings className="w-5 h-5" />}
                {category === "Database" && <Database className="w-5 h-5" />}
                {category === "Integrations" && <Slack className="w-5 h-5" />}
                {category === "Inventory" && <Package className="w-5 h-5" />}
                {category === "Approvals" && <Package className="w-5 h-5" />}
                {category === "Data Quality" && <AlertTriangle className="w-5 h-5" />}
                {category === "Testing" && <AlertTriangle className="w-5 h-5" />}
                {category}
              </CardTitle>
              <CardDescription>
                {category === "System" && "Environment and system configuration tools"}
                {category === "Database" && "Database connectivity and sync testing"}
                {category === "Integrations" && "External service integration testing"}
                {category === "Inventory" && "Inventory management testing tools"}
                {category === "Approvals" && "Approval workflow testing and management"}
                {category === "Data Quality" && "Data validation and quality checks"}
                {category === "Testing" && "Comprehensive system testing tools"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {debugEndpoints
                  .filter(endpoint => endpoint.category === category)
                  .map(endpoint => (
                    <Link key={endpoint.path} href={endpoint.path}>
                      <Button variant="outline" className="w-full justify-start h-auto p-4">
                        <div className="flex items-start gap-3 text-left">
                          {endpoint.icon}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{endpoint.name}</div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {endpoint.description}
                            </div>
                          </div>
                          <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        </div>
                      </Button>
                    </Link>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 mb-1">Debug Tools Notice</h3>
              <p className="text-sm text-yellow-700">
                These are diagnostic and testing tools for system administrators. Use with caution in production environments.
                Some endpoints may modify data or system state.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
