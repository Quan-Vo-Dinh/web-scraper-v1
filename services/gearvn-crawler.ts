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

export async function gearvnCrawler(target: string, limit: number, onProgress: ProgressCallback): Promise<string> {
  const products: Product[] = []
  let page = 1

  try {
    while (products.length < limit) {
      const url = `https://gearvn.com/collections/${target}/products.json`
      const response = await axios.get(url, {
        params: {
          page,
          limit: 50,
        },
      })

      if (!response.data.products || response.data.products.length === 0) {
        break
      }

      for (const item of response.data.products) {
        if (products.length >= limit) break

        const price = item.variants?.[0]?.price || 0

        products.push({
          sku: item.id?.toString() || "",
          name: item.title || "",
          price: typeof price === "string" ? Number.parseFloat(price) : price,
          description: item.body_html || "",
          category: target,
          imageUrl: item.featured_image?.src || "",
        })
      }

      onProgress({ crawled: products.length, total: limit })

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
    const filePath = path.join(resultsDir, `gearvn-${Date.now()}.csv`)
    fs.writeFileSync(filePath, csv)

    return filePath
  } catch (error) {
    console.error("[GearVNCrawler Error]:", error)
    throw new Error(`Failed to crawl GearVN: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
