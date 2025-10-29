import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export async function GET(request: Request, context: any) {
  try {
    const { jobId } = await context.params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "completed" || !job.resultUrl) {
      return NextResponse.json(
        { error: "Job is not completed or file is not available" },
        { status: 400 }
      );
    }

    // Redirect to the Vercel Blob URL for download
    return NextResponse.redirect(job.resultUrl);
    
  } catch (error) {
    console.error(`[API Error] GET /api/crawl/download:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}