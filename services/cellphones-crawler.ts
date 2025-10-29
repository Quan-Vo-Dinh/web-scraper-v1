import axios from "axios";
// Sửa lại import: dùng thư viện json2csv trực tiếp thay vì Parser
import { json2csv } from "json-2-csv";
import fs from "fs";
import path from "path";

// Giữ nguyên interface Product
interface Product {
  sku: string;
  name: string;
  price: number; // Đổi lại thành price cho thống nhất
  description: string;
  category: string; // Sửa lại thành category
  imageUrl: string; // Sửa lại thành imageUrl
}

type ProgressCallback = (progress: { crawled: number; total: number }) => void;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Hàm "chế" payload chuẩn của CellphoneS
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
                        stock_available_id: [46, 56, 152, 4920], # Giữ nguyên các ID kho này
                        filter_price: { from: 0, to: 195000000 } # Giữ nguyên khoảng giá
                    },
                    dynamic: {}
                },
                page: $page,
                size: $size,
                sort: [{view: desc}] # Sắp xếp theo lượt xem giảm dần
            )
        {
            general {         # Lấy thông tin chung
                product_id
                name
                sku
                url_key
                categories {    # Lấy danh mục đầu tiên
                  name
                }
            },
            filterable {      # Lấy thông tin giá và ảnh
                price           # Giá gốc
                special_price   # Giá khuyến mãi
                thumbnail
            },
        }
    }
  `;

  return {
    // operationName: "GetProductsByCateId", // Không cần operationName nếu query đã có tên
    variables: {
      categoryId: categoryId.toString(), // Truyền ID danh mục vào biến
      provinceId: 30, // 30 = HCM, có thể thay đổi nếu muốn
      page: pageNumber,
      size: pageSize,
    },
    query: queryString,
  };
}

export async function cellphonesCrawler(
  // target bây giờ nên là categoryId (ví dụ: "1217") thay vì URL/slug
  categoryId: string | number,
  limit: number,
  onProgress: ProgressCallback
): Promise<string> {
  const products: Product[] = [];
  let page = 1;
  const pageSize = 30; // CellphoneS thường load 30 sp/lần

  console.log(`Bắt đầu cào data CellphoneS (Category ID: ${categoryId})...`);

  try {
    while (products.length < limit) {
      // Tạo payload chuẩn
      const payload = getQueryPayloadForPage(page, categoryId, pageSize);

      const response = await axios.post(
        "https://api.cellphones.com.vn/v2/graphql/query", // Endpoint chuẩn
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
            // Thêm header khác nếu cần
          },
        }
      );

      // Kiểm tra response theo cấu trúc query mới
      const items = response.data?.data?.products;

      if (!items || items.length === 0) {
        console.log(`[Trang ${page}] Hết sản phẩm. Dừng.`);
        break; // Dừng nếu không có sản phẩm trả về
      }

      console.log(`[Trang ${page}] Đã lấy được ${items.length} sản phẩm.`);

      for (const item of items) {
        if (products.length >= limit) break;

        // Xử lý lấy data theo cấu trúc mới
        const productUrl = `https://cellphones.com.vn/${item.general.url_key}.html`;
        const imageUrl = item.filterable.thumbnail
          ? `https://cdn2.cellphones.com.vn/x358,webp,q100/${item.filterable.thumbnail}`
          : "";

        products.push({
          sku: item.general.sku || `CPS-${item.general.product_id}`, // Ưu tiên SKU, fallback về ID
          name: item.general.name || "",
          // Ưu tiên giá khuyến mãi, nếu không có thì lấy giá gốc
          price: item.filterable.special_price || item.filterable.price || 0,
          description: `Xem chi tiết: ${productUrl}`, // Dùng URL làm description
          // Lấy tên category đầu tiên nếu có, nếu không thì dùng categoryId
          category: item.general.categories?.[0]?.name || categoryId.toString(),
          imageUrl: imageUrl,
        });
      }

      onProgress({ crawled: products.length, total: limit });

      // CellphoneS API này không trả về total_pages, nên cứ chạy tiếp đến khi hết data hoặc đủ limit
      // Hoặc có thể thêm logic kiểm tra nếu response trả về ít hơn pageSize thì dừng

      page++;
      await sleep(1500); // Giữ nguyên rate limiting
    }

    // Generate CSV (Giữ nguyên phần này, nhưng sửa tên keys cho khớp interface Product)
    const resultsDir = path.join(process.cwd(), "results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, `cellphones-${Date.now()}.csv`);

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
    console.error("[CellphonesCrawler Error]:", error);
    // Log thêm response lỗi nếu có
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response data:", error.response.data);
    }
    throw new Error(
      `Failed to crawl CellphoneS: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
