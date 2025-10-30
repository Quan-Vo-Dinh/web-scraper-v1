import axios from "axios";
import { updateJob } from "@/lib/jobs";

export interface Product {
  // === Dữ liệu động (Cào về) ===
  sku: string;
  name: string;
  regular_price: number;
  description: string;
  category: string;
  imageUrl: string;
  shortDescription: string; // Thêm mô tả ngắn

  // === Dữ liệu tĩnh (Hardcode) ===
  type: string; // vd: 'simple'
  published: number; // 1 = Published
  visibility: string; // 'visible'
  inStock: number; // 1 = In stock
  reviewsAllowed: number; // 1 = Allow reviews
  taxStatus: string; // 'taxable'
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to create the GraphQL payload for a specific page
function getQueryPayloadForPage(
  pageNumber: number,
  categoryId: string | number,
  pageSize: number
) {
  const queryString = `
    query GetProductsByCateId($categoryId: String!, $provinceId: Int!, $page: Int!, $size: Int!) {
        products(
                filter: {
                    static: {
                        categories: [$categoryId],
                        province_id: $provinceId,
                        stock: { from: 0 },
                        stock_available_id: [46, 56, 152, 4920],
                        filter_price: { from: 0, to: 195000000 }
                    },
                    dynamic: {}
                },
                page: $page,
                size: $size,
                sort: [{view: desc}]
            )
        {
            general { product_id, name, sku, url_key, categories { name } },
            filterable { price, special_price, thumbnail },
        }
    }
  `;

  return {
    variables: {
      categoryId: categoryId.toString(),
      provinceId: 30, // HCM
      page: pageNumber,
      size: pageSize,
    },
    query: queryString,
  };
}

/**
 * Crawls CellphoneS for products based on a category ID.
 * Reports progress to Vercel KV and returns the collected products.
 * @param jobId - The ID of the job to update progress.
 * @param categoryId - The category ID to crawl (e.g., "1217").
 * @param limit - The maximum number of products to crawl.
 * @returns A promise that resolves to an array of Product objects.
 */
export async function cellphonesCrawler(
  jobId: string,
  categoryId: string | number,
  limit: number
): Promise<Product[]> {
  const products: Product[] = []; // Dùng interface Product đã cập nhật
  let page = 1;
  const pageSize = 30;

  console.log(
    `[Job ${jobId}] Starting CellphoneS crawl for category: ${categoryId}`
  );

  try {
    while (products.length < limit) {
      const payload = getQueryPayloadForPage(page, categoryId, pageSize);

      const response = await axios.post(
        "https://api.cellphones.com.vn/v2/graphql/query",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
          },
        }
      );

      const items = response.data?.data?.products;

      if (!items || items.length === 0) {
        console.log(
          `[Job ${jobId}] [Page ${page}] No more products found. Stopping.`
        );
        break;
      }

      console.log(
        `[Job ${jobId}] [Page ${page}] Fetched ${items.length} items.`
      );

      for (const item of items) {
        if (products.length >= limit) break;

        const productUrl = `https://cellphones.com.vn/${item.general.url_key}.html`;
        const imageUrl = item.filterable.thumbnail
          ? `https://cdn2.cellphones.com.vn/x358,webp,q100/${
              item.filterable.thumbnail.replace(/^\/+/, "") // Xóa dấu / ở đầu nếu có
            }`
          : "";
        const categoryName =
          item.general.categories?.[0]?.name || categoryId.toString();

        products.push({
          // === Dữ liệu động ===
          sku: item.general.sku || `CPS-${item.general.product_id}`,
          name: item.general.name || "",
          regular_price:
            item.filterable.special_price || item.filterable.price || 0,
          description: `Xem chi tiết: ${productUrl}`,
          category: categoryName,
          imageUrl: imageUrl,
          shortDescription: `Hàng chính hãng. Danh mục: ${categoryName}`,

          // === Dữ liệu tĩnh (Hardcode) ===
          type: "simple",
          published: 1,
          visibility: "visible",
          inStock: 1,
          reviewsAllowed: 1,
          taxStatus: "taxable",
        });
      }

      // Update progress in Vercel KV
      await updateJob(jobId, {
        progress: { crawled: products.length, total: limit },
        message: `Crawled ${products.length} / ${limit} products`,
      });

      page++;
      await sleep(1500); // Rate limiting
    }

    console.log(
      `[Job ${jobId}] Finished crawling. Total products: ${products.length}`
    );
    return products;
  } catch (error) {
    console.error(`[Job ${jobId}] [CellphonesCrawler Error]:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response data:", error.response.data);
    }
    // Update job status to error in Vercel KV
    await updateJob(jobId, {
      status: "error",
      message: `Failed to crawl CellphoneS: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
    // Re-throw the error to be caught by the API route
    throw error;
  }
}
