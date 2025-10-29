"use client";

import { useState, useEffect } from "react";
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

// Updated JobStatus interface to match the new API response
interface JobStatus {
  jobId: string;
  status: "pending" | "crawling" | "completed" | "error";
  progress: { crawled: number; total: number };
  message?: string;
  resultUrl?: string; // This is new
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

// Simple CSV parser (remains unchanged)
const parseCSV = (text: string) => {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.replace(/\"/g, ""));
  const rows = lines
    .slice(1)
    .map((line) => line.split(",").map((c) => c.replace(/\"/g, "")));
  return { headers, rows };
};

export default function Home() {
  // UI State (remains unchanged)
  const [site, setSite] = useState<"cellphones" | "gearvn">("cellphones");
  const [selectedCategoryValue, setSelectedCategoryValue] =
    useState<string>("");
  const [limit, setLimit] = useState(100);

  // Refactored State for Job Management
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // CSV Viewer State (remains unchanged)
  const [csvData, setCsvData] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const currentCategoryOptions = categories[site] || [];

  // Effect to reset category on site change (remains unchanged)
  useEffect(() => {
    setSelectedCategoryValue(currentCategoryOptions[0]?.value || "");
  }, [site, currentCategoryOptions]);

  // --- NEW: Polling Logic ---
  useEffect(() => {
    if (
      !jobId ||
      jobStatus?.status === "completed" ||
      jobStatus?.status === "error"
    ) {
      setIsLoading(false);
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/crawl/status/${jobId}`);
        if (response.ok) {
          const data: JobStatus = await response.json();
          setJobStatus(data);

          // Update logs with the latest message from the job
          const latestMessage = `[${new Date().toLocaleTimeString()}] ${
            data.message
          }`;
          if (data.message && !logs.includes(latestMessage)) {
            setLogs((prev) => [...prev, latestMessage]);
          }

          if (data.status === "completed" || data.status === "error") {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        setIsLoading(false); // Stop on polling failure
      }
    };

    const intervalId = setInterval(pollStatus, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId); // Cleanup interval
  }, [jobId, jobStatus, logs]);

  // --- REFACTORED: Event Handlers ---
  const handleStartCrawling = async () => {
    if (!selectedCategoryValue) {
      alert("Please select a product category");
      return;
    }

    setIsLoading(true);
    setLogs([]);
    setCsvData(null);
    setJobStatus(null);
    setJobId(null);

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, target: selectedCategoryValue, limit }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to start crawl job");
      }

      const data = await response.json();
      setJobId(data.jobId);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Job started: ${data.jobId}`,
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Error] Start crawling:", error);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Error: ${errorMessage}`,
      ]);
      setIsLoading(false);
    }
  };

  const handleViewData = async () => {
    if (!jobId) return;
    try {
      const response = await fetch(`/api/crawl/download/${jobId}`);
      if (!response.ok)
        throw new Error("Could not fetch CSV data for viewing.");
      const text = await response.text();
      const parsedData = parseCSV(text);
      setCsvData(parsedData);
      setIsViewerOpen(true);
    } catch (error) {
      console.error("[Error] View Data:", error);
      alert("Failed to load or parse CSV data for viewing.");
    }
  };

  // --- Derived State for UI ---
  const currentStatus = jobStatus?.status || (isLoading ? "pending" : "idle");
  const progress = jobStatus?.progress || { crawled: 0, total: limit };
  const progressPercentage =
    progress.total > 0 ? (progress.crawled / progress.total) * 100 : 0;

  // --- UI RENDER (Unchanged Structure) ---
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            EC312.Q12 - LAB03 WebScraper Control Panel
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
                    {currentStatus === "idle" && (
                      <span className="text-muted-foreground">Chờ</span>
                    )}
                    {currentStatus === "pending" && (
                      <span className="text-blue-500">Chuẩn bị</span>
                    )}
                    {currentStatus === "crawling" && (
                      <span className="text-blue-500">Crawling</span>
                    )}
                    {currentStatus === "completed" && (
                      <span className="text-green-500">Hoàn thành</span>
                    )}
                    {currentStatus === "error" && (
                      <span className="text-red-500">Lỗi</span>
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">
                    {currentStatus === "idle" && "⏸️"}
                    {currentStatus === "pending" && "⏳"}
                    {currentStatus === "crawling" && "🔄"}
                    {currentStatus === "completed" && "✅"}
                    {currentStatus === "error" && "❌"}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  ⚡ Tối thiểu 10, tối đa 1000 sản phẩm (có thể tăng nếu cần).
                </p>
              </div>
              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleStartCrawling}
                  disabled={isLoading || !selectedCategoryValue}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin mr-2">⚙️</span>Đang crawl...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🚀</span>Bắt đầu thu thập dữ liệu
                    </>
                  )}
                </Button>
                {currentStatus === "completed" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-12 text-base font-semibold border-2"
                      size="lg"
                    >
                      <a href={`/api/crawl/download/${jobId}`} download>
                        <span className="mr-2">💾</span>Tải xuống CSV
                      </a>
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
                Theo dõi quá trình thu thập dữ liệu
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
                  Cập nhật
                </p>
                <p className="text-lg font-semibold">API Polling</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="!max-w-[90vw] !w-[90vw] h-[80vh] p-6 flex flex-col">
          <DialogHeader>
            <DialogTitle>Xem trước dữ liệu CSV</DialogTitle>
          </DialogHeader>

          {/* Bảng scroll cả 2 chiều */}
          <div className="flex-1 overflow-auto border rounded-md mt-4">
            <div className="min-w-max">
              <Table className="table-auto">
                <TableHeader className="sticky top-0 bg-background z-10">
                  {csvData?.headers && (
                    <TableRow>
                      {csvData.headers.map((header) => (
                        <TableHead
                          key={header}
                          className="whitespace-nowrap text-sm font-medium border-b px-4 py-2"
                        >
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
                            className="px-4 py-2 align-top text-sm border-b whitespace-nowrap"
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
          </div>

          <DialogFooter className="mt-4">
            <Button onClick={() => setIsViewerOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
