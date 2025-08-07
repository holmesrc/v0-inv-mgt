"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, RefreshCw, Eye, Send } from "lucide-react"

interface SlackConfig {
  environment: {
    NODE_ENV: string
    VERCEL_ENV: string
  }
  slack: {
    webhookConfigured: boolean
    webhookLength: number
    webhookPrefix: string
    webhookValid: boolean
  }
  test: {
    canMakeRequest: boolean
    timestamp: string
  }
}

interface UrlDebugInfo {
  timestamp: string
  environment: {
    NODE_ENV: string
    VERCEL_ENV: string
    VERCEL_URL: string
  }
  webhookUrls: {
    raw: {
      exists: boolean
      length: number
      prefix: string
      suffix: string
      isSlackUrl: boolean
    }
    actual: {
      exists: boolean
      length: number
      prefix: string
      suffix: string
      isSlackUrl: boolean
    }
    match: boolean
  }
  contexts: {
    directAccess: {
      exists: boolean
      length: number
      prefix: string
    }
    viaDestructuring: {
      exists: boolean
      length: number
      prefix: string
    }
    viaSpread: {
      exists: boolean
      length: number
      prefix: string
    }
    allMatch: boolean
  }
  allEnvironmentVars: {
    count: number
    hasSlackWebhook: boolean
    slackRelated: Array<{
      key: string
      exists: boolean
      length: number
    }>
  }
}

interface RequestTestResult {
  success: boolean
  requestDetails: {
    urlUsed: string
    urlLength: number
    urlPrefix: string
    urlSuffix: string
    isValidFormat: boolean
    timestamp: string
  }
  response?: {
    status: number
    statusText: string
    ok: boolean
    body: string
    headers: Record<string, string>
  }
  error?: string
  details?: string
  message: string
}

