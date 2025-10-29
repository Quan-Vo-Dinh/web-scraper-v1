import axios from "axios";
import { updateJob } from "@/lib/jobs";
import type { Product } from "./cellphones-crawler"; // Reuse Product interface

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Crawls GearVN for products based on a collection slug.
 * Reports progress to Vercel KV and returns the collected products.
 * @param jobId - The ID of the job to update progress.
 * @param collectionSlug - The collection slug to crawl (e.g., "laptop-gaming").
 * @param limit - The maximum number of products to crawl.
 * @returns A promise that resolves to an array of Product objects.
 */
export async function gearvnCrawler(
  jobId: string,
  collectionSlug: string,
  limit: number
): Promise<Product[]> {
  const products: Product[] = [];
  let page = 1;
  const pageSize = 50;
  const MAX_PAGES = Math.ceil(limit / pageSize);

  console.log(`[Job ${jobId}] Starting GearVN crawl for collection: ${collectionSlug}`);

  try {
    while (products.length < limit && page <= MAX_PAGES) {
      const url = `https://gearvn.com/collections/${collectionSlug}/products.json`;
      const response = await axios.get(url, {
        params: {
          include: "metafields[product]",
          page,
          limit: pageSize,
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
        },
      });

      const items = response.data?.products;

      if (!items || items.length === 0) {
        console.log(`[Job ${jobId}] [Page ${page}] No more products found. Stopping.`);
        break;
      }

      console.log(`[Job ${jobId}] [Page ${page}] Fetched ${items.length} items.`);

      for (const item of items) {
        if (products.length >= limit) break;

        const firstVariant = item.variants?.[0];
        const priceStr = firstVariant?.price;
        const price = priceStr ? Number.parseFloat(priceStr) : 0;

        products.push({
          sku: firstVariant?.sku || `GEARVN-${item.id}`,
          name: item.title || "",
          price: price,
          description: `Xem chi tiết: https://gearvn.com/products/${item.handle}`,
          category: item.product_type || collectionSlug,
          imageUrl: item.image?.src || "",
        });
      }

      // Update progress in Vercel KV
      await updateJob(jobId, {
        progress: { crawled: products.length, total: limit },
        message: `Crawled ${products.length} / ${limit} products`,
      });

      if (products.length >= limit) {
        console.log(`[Job ${jobId}] Reached limit of ${limit}. Stopping.`);
        break;
      }

      page++;
      await sleep(1500); // Rate limiting
    }

    console.log(`[Job ${jobId}] Finished crawling. Total products: ${products.length}`);
    return products;

  } catch (error) {
    console.error(`[Job ${jobId}] [GearVNCrawler Error]:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    // Update job status to error in Vercel KV
    await updateJob(jobId, {
      status: "error",
      message: `Failed to crawl GearVN: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
    // Re-throw the error to be caught by the API route
    throw error;
  }
}
