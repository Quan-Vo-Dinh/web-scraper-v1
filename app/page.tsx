"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface JobStatus {
  jobId: string;
  status: "pending" | "crawling" | "completed" | "error";
  progress: { crawled: number; total: number };
  message?: string;
  filePath?: string;
}

interface CategoryOption {
  value: string;
  label: string;
}

const categories: {
  cellphones: CategoryOption[];
  gearvn: CategoryOption[];
} = {
  cellphones: [
    { value: "1217", label: "Laptop Văn phòng" },
    { value: "933", label: "Laptop Gamming" },
    { value: "784", label: "Màn hình" },
    { value: "3", label: "Điện thoại di động" },
    { value: "864", label: "Máy tính để bàn" },
  ],
  gearvn: [
    { value: "laptop", label: "Laptop - Tất cả (GearVN)" },
    { value: "laptop-gaming", label: "Laptop Gaming" },
    { value: "chuot-may-tinh", label: "Chuột Máy Tính" },
    { value: "ban-phim-co", label: "Bàn phím cơ" },
    { value: "ghe-gia-tot", label: "Ghế Giá Tốt" },
  ],
};

// Simple CSV parser
const parseCSV = (text: string) => {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  const rows = lines.slice(1).map((line) => line.split(","));
  return { headers, rows };
};