export default function SlackTestPage() {
  const [config, setConfig] = useState<SlackConfig | null>(null)
  const [urlDebug, setUrlDebug] = useState<UrlDebugInfo | null>(null)
  const [requestTest, setRequestTest] = useState<RequestTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [urlLoading, setUrlLoading] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)
  const [references, setReferences] = useState<any>(null)
  const [referencesLoading, setReferencesLoading] = useState(false)

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/debug/slack-config")
      const data = await response.json()

      if (response.ok) {
        setConfig(data)
      } else {
        console.error("Failed to load config:", data)
      }
    } catch (error) {
      console.error("Error loading config:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadUrlDebug = async () => {
    try {
      setUrlLoading(true)
      const response = await fetch("/api/debug/slack-urls")
      const data = await response.json()

      if (response.ok) {
        setUrlDebug(data)
      } else {
        console.error("Failed to load URL debug:", data)
      }
    } catch (error) {
      console.error("Error loading URL debug:", error)
    } finally {
      setUrlLoading(false)
    }
  }

  const testRequest = async () => {
    try {
      setRequestLoading(true)
      setRequestTest(null)

      const response = await fetch("/api/debug/slack-request-test", {
        method: "POST",
      })

      const data = await response.json()
      setRequestTest(data)
    } catch (error) {
      setRequestTest({
        success: false,
        requestDetails: {
          urlUsed: "Unknown",
          urlLength: 0,
          urlPrefix: "Error",
          urlSuffix: "Error",
          isValidFormat: false,
          timestamp: new Date().toISOString(),
        },
        error: "Network error",
        details: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to test request",
      })
    } finally {
      setRequestLoading(false)
    }
  }

  const loadReferences = async () => {
    try {
      setReferencesLoading(true)
      const response = await fetch("/api/debug/find-slack-references")
      const data = await response.json()

      if (response.ok) {
        setReferences(data)
      } else {
        console.error("Failed to load references:", data)
      }
    } catch (error) {
      console.error("Error loading references:", error)
    } finally {
      setReferencesLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Slack URL Debug</h1>
          <p className="text-muted-foreground">Debug what URLs your code is actually seeing and using</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadConfig} disabled={loading} variant="outline">
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Basic Config
          </Button>
          <Button onClick={loadUrlDebug} disabled={urlLoading}>
            {urlLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
            Check URLs
          </Button>
          <Button onClick={testRequest} disabled={requestLoading} variant="default">
            {requestLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Test Request
          </Button>
          <Button onClick={loadReferences} disabled={referencesLoading} variant="secondary">
            {referencesLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
            Find References
          </Button>
        </div>
      </div>

      {/* URL Debug Information */}
      {urlDebug && (
        <Card>
          <CardHeader>
            <CardTitle>URL Debug Information</CardTitle>
            <CardDescription>What URLs the code is actually seeing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Environment Info */}
            <div>
              <h4 className="font-medium mb-2">Environment</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  NODE_ENV: <Badge variant="outline">{urlDebug.environment.NODE_ENV}</Badge>
                </div>
                <div>
                  VERCEL_ENV: <Badge variant="outline">{urlDebug.environment.VERCEL_ENV}</Badge>
                </div>
                <div>
                  VERCEL_URL: <Badge variant="outline">{urlDebug.environment.VERCEL_URL || "Not set"}</Badge>
                </div>
              </div>
            </div>

            {/* Webhook URLs Comparison */}
            <div>
              <h4 className="font-medium mb-2">Webhook URL Comparison</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <h5 className="font-medium text-sm mb-2">Raw Environment Variable</h5>
                  <div className="space-y-1 text-xs">
                    <div>Exists: {urlDebug.webhookUrls.raw.exists ? "✅" : "❌"}</div>
                    <div>Length: {urlDebug.webhookUrls.raw.length} chars</div>
                    <div>Valid Format: {urlDebug.webhookUrls.raw.isSlackUrl ? "✅" : "❌"}</div>
                    <div className="font-mono bg-gray-100 p-1 rounded text-xs">{urlDebug.webhookUrls.raw.prefix}</div>
                    <div className="font-mono bg-gray-100 p-1 rounded text-xs">{urlDebug.webhookUrls.raw.suffix}</div>
                  </div>
                </div>
                <div className="p-3 border rounded">
                  <h5 className="font-medium text-sm mb-2">Actual Code Access</h5>
                  <div className="space-y-1 text-xs">
                    <div>Exists: {urlDebug.webhookUrls.actual.exists ? "✅" : "❌"}</div>
                    <div>Length: {urlDebug.webhookUrls.actual.length} chars</div>
                    <div>Valid Format: {urlDebug.webhookUrls.actual.isSlackUrl ? "✅" : "❌"}</div>
                    <div className="font-mono bg-gray-100 p-1 rounded text-xs">
                      {urlDebug.webhookUrls.actual.prefix}
                    </div>
                    <div className="font-mono bg-gray-100 p-1 rounded text-xs">
                      {urlDebug.webhookUrls.actual.suffix}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant={urlDebug.webhookUrls.match ? "default" : "destructive"}>
                  {urlDebug.webhookUrls.match ? "✅ URLs Match" : "❌ URLs Don't Match"}
                </Badge>
              </div>
            </div>

            {/* Access Contexts */}
            <div>
              <h4 className="font-medium mb-2">Access Method Comparison</h4>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-2 border rounded">
                  <div className="font-medium">Direct Access</div>
                  <div>Exists: {urlDebug.contexts.directAccess.exists ? "✅" : "❌"}</div>
                  <div>Length: {urlDebug.contexts.directAccess.length}</div>
                  <div className="font-mono bg-gray-100 p-1 rounded mt-1">{urlDebug.contexts.directAccess.prefix}</div>
                </div>
                <div className="p-2 border rounded">
                  <div className="font-medium">Via Destructuring</div>
                  <div>Exists: {urlDebug.contexts.viaDestructuring.exists ? "✅" : "❌"}</div>
                  <div>Length: {urlDebug.contexts.viaDestructuring.length}</div>
                  <div className="font-mono bg-gray-100 p-1 rounded mt-1">
                    {urlDebug.contexts.viaDestructuring.prefix}
                  </div>
                </div>
                <div className="p-2 border rounded">
                  <div className="font-medium">Via Spread</div>
                  <div>Exists: {urlDebug.contexts.viaSpread.exists ? "✅" : "❌"}</div>
                  <div>Length: {urlDebug.contexts.viaSpread.length}</div>
                  <div className="font-mono bg-gray-100 p-1 rounded mt-1">{urlDebug.contexts.viaSpread.prefix}</div>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant={urlDebug.contexts.allMatch ? "default" : "destructive"}>
                  {urlDebug.contexts.allMatch ? "✅ All Access Methods Match" : "❌ Access Methods Differ"}
                </Badge>
              </div>
            </div>

            {/* Environment Variables Summary */}
            <div>
              <h4 className="font-medium mb-2">Environment Variables</h4>
              <div className="text-sm space-y-1">
                <div>
                  Total env vars: <Badge variant="outline">{urlDebug.allEnvironmentVars.count}</Badge>
                </div>
                <div>Has SLACK_WEBHOOK_URL: {urlDebug.allEnvironmentVars.hasSlackWebhook ? "✅" : "❌"}</div>
                {urlDebug.allEnvironmentVars.slackRelated.length > 0 && (
                  <div>
                    <div className="font-medium mt-2">Slack-related variables:</div>
                    {urlDebug.allEnvironmentVars.slackRelated.map((env) => (
                      <div key={env.key} className="ml-2 text-xs">
                        {env.key}: {env.exists ? `✅ (${env.length} chars)` : "❌"}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Test Results */}
      {requestTest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {requestTest.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              Request Test Results
            </CardTitle>
            <CardDescription>What happened when we actually tried to send a message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Request Details */}
            <div>
              <h4 className="font-medium mb-2">Request Details</h4>
              <div className="p-3 bg-gray-50 rounded space-y-2 text-sm">
                <div>
                  URL Used: <code className="bg-white px-1 rounded">{requestTest.requestDetails.urlPrefix}</code>
                </div>
                <div>URL Length: {requestTest.requestDetails.urlLength} characters</div>
                <div>Valid Format: {requestTest.requestDetails.isValidFormat ? "✅" : "❌"}</div>
                <div>Timestamp: {requestTest.requestDetails.timestamp}</div>
                <div>
                  URL Suffix: <code className="bg-white px-1 rounded">{requestTest.requestDetails.urlSuffix}</code>
                </div>
              </div>
            </div>

            {/* Response Details */}
            {requestTest.response && (
              <div>
                <h4 className="font-medium mb-2">Response Details</h4>
                <div className="p-3 bg-gray-50 rounded space-y-2 text-sm">
                  <div>
                    Status:{" "}
                    <Badge variant={requestTest.response.ok ? "default" : "destructive"}>
                      {requestTest.response.status} {requestTest.response.statusText}
                    </Badge>
                  </div>
                  <div>Success: {requestTest.response.ok ? "✅" : "❌"}</div>
                  <div>
                    Response Body: <code className="bg-white px-1 rounded">{requestTest.response.body}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Error Details */}
            {requestTest.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {requestTest.error}
                  {requestTest.details && (
                    <div className="mt-1">
                      <strong>Details:</strong> {requestTest.details}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">{requestTest.message}</div>
          </CardContent>
        </Card>
      )}

      {/* Basic Configuration (if loaded) */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Configuration</CardTitle>
            <CardDescription>Original configuration check</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div>Webhook Configured: {config.slack.webhookConfigured ? "✅" : "❌"}</div>
                <div>Valid Format: {config.slack.webhookValid ? "✅" : "❌"}</div>
                <div>Length: {config.slack.webhookLength} chars</div>
              </div>
              <div>
                <div>NODE_ENV: {config.environment.NODE_ENV}</div>
                <div>VERCEL_ENV: {config.environment.VERCEL_ENV}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* References Information */}
      {references && (
        <Card>
          <CardHeader>
            <CardTitle>Code References</CardTitle>
            <CardDescription>Where SLACK_WEBHOOK_URL should be used in your code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Current Environment Variable</h4>
              <div className="p-3 bg-gray-50 rounded space-y-1 text-sm">
                <div>Exists: {references.currentEnvVar.exists ? "✅" : "❌"}</div>
                <div>Length: {references.currentEnvVar.length} characters</div>
                <div className="font-mono bg-white p-2 rounded text-xs break-all">
                  <strong>Prefix:</strong> {references.currentEnvVar.prefix}
                </div>
                <div className="font-mono bg-white p-2 rounded text-xs break-all">
                  <strong>Suffix:</strong> {references.currentEnvVar.suffix}
                </div>
                <div className="font-mono bg-white p-2 rounded text-xs break-all">
                  <strong>Full URL:</strong> {references.currentEnvVar.fullUrl}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">API Routes Using SLACK_WEBHOOK_URL</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {references.codeReferences.apiRoutes.map((route: string) => (
                  <div key={route} className="p-2 bg-gray-100 rounded font-mono">
                    {route}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Library Files</h4>
              <div className="text-xs">
                {references.codeReferences.libraries.map((lib: string) => (
                  <div key={lib} className="p-2 bg-gray-100 rounded font-mono mb-1">
                    {lib}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
