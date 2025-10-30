import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { put } from "@vercel/blob";
import { json2csv } from "json-2-csv";

import { createJob, updateJob } from "@/lib/jobs";
import { cellphonesCrawler, type Product } from "@/services/cellphones-crawler";
import { gearvnCrawler } from "@/services/gearvn-crawler";

// Helper function to run the crawl process in the background
async function runCrawl(
  jobId: string,
  site: string,
  target: string,
  limit: number
) {
  try {
    await updateJob(jobId, {
      status: "crawling",
      message: "Initializing crawler...",
    });

    let products: Product[] = [];
    if (site === "cellphones") {
      products = await cellphonesCrawler(jobId, target, limit);
    } else if (site === "gearvn") {
      products = await gearvnCrawler(jobId, target, limit);
    } else {
      throw new Error("Unknown site");
    }

    await updateJob(jobId, {
      message: `Crawl finished. Found ${products.length} products. Converting to CSV...`,
    });

    if (products.length === 0) {
      await updateJob(jobId, {
        status: "completed",
        message: "Crawl completed, but no products were found.",
        resultUrl: "",
      });
      return;
    }

    // Convert to CSV
    const csv = await json2csv(products, {
      keys: [
        // === CÁC CỘT CÀI ĐẶT (HARDCODE) ===
        { field: "type", title: "Type" },
        { field: "published", title: "Published" },
        { field: "visibility", title: "Visibility in catalog" },
        { field: "shortDescription", title: "Short description" },
        { field: "inStock", title: "In stock?" },
        { field: "reviewsAllowed", title: "Allow customer reviews?" },
        { field: "taxStatus", title: "Tax status" },

        // === CÁC CỘT DATA (CÀO VỀ) ===
        { field: "sku", title: "SKU" },
        { field: "name", title: "Name" },
        { field: "regular_price", title: "Regular price" },
        { field: "description", title: "Description" },
        { field: "category", title: "Categories" },
        { field: "imageUrl", title: "Images" },
      ],
    });

    // Upload to Vercel Blob
    const blob = await put(`${site}-${jobId}.csv`, csv, {
      access: "public",
      contentType: "text/csv; charset=utf-8",
    });

    // Final update to job status
    await updateJob(jobId, {
      status: "completed",
      message: "Crawl completed successfully. File is ready for download.",
      resultUrl: blob.url,
    });
  } catch (error) {
    console.error(`[Job ${jobId}] Failed to run crawl:`, error);
    await updateJob(jobId, {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "An unknown error occurred during the crawl.",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { site, target, limit } = await request.json();

    if (!site || !target || !limit) {
      return NextResponse.json(
        { error: "Missing required fields: site, target, limit" },
        { status: 400 }
      );
    }

    const jobId = uuidv4();
    await createJob(jobId, site, target, limit);

    // Fire and forget the crawl process to run in the background
    runCrawl(jobId, site, target, limit);

    // Respond immediately with the jobId
    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("[API Error] POST /api/crawl:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
