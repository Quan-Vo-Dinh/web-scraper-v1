# 🕸️ EC312.Q12 - LAB03 `WebScraper Control Panel`

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

---

## 🛠️ Tech Stack & Technologies

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Shadcn/UI](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcn%2Fui&logoColor=white)](https://ui.shadcn.com/)
[![Vercel KV](https://img.shields.io/badge/Vercel_KV-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/storage/kv)
[![Vercel Blob](https://img.shields.io/badge/Vercel_Blob-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/storage/blob)

---

## 📝 Overview

**Web-Scraper Control Panel** là một tool **Fullstack Next.js** được thiết kế để thu thập dữ liệu sản phẩm từ các trang thương mại điện tử **CellphoneS** và **GearVN**.

- **Backend:** Xây dựng hoàn toàn bằng **Next.js API Routes**.
- **Job & State Management:** Trạng thái và tiến trình của các tác vụ crawl được quản lý bằng **Vercel KV**.
- **File Storage:** File CSV kết quả được lưu trữ trên **Vercel Blob**.
- **Progress Updates:** Giao diện người dùng cập nhật trạng thái bằng cơ chế **API Polling**.

**Các điểm nổi bật:**

- **Multi-Site Crawler:** Hỗ trợ thu thập dữ liệu từ nhiều nguồn (hiện tại: CellphoneS & GearVN).
- **Serverless Background Jobs:** Các tác vụ crawl được xử lý bất đồng bộ trong môi trường serverless.
- **Modern UI:** Giao diện điều khiển hiện đại, dễ sử dụng được xây dựng bằng **React** và **Shadcn/UI**.

---

## 🚀 Getting Started

### 1. Cài đặt

Clone repository và cài đặt các dependencies:

```bash
$ git clone <repository-url>
$ cd web-scraper-v1
$ pnpm install
```

### 2. Cấu hình Môi trường (Local Development)

Ứng dụng này sử dụng Vercel KV và Vercel Blob. Để chạy local, bạn cần kết nối đến các dịch vụ này trên Vercel.

- **Tạo Vercel KV và Blob:**

  - Truy cập dashboard dự án của bạn trên Vercel.
  - Vào tab **Storage**, tạo và kết nối một **KV database** và một **Blob store**.

- **Lấy biến môi trường:**
  - Cài đặt Vercel CLI: `npm i -g vercel`
  - Đăng nhập: `vercel login`
  - Liên kết dự án của bạn: `vercel link`
  - Kéo các biến môi trường về local. Thao tác này sẽ tạo một file `.env.local` chứa các key cần thiết.
  ```bash
  $ vercel env pull .env.local
  ```

### 3. Chạy ứng dụng

Sau khi đã có file `.env.local`, khởi động server development:

```bash
$ pnpm dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`.

---
