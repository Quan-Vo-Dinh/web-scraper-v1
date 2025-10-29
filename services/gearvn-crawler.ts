import axios from "axios";
// Sửa lại import: dùng thư viện json2csv trực tiếp thay vì Parser
import { json2csv } from "json-2-csv";
import fs from "fs";
import path from "path";

// Giữ nguyên interface Product
interface Product {
  sku: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl: string;
}

type ProgressCallback = (progress: { crawled: number; total: number }) => void;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function gearvnCrawler(
  // target bây giờ là collectionSlug (ví dụ: "laptop")
  collectionSlug: string,
  limit: number,
  onProgress: ProgressCallback
): Promise<string> {
  const products: Product[] = [];
  let page = 1;
  const pageSize = 50; // GearVN cho lấy 50 sp/lần
  const MAX_PAGES = Math.ceil(limit / pageSize);

  console.log(`Bắt đầu cào data GearVN (danh mục: ${collectionSlug})...`);

  try {
    while (products.length < limit && page <= MAX_PAGES) {
      // Thêm điều kiện page <= MAX_PAGES
      const url = `https://gearvn.com/collections/${collectionSlug}/products.json`;
      const response = await axios.get(url, {
        params: {
          include: "metafields[product]", // Giữ nguyên include
          page,
          limit: pageSize, // Dùng pageSize đã định nghĩa
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
        },
      });

      const items = response.data?.products;

      if (!items || items.length === 0) {
        console.log(`[Trang ${page}] Hết sản phẩm. Dừng.`);
        break; // Dừng nếu không có sản phẩm
      }

      console.log(`[Trang ${page}] Đã lấy được ${items.length} sản phẩm.`);

      for (const item of items) {
        if (products.length >= limit) break;

        const firstVariant = item.variants?.[0]; // Lấy variant đầu tiên
        const priceStr = firstVariant?.price; // Giá bán (có thể là string)
        const price = priceStr ? Number.parseFloat(priceStr) : 0; // Chuyển giá sang number

        // Sửa cách lấy SKU, Description, Category, ImageUrl
        products.push({
          sku: firstVariant?.sku || `GEARVN-${item.id}`, // Ưu tiên SKU từ variant
          name: item.title || "",
          price: price,
          description: `Xem chi tiết: https://gearvn.com/products/${item.handle}`, // Dùng link sản phẩm
          category: item.product_type || collectionSlug, // Ưu tiên product_type
          imageUrl: item.image?.src || "", // Dùng item.image.src
        });
      }

      onProgress({ crawled: products.length, total: limit });

      // Dừng nếu số lượng đã đủ (tránh gọi API thừa)
      if (products.length >= limit) {
        console.log(`Đã đủ ${limit} sản phẩm. Dừng.`);
        break;
      }

      page++;
      await sleep(1500); // Giữ nguyên rate limiting
    }

    // Generate CSV (Giữ nguyên phần này, nhưng sửa tên keys cho khớp interface Product)
    const resultsDir = path.join(process.cwd(), "results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, `gearvn-${Date.now()}.csv`);

    // Dùng json2csv trực tiếp
    const csv = await json2csv(products, {
      keys: [
        { field: "sku", title: "SKU" },
        { field: "name", title: "Name" },
        { field: "price", title: "Regular price" }, // Đổi tên cột giá
        { field: "description", title: "Description" },
        { field: "category", title: "Categories" }, // Đổi tên cột category
        { field: "imageUrl", title: "Images" }, // Đổi tên cột ảnh
      ],
    });

    fs.writeFileSync(filePath, csv);
    console.log(`Đã xuất file CSV: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error("[GearVNCrawler Error]:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw new Error(
      `Failed to crawl GearVN: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
