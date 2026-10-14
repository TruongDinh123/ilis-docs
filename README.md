# iLIS Cà Mau — Cổng hướng dẫn &amp; hỗ trợ (React + TypeScript)

Dự án React thật (Vite + TypeScript + React Router), kiến trúc feature-based, áp dụng SOLID và
nhiều design pattern, design system riêng dựa trên bảng màu VNPT. Xem chi tiết tại
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) và [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).

> 🌐 **Live Production:** [https://truongdinh123.github.io/ilis-docs/](https://truongdinh123.github.io/ilis-docs/)  
> 📦 **GitHub Repository:** [https://github.com/TruongDinh123/ilis-docs.git](https://github.com/TruongDinh123/ilis-docs.git)

## Bắt đầu

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # Vitest + Testing Library
npm run lint       # ESLint (bao gồm ranh giới import giữa các feature)
npm run build      # tsc -b + vite build
npm run deploy     # Build & Deploy lên GitHub Pages nhánh gh-pages
npm run sync:content -- "<file-page-source.html>"   # làm mới dữ liệu từ site Đồng Tháp
```

## Trang chủ (feature `portal`)

Trang chủ nhân bản đầy đủ nội dung của https://ilis-docs.vnptdongthap.com.vn/ (xem page source):
Truy cập nhanh, hướng dẫn gửi hỗ trợ, 28 lỗi thường gặp (nguyên nhân/cách khắc phục/ảnh/tệp tải),
ghi chú quan trọng (6 chủ đề + 20 lưu ý), 11 phần mềm ký số kèm link tải/hướng dẫn, 28 video
hướng dẫn, 43 tài liệu, 12 thông báo. Giao diện: sidebar gradient xanh có màu theo nhóm, huy hiệu
bản đồ Cà Mau (dữ liệu ranh giới GADM), tìm kiếm toàn trang `Ctrl+K`.

- Dữ liệu nằm trong `src/features/portal/data/dongthap-content.json`, được sinh bởi
  `scripts/sync-dongthap-content.py` (lấy từ file page source đã lưu: `curl -o dt.html <url>`).
- Ảnh hướng dẫn, tệp tải và các trang con (phiếu thuế, QR...) hiện **liên kết trực tiếp** về site Đồng Tháp.
- Các địa chỉ hệ thống (ILIS CADAS/LPM, tra cứu GCN...) đặt tập trung tại
  `src/features/portal/data/system-links.ts` — sửa một chỗ khi Cà Mau có địa chỉ riêng.

## Vì sao không có dữ liệu thật của Cà Mau

Nội dung nghiệp vụ nhân bản từ Đồng Tháp (cùng nền tảng VNPT iLIS) và feature `documents` cũ trong
`src/features/documents/data/seed-documents.ts` là khung mẫu — được đánh dấu rõ "cần đơn vị Cà Mau
xác nhận". Không có quy trình, địa chỉ hệ thống hay đầu mối hỗ trợ nào của Cà Mau bị suy đoán/bịa ra.
