"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Info, Database, Globe } from "lucide-react"

interface EnvTestData {
  success: boolean
  message: string
  data: {
    timestamp: string
    directAccess: Record<
      string,
      {
        exists: boolean
        length: number
        preview: string
      }
    >
    environment: {
      NODE_ENV: string
      VERCEL_ENV: string
      VERCEL_URL: string
      VERCEL_REGION: string
      isV0Preview: boolean
      isVercelPreview: boolean
      isProduction: boolean
      isDevelopment: boolean
    }
    allEnvKeys: string[]
    counts: {
      total: number
      supabase: number
      slack: number
      vercel: number
      next: number
    }
    runtime: {
      platform: string
      nodeVersion: string
      architecture: string
      memoryUsage: any
      uptime: number
    }
  }
}

export default function EnvAccessTestPage() {
  const [data, setData] = useState<EnvTestData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTest = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/env-access-test", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setData(result)
      } else {
        setError(result.error || "Test failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runTest()
  }, [])

  const getStatusIcon = (exists: boolean) => {
    return exists ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Testing environment variable access...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={runTest} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Test
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Button onClick={runTest}>Run Environment Access Test</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Environment Variable Access Test</h1>
          <p className="text-muted-foreground">Comprehensive test of environment variable access in v0 preview</p>
        </div>
        <Button onClick={runTest} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Re-run Test
        </Button>
      </div>

      {/* Environment Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Environment Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="font-medium">Environment Type</div>
              <Badge variant={data.data.environment.isV0Preview ? "secondary" : "default"}>
                {data.data.environment.isV0Preview
                  ? "v0 Preview"
                  : data.data.environment.isVercelPreview
                    ? "Vercel Preview"
                    : data.data.environment.isProduction
                      ? "Production"
                      : "Development"}
              </Badge>
            </div>
            <div>
              <div className="font-medium">NODE_ENV</div>
              <Badge variant="outline">{data.data.environment.NODE_ENV}</Badge>
            </div>
            <div>
              <div className="font-medium">VERCEL_ENV</div>
              <Badge variant="outline">{data.data.environment.VERCEL_ENV || "Not set"}</Badge>
            </div>
            <div>
              <div className="font-medium">VERCEL_URL</div>
              <Badge variant="outline">{data.data.environment.VERCEL_URL || "Not set"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variable Counts */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variable Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{data.data.counts.total}</div>
              <div className="text-sm text-muted-foreground">Total Variables</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.data.counts.supabase}</div>
              <div className="text-sm text-muted-foreground">Supabase</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{data.data.counts.slack}</div>
              <div className="text-sm text-muted-foreground">Slack</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{data.data.counts.vercel}</div>
              <div className="text-sm text-muted-foreground">Vercel</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{data.data.counts.next}</div>
              <div className="text-sm text-muted-foreground">Next.js</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Variables Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Critical Environment Variables
          </CardTitle>
          <CardDescription>Testing access to your application's required environment variables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.data.directAccess).map(([key, info]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {getStatusIcon(info.exists)}
                  <div>
                    <div className="font-medium">{key}</div>
                    <div className="text-sm text-muted-foreground">{info.preview}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{info.length} chars</Badge>
                  <Badge variant={info.exists ? "default" : "destructive"}>{info.exists ? "Found" : "Missing"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="runtime">Runtime Info</TabsTrigger>
          <TabsTrigger value="all-vars">All Variables</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Environment Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.data.environment.isV0Preview ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        <strong>Environment:</strong> v0 Preview
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        {data.data.counts.total > 50
                          ? "Environment variables are accessible!"
                          : "Limited environment variable access"}
                      </div>
                      <div>
                        <strong>Critical Variables Found:</strong>{" "}
                        {Object.values(data.data.directAccess).filter((v) => v.exists).length} of{" "}
                        {Object.keys(data.data.directAccess).length}
                      </div>
                      {data.data.counts.total > 50 && (
                        <div className="text-green-700 font-medium">
                          ✅ Good news! Your v0 preview has access to {data.data.counts.total} environment variables,
                          which means your environment is properly configured.
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Running in {data.data.environment.isProduction ? "Production" : "Preview"} environment with full
                    access to environment variables.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <h4 className="font-medium mb-2">Environment Variables Status</h4>
                  <div className="space-y-1 text-sm">
                    <div>Total: {data.data.counts.total}</div>
                    <div>Supabase: {data.data.counts.supabase}</div>
                    <div>Slack: {data.data.counts.slack}</div>
                    <div>Vercel: {data.data.counts.vercel}</div>
                    <div>Next.js: {data.data.counts.next}</div>
                  </div>
                </div>
                <div className="p-4 border rounded">
                  <h4 className="font-medium mb-2">Critical Variables</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(data.data.directAccess).map(([key, info]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key.replace(/^(NEXT_PUBLIC_|SUPABASE_|SLACK_)/, "")}:</span>
                        <span className={info.exists ? "text-green-600" : "text-red-600"}>
                          {info.exists ? "✓" : "✗"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runtime">
          <Card>
            <CardHeader>
              <CardTitle>Runtime Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">System Info</h4>
                  <div className="space-y-1 text-sm">
                    <div>Platform: {data.data.runtime.platform}</div>
                    <div>Node Version: {data.data.runtime.nodeVersion}</div>
                    <div>Architecture: {data.data.runtime.architecture}</div>
                    <div>Uptime: {Math.round(data.data.runtime.uptime)}s</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Memory Usage</h4>
                  <div className="space-y-1 text-sm">
                    <div>RSS: {Math.round(data.data.runtime.memoryUsage.rss / 1024 / 1024)}MB</div>
                    <div>Heap Used: {Math.round(data.data.runtime.memoryUsage.heapUsed / 1024 / 1024)}MB</div>
                    <div>Heap Total: {Math.round(data.data.runtime.memoryUsage.heapTotal / 1024 / 1024)}MB</div>
                    <div>External: {Math.round(data.data.runtime.memoryUsage.external / 1024 / 1024)}MB</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-vars">
          <Card>
            <CardHeader>
              <CardTitle>All Environment Variables</CardTitle>
              <CardDescription>Complete list of available environment variable keys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {data.data.allEnvKeys.map((key) => (
                    <div key={key} className="p-2 bg-gray-50 rounded text-sm font-mono">
                      {key}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.data.environment.isV0Preview && data.data.counts.total < 50 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Limited Environment Access:</strong> Your v0 preview has limited access to environment
                  variables. This might be due to a configuration issue or recent changes to the v0 platform.
                </AlertDescription>
              </Alert>
            )}

            {data.data.environment.isV0Preview && data.data.counts.total >= 50 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Environment Access Restored:</strong> Your v0 preview has good access to environment
                  variables! You should be able to use all the debug tools and test your integrations.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm space-y-2">
              <div>
                <strong>Next Steps:</strong>
              </div>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>If environment variables are accessible, test your Slack and Supabase integrations</li>
                <li>
                  Use the debug tools at <code>/debug/env-vars</code> for detailed analysis
                </li>
                <li>
                  Check <code>/debug/env-status</code> for a quick status overview
                </li>
                <li>If issues persist, try refreshing the page or restarting the preview</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
