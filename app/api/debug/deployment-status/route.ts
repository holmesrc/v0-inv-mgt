import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
      vercelGitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE,
      vercelGitCommitAuthorName: process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME,
      vercelGitRepoSlug: process.env.VERCEL_GIT_REPO_SLUG,
      vercelGitRepoOwner: process.env.VERCEL_GIT_REPO_OWNER,
      hasSlackWebhook: !!process.env.SLACK_WEBHOOK_URL,
      slackWebhookLength: process.env.SLACK_WEBHOOK_URL?.length || 0,
    }

    return NextResponse.json({
      success: true,
      deployment: deploymentInfo,
      message: "Deployment info retrieved successfully",
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
