# 🕸️ EC312.Q12 - LAB03 `WebScraper Control Panel`

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/bins-projects-c818da1e/v0-web-scraper-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/8xExvD2jCNO)

---

## 🛠️ Tech Stack & Technologies

[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Shadcn/UI](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcn%2Fui&logoColor=white)](https://ui.shadcn.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-100000?style=for-the-badge&logo=websocket&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)](https://axios-http.com/)

---

## 📝 Overview

**V0 E-Commerce Scraper Control Panel** là một ứng dụng **Fullstack** được thiết kế để thu thập dữ liệu sản phẩm từ các trang thương mại điện tử lớn của Việt Nam như **CellphoneS** và **GearVN**.

Ứng dụng sử dụng một giao diện điều khiển hiện đại (xây dựng bằng **React** và **Shadcn/UI**) để kích hoạt các tác vụ thu thập dữ liệu bất đồng bộ trên **Express.js** backend. Mọi tiến trình thu thập (crawling) đều được cập nhật theo thời gian thực (Real-time) thông qua **WebSocket**, giúp người dùng dễ dàng theo dõi và tải về kết quả dưới định dạng CSV (tương thích với WooCommerce).

**Các điểm nổi bật:**

- **Multi-Site Crawler:** Hỗ trợ thu thập dữ liệu từ nhiều nguồn (hiện tại: CellphoneS & GearVN) với các phương thức API khác nhau (**GraphQL** cho CellphoneS và **REST** cho GearVN).
- **Asynchronous Job Handling:** Backend xử lý tác vụ cào data ở background, không làm treo giao diện.
- **Real-time Feedback:** Cung cấp thanh tiến trình và nhật ký hoạt động qua **WebSocket** (hoàn thành yêu cầu cộng điểm thực hành).

---

## 🚀 Deployment

Your project is live at:

**[https://vercel.com/bins-projects-c818da1e/v0-web-scraper-app](https://vercel.com/bins-projects-c818da1e/v0-web-scraper-app)**
