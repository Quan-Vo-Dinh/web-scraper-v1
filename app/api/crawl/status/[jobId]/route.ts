import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export async function GET(request: Request, context: any) {
  try {
    const { jobId } = await context.params; // Correctly access jobId from destructured params
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error(`[API Error] GET /api/crawl/status:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}