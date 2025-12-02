import { NextRequest, NextResponse } from "next/server";
import { getJob, deleteJob } from "@/lib/jobs/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: "Job ID is required" },
      { status: 400 }
    );
  }

  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: "ジョブが見つかりません。再度実行してください。" },
      { status: 404 }
    );
  }

  // If job is completed or error, return result and clean up
  if (job.status === "completed") {
    const result = job.result;
    deleteJob(jobId); // Clean up completed job
    return NextResponse.json({
      success: true,
      status: "completed",
      data: result,
    });
  }

  if (job.status === "error") {
    const error = job.error;
    const logs = job.logs;
    deleteJob(jobId); // Clean up failed job
    return NextResponse.json({
      success: false,
      status: "error",
      error,
      logs,
    });
  }

  // Job is still processing
  return NextResponse.json({
    success: true,
    status: job.status,
    progress: job.progress,
    logs: job.logs,
  });
}
