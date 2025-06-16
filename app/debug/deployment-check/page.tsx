"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function DeploymentCheckPage() {
  const [deploymentInfo, setDeploymentInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string>("")

  const checkDeployment = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/deployment-status", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      const data = await response.json()
      setDeploymentInfo(data)
      setLastChecked(new Date().toLocaleString())
    } catch (error) {
      setDeploymentInfo({ error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  useEffect(() => {
    checkDeployment()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🚀 Deployment Status Check</CardTitle>
          <div className="flex gap-2">
            <Button onClick={checkDeployment} disabled={loading}>
              {loading ? "Checking..." : "Refresh Status"}
            </Button>
            {lastChecked && <Badge variant="outline">Last checked: {lastChecked}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {deploymentInfo?.success && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>✅ Deployment Active</strong> - Your app is running and responding
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Git Information</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>
                      <strong>Commit SHA:</strong>{" "}
                      {deploymentInfo.deployment.vercelGitCommitSha?.substring(0, 8) || "Not available"}
                    </p>
                    <p>
                      <strong>Commit Message:</strong>{" "}
                      {deploymentInfo.deployment.vercelGitCommitMessage || "Not available"}
                    </p>
                    <p>
                      <strong>Author:</strong> {deploymentInfo.deployment.vercelGitCommitAuthorName || "Not available"}
                    </p>
                    <p>
                      <strong>Repository:</strong>{" "}
                      {deploymentInfo.deployment.vercelGitRepoOwner && deploymentInfo.deployment.vercelGitRepoSlug
                        ? `${deploymentInfo.deployment.vercelGitRepoOwner}/${deploymentInfo.deployment.vercelGitRepoSlug}`
                        : "Not available"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Environment</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>
                      <strong>Environment:</strong> {deploymentInfo.deployment.vercelEnv || "development"}
                    </p>
                    <p>
                      <strong>Node Version:</strong> {deploymentInfo.deployment.nodeVersion}
                    </p>
                    <p>
                      <strong>Vercel URL:</strong> {deploymentInfo.deployment.vercelUrl || "localhost"}
                    </p>
                    <p>
                      <strong>Slack Webhook:</strong>{" "}
                      {deploymentInfo.deployment.hasSlackWebhook ? (
                        <Badge variant="default">
                          ✅ Configured ({deploymentInfo.deployment.slackWebhookLength} chars)
                        </Badge>
                      ) : (
                        <Badge variant="destructive">❌ Not Set</Badge>
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Deployment Timestamp</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{deploymentInfo.deployment.timestamp}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {deploymentInfo?.error && (
            <Alert variant="destructive">
              <AlertDescription>❌ Error checking deployment: {deploymentInfo.error}</AlertDescription>
            </Alert>
          )}

          {/* Troubleshooting Guide */}
          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle className="text-sm">🔧 Deployment Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <strong>If you don't see a new deployment:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check if your changes were actually committed: `git status`</li>
                  <li>Check if commits were pushed: `git log --oneline -5`</li>
                  <li>Verify Vercel is connected to your repository</li>
                  <li>Check Vercel dashboard for deployment logs</li>
                </ul>
              </div>

              <div>
                <strong>Common Git Commands:</strong>
                <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs">
                  git add .<br />
                  git commit -m "Fix Slack webhook security"
                  <br />
                  git push origin main
                </div>
              </div>

              <div>
                <strong>Check Vercel Dashboard:</strong>
                <p>Visit vercel.com/dashboard to see deployment status and logs</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