export default function Home() {
  const [site, setSite] = useState<"cellphones" | "gearvn">("cellphones");
  const [selectedCategoryValue, setSelectedCategoryValue] =
    useState<string>("");
  const [limit, setLimit] = useState(100);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "pending" | "crawling" | "completed" | "error"
  >("idle");
  const [progress, setProgress] = useState({ crawled: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const currentCategoryOptions = categories[site] || [];

  useEffect(() => {
    setSelectedCategoryValue("");
  }, [site]);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "localhost:3001";
    const protocol = backendUrl.startsWith("https") ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${backendUrl.replace(/^https?:\/\//, "")}`;
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.onopen = () => console.log("[WebSocket] Connected");
    wsRef.current.onerror = (error) =>
      console.error("[WebSocket] Error:", error);
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    if (!wsRef.current) return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data: JobStatus = JSON.parse(event.data);
        if (data.jobId === jobId) {
          setStatus(data.status);
          setProgress(data.progress);
          if (data.message) {
            setLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ${data.message}`,
            ]);
          }
        }
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error);
      }
    };
    wsRef.current.addEventListener("message", handleMessage);
    return () => wsRef.current?.removeEventListener("message", handleMessage);
  }, [jobId]);

  const handleStartCrawling = async () => {
    if (!selectedCategoryValue) {
      alert("Please select a product category");
      return;
    }
    try {
      setLogs([]);
      setCsvData(null);
      setProgress({ crawled: 0, total: limit });
      setStatus("crawling");
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, target: selectedCategoryValue, limit }),
      });
      if (!response.ok) throw new Error("Failed to start crawl");
      const data = await response.json();
      setJobId(data.jobId);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Job started: ${data.jobId}`,
      ]);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ jobId: data.jobId }));
      }
    } catch (error) {
      console.error("[Error] Start crawling:", error);
      setStatus("error");
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      ]);
    }
  };

  const handleDownloadCSV = async () => {
    if (!jobId) return;
    try {
      const response = await fetch(`/api/crawl/download/${jobId}`);
      if (!response.ok) throw new Error("Failed to download file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crawl-${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("[Error] Download CSV:", error);
      alert("Failed to download CSV file");
    }
  };

  const handleViewData = async () => {
    if (!jobId) return;
    try {
      const response = await fetch(`/api/crawl/download/${jobId}`);
      if (!response.ok) throw new Error("Could not fetch CSV data.");
      const text = await response.text();
      const parsedData = parseCSV(text);
      setCsvData(parsedData);
      setIsViewerOpen(true);
    } catch (error) {
      console.error("[Error] View Data:", error);
      alert("Failed to load or parse CSV data for viewing.");
    }
  };

  const progressPercentage =
    progress.total > 0 ? (progress.crawled / progress.total) * 100 : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Web Scraper Pro
          </h1>
          <p className="text-muted-foreground text-lg">
            Thu thập dữ liệu sản phẩm từ CellphoneS & GearVN
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Trạng thái
                  </p>
                  <p className="text-2xl font-bold">
                    {status === "idle" && (
                      <span className="text-muted-foreground">Chờ</span>
                    )}
                    {status === "pending" && (
                      <span className="text-blue-500">Chuẩn bị</span>
                    )}
                    {status === "crawling" && (
                      <span className="text-blue-500">Crawling</span>
                    )}
                    {status === "completed" && (
                      <span className="text-green-500">Hoàn thành</span>
                    )}
                    {status === "error" && (
                      <span className="text-red-500">Lỗi</span>
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">
                    {status === "idle" && "⏸️"}
                    {status === "pending" && "⏳"}
                    {status === "crawling" && "🔄"}
                    {status === "completed" && "✅"}
                    {status === "error" && "❌"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Đã thu thập
                  </p>
                  <p className="text-2xl font-bold">{progress.crawled}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Tiến độ
                  </p>
                  <p className="text-2xl font-bold">
                    {progress.total > 0
                      ? Math.round((progress.crawled / progress.total) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>⚙️</span>Cấu hình Crawl
              </CardTitle>
              <CardDescription>
                Thiết lập các thông số để bắt đầu thu thập dữ liệu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site">Trang web mục tiêu</Label>
                <Select
                  value={site}
                  onValueChange={(value: any) => setSite(value)}
                  disabled={status === "crawling"}
                >
                  <SelectTrigger id="site">
                    <SelectValue placeholder="Chọn trang web..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cellphones">📱 CellphoneS</SelectItem>
                    <SelectItem value="gearvn">💻 GearVN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Danh mục sản phẩm</Label>
                <Select
                  value={selectedCategoryValue}
                  onValueChange={setSelectedCategoryValue}
                  disabled={status === "crawling"}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Chọn danh mục..." />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCategoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  📝 Chọn danh mục bạn muốn thu thập dữ liệu.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Số lượng sản phẩm</Label>
                <Input
                  id="limit"
                  type="number"
                  min={10}
                  max={1000}
                  value={limit}
                  onChange={(e) =>
                    setLimit(
                      Math.max(10, Number.parseInt(e.target.value) || 10)
                    )
                  }
                  disabled={status === "crawling"}
                />
                <p className="text-xs text-muted-foreground">
                  ⚡ Tối thiểu 10, tối đa 1000 sản phẩm (có thể tăng nếu cần).
                </p>
              </div>
              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleStartCrawling}
                  disabled={status === "crawling" || !selectedCategoryValue}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {status === "crawling" ? (
                    <>
                      <span className="animate-spin mr-2">⚙️</span>Đang crawl...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🚀</span>Bắt đầu thu thập dữ liệu
                    </>
                  )}
                </Button>
                {status === "completed" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleDownloadCSV}
                      variant="outline"
                      className="w-full h-12 text-base font-semibold border-2"
                      size="lg"
                    >
                      <span className="mr-2">💾</span>Tải xuống CSV
                    </Button>
                    <Button
                      onClick={handleViewData}
                      variant="outline"
                      className="w-full h-12 text-base font-semibold border-2"
                      size="lg"
                    >
                      <span className="mr-2">👁️</span>Xem dữ liệu
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📈</span>Tiến trình & Logs
              </CardTitle>
              <CardDescription>
                Theo dõi quá trình thu thập dữ liệu real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Tiến độ crawl
                  </Label>
                  <span className="text-sm font-medium text-muted-foreground">
                    {progress.crawled} / {progress.total} sản phẩm
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                <p className="text-xs text-muted-foreground text-center">
                  {progressPercentage.toFixed(1)}% hoàn thành
                </p>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  📋 Nhật ký hoạt động
                </Label>
                <ScrollArea className="h-80 w-full border rounded-lg p-4 bg-muted/30">
                  <div className="space-y-2">
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                        <span className="text-4xl mb-2">📝</span>
                        <p className="text-sm text-muted-foreground">
                          Chưa có hoạt động nào...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Nhấn "Bắt đầu thu thập dữ liệu" để bắt đầu
                        </p>
                      </div>
                    ) : (
                      logs.map((log, index) => (
                        <div
                          key={index}
                          className="text-xs font-mono bg-background/50 p-2 rounded border-l-2 border-primary/50 hover:bg-background/80 transition-colors"
                        >
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Hỗ trợ
                </p>
                <p className="text-lg font-semibold">2 Websites</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Định dạng xuất
                </p>
                <p className="text-lg font-semibold">CSV</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Real-time
                </p>
                <p className="text-lg font-semibold">WebSocket</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-screen-2xl">
          <DialogHeader>
            <DialogTitle>Xem trước dữ liệu CSV</DialogTitle>
          </DialogHeader>
          <div className="relative h-[70vh] overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                {csvData?.headers && (
                  <TableRow>
                    {csvData.headers.map((header) => (
                      <TableHead key={header} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {csvData?.rows && csvData.rows.length > 0 ? (
                  csvData.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          className="max-w-[400px] truncate whitespace-nowrap"
                          title={cell}
                        >
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={csvData?.headers.length || 1}
                      className="h-24 text-center"
                    >
                      Không có dữ liệu để hiển thị.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewerOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
