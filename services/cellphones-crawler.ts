import axios from "axios"
import { Parser } from "json2csv"
import fs from "fs"
import path from "path"

interface Product {
  sku: string
  name: string
  price: number
  description: string
  category: string
  imageUrl: string
}

type ProgressCallback = (progress: { crawled: number; total: number }) => void

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function cellphonesCrawler(target: string, limit: number, onProgress: ProgressCallback): Promise<string> {
  const products: Product[] = []
  let page = 1
  const pageSize = 20

  try {
    while (products.length < limit) {
      const query = {
        operationName: "GetProductList",
        variables: {
          filter: {
            category_url_key: target,
          },
          pageSize,
          currentPage: page,
        },
        query: `
          query GetProductList($filter: ProductAttributeFilterInput, $pageSize: Int, $currentPage: Int) {
            products(filter: $filter, pageSize: $pageSize, currentPage: $currentPage) {
              items {
                id
                sku
                name
                price_range {
                  minimum_price {
                    regular_price {
                      value
                    }
                  }
                }
                description {
                  html
                }
                image {
                  url
                }
              }
              page_info {
                total_pages
              }
            }
          }
        `,
      }

      const response = await axios.post("https://api.cellphones.com.vn/v2/graphql/query", query)

      if (!response.data.data?.products?.items) {
        break
      }

      const items = response.data.data.products.items

      for (const item of items) {
        if (products.length >= limit) break

        products.push({
          sku: item.sku || "",
          name: item.name || "",
          price: item.price_range?.minimum_price?.regular_price?.value || 0,
          description: item.description?.html || "",
          category: target,
          imageUrl: item.image?.url || "",
        })
      }

      onProgress({ crawled: products.length, total: limit })

      const totalPages = response.data.data.products.page_info?.total_pages || 1
      if (page >= totalPages) break

      page++
      await sleep(1500) // Rate limiting
    }

    // Generate CSV
    const resultsDir = path.join(process.cwd(), "results")
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }

    const csvParser = new Parser()
    const csv = csvParser.parse(products)
    const filePath = path.join(resultsDir, `cellphones-${Date.now()}.csv`)
    fs.writeFileSync(filePath, csv)

    return filePath
  } catch (error) {
    console.error("[CellphonesCrawler Error]:", error)
    throw new Error(`Failed to crawl CellphoneS: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
