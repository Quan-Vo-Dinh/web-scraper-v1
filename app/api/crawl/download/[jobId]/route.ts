import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Forward request to backend server
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/api/crawl/download/${jobId}`);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    // Stream the file
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="crawl-${jobId}.csv"`,
      },
    });
  } catch (error) {
    console.error("[API Error] GET /api/crawl/download:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
