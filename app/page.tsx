"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

interface JobStatus {
  jobId: string
  status: "pending" | "crawling" | "completed" | "error"
  progress: { crawled: number; total: number }
  message?: string
  filePath?: string
}

export default function Home() {
  const [site, setSite] = useState<"cellphones" | "gearvn">("cellphones")
  const [target, setTarget] = useState("")
  const [limit, setLimit] = useState(100)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "crawling" | "completed" | "error">("idle")
  const [progress, setProgress] = useState({ crawled: 0, total: 0 })
  const [logs, setLogs] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}`
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      console.log("[WebSocket] Connected")
    }

    wsRef.current.onmessage = (event) => {
      try {
        const data: JobStatus = JSON.parse(event.data)
        if (data.jobId === jobId) {
          setStatus(data.status)
          setProgress(data.progress)
          if (data.message) {
            setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${data.message}`])
          }
        }
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error)
      }
    }

    wsRef.current.onerror = (error) => {
      console.error("[WebSocket] Error:", error)
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [jobId])

  const handleStartCrawling = async () => {
    if (!target.trim()) {
      alert("Please enter a category URL or slug")
      return
    }

    try {
      setLogs([])
      setProgress({ crawled: 0, total: limit })
      setStatus("crawling")

      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, target, limit }),
      })

      if (!response.ok) {
        throw new Error("Failed to start crawl")
      }

      const data = await response.json()
      setJobId(data.jobId)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Job started: ${data.jobId}`])

      // Send jobId to WebSocket for tracking
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ jobId: data.jobId }))
      }
    } catch (error) {
      console.error("[Error] Start crawling:", error)
      setStatus("error")
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
    }
  }

  const handleDownloadCSV = async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/api/crawl/download/${jobId}`)
      if (!response.ok) {
        throw new Error("Failed to download file")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `crawl-${jobId}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[Error] Download CSV:", error)
      alert("Failed to download CSV file")
    }
  }

  const progressPercentage = progress.total > 0 ? (progress.crawled / progress.total) * 100 : 0

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Web Scraper</h1>
          <p className="text-muted-foreground mt-2">Scrape product data from e-commerce sites</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Set up your scraping parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site">Target Site</Label>
              <Select value={site} onValueChange={(value: any) => setSite(value)}>
                <SelectTrigger id="site">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cellphones">CellphoneS</SelectItem>
                  <SelectItem value="gearvn">GearVN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Category URL or Slug</Label>
              <Input
                id="target"
                placeholder="e.g., dien-thoai-di-dong"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={status === "crawling"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Number of Products</Label>
              <Input
                id="limit"
                type="number"
                min={10}
                value={limit}
                onChange={(e) => setLimit(Math.max(10, Number.parseInt(e.target.value) || 10))}
                disabled={status === "crawling"}
              />
            </div>

            <Button onClick={handleStartCrawling} disabled={status === "crawling"} className="w-full">
              {status === "crawling" ? "Crawling..." : "Start Crawling"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Real-time crawling status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="text-sm font-medium">
                {status === "idle" && <span className="text-muted-foreground">Idle</span>}
                {status === "crawling" && <span className="text-blue-500">Crawling...</span>}
                {status === "completed" && <span className="text-green-500">Completed</span>}
                {status === "error" && <span className="text-red-500">Error</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Progress</Label>
              <Progress value={progressPercentage} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {progress.crawled} / {progress.total} products
              </p>
            </div>

            <div className="space-y-2">
              <Label>Logs</Label>
              <ScrollArea className="h-40 w-full border rounded-md p-3 bg-muted">
                <div className="space-y-1">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No logs yet...</p>
                  ) : (
                    logs.map((log, index) => (
                      <p key={index} className="text-xs text-foreground font-mono">
                        {log}
                      </p>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <Button
              onClick={handleDownloadCSV}
              disabled={status !== "completed"}
              variant="outline"
              className="w-full bg-transparent"
            >
              Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
