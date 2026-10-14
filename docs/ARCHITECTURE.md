# Kiến trúc dự án — iLIS Cà Mau Docs

## Nguồn tham chiếu (vì Context7/Firecrawl không khả dụng trong phiên làm việc)

Do MCP `context7` và `firecrawl` báo lỗi xác thực (API key) khi được gọi, kiến trúc và quy ước
dưới đây được đối chiếu trực tiếp với mã nguồn của hai dự án React có lượng sao rất lớn trên
GitHub, truy vấn qua công cụ tra cứu mã nguồn repo:

- **[alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react)** (>30.000 sao) —
  cấu trúc thư mục theo feature, quy tắc ESLint ngăn import chéo giữa các feature, quy ước đặt tên
  `kebab-case`, import tuyệt đối `@/*`.
- **[shadcn-ui/ui](https://github.com/shadcn-ui/ui)** (>80.000 sao) — cách tổ chức design token
  bằng CSS variables, pattern Theme Provider.
- **feature-sliced.design** — quy ước "mỗi feature export qua một `index.ts` (public API)", dùng
  để bổ sung cho quy tắc trên (bulletproof-react khuyến nghị import trực tiếp để tree-shake tốt
  hơn với Vite; dự án này ưu tiên tính đóng gói/ranh giới rõ ràng ở quy mô hiện tại và chấp nhận
  đánh đổi nhỏ về tree-shaking).

## Cấu trúc thư mục

```
src/
├── app/            # Lớp ứng dụng: router, provider (DI composition root), route pages
├── components/     # UI & layout dùng chung toàn ứng dụng (không phụ thuộc feature)
├── config/         # Hằng số cấu hình (đường dẫn route...)
├── features/
│   └── documents/  # Mọi thứ liên quan tới "tài liệu hướng dẫn": api, components, hooks, lib, data, types
├── hooks/          # Hook dùng chung (useMediaQuery, useFocusTrap, useLocalStorage)
├── lib/            # Tiện ích thuần (cn, event-bus)
├── styles/         # Design tokens + global reset
└── testing/        # Thiết lập môi trường test (Vitest + Testing Library)
```

Luồng import một chiều được áp bằng ESLint (`import/no-restricted-paths` trong `.eslintrc.cjs`):
`components/hooks/lib/config` (shared) → `features` → `app`. Không được đảo chiều, và các feature
không được import chéo lẫn nhau.

## SOLID áp dụng cụ thể

| Nguyên tắc | Áp dụng trong dự án |
|---|---|
| **S — Single Responsibility** | `AppShell` chỉ điều phối bố cục (header/sidebar/khóa cuộn); nó không biết gì về "tài liệu". `DocumentCard` chỉ hiển thị một bản ghi. `useDocumentSearch` chỉ lọc, không fetch. |
| **O — Open/Closed** | Thêm loại tài liệu mới → thêm một mục trong `document-kind-registry.ts`, không sửa `DocumentCard`/`DocumentList`. Thêm chiến lược tìm kiếm mới → thêm một `SearchStrategy`, không sửa `useDocumentSearch`. |
| **L — Liskov Substitution** | Mọi triển khai `DocumentRepository` (hiện có `staticDocumentRepository`, có thể thêm `httpDocumentRepository`) phải tôn trọng cùng hợp đồng: trả `Promise<DocumentRecord[]>`, không ném lỗi với danh sách rỗng — hoán đổi tự do mà không vỡ hook `useDocuments`. |
| **I — Interface Segregation** | `DocumentRepository` chỉ có một phương thức (`getAll`) thay vì một "god interface" gộp cả tìm kiếm, phân trang, ghi dữ liệu. |
| **D — Dependency Inversion** | Component/hook phụ thuộc vào `useDocumentRepository()` (abstraction qua Context), không import thẳng `static-document-repository.ts`. Việc "tiêm" triển khai cụ thể chỉ xảy ra một lần, ở `app/provider.tsx` (composition root). |

## Design pattern đã dùng

- **Repository pattern** — `features/documents/api/*` tách biệt nguồn dữ liệu khỏi UI.
- **Strategy pattern** — `features/documents/lib/search-strategies.ts`.
- **Factory/Registry pattern** — `features/documents/lib/document-kind-registry.ts` ánh xạ loại
  tài liệu → metadata hiển thị (icon, nhãn, màu).
- **Compound Component pattern** — `components/ui/dialog.tsx` (`Dialog.Root/.Content/.Title/.CloseButton`),
  theo đúng cách shadcn/ui tổ chức các component ghép.
- **Observer pattern (+ Singleton)** — `lib/event-bus.ts`, dùng để phát sự kiện `document:viewed`
  mà không tạo phụ thuộc trực tiếp giữa các feature trong tương lai.
- **Provider pattern** — `DocumentRepositoryProvider`, `AppProvider` bọc Router + DI ở gốc ứng dụng.

## Khả năng truy cập & hiệu năng (ui-ux-pro-max)

Skill `ui-ux-pro-max` (đã cài tại `.agents/skills/ui-ux-pro-max`) được dùng để tra cứu:
- `--design-system "government land registry documentation portal"` → style "Accessible & Ethical"
  (tông màu nền hành chính công, tương phản cao, không dùng emoji làm icon).
- `--domain ux "modal dialog focus trap keyboard"` → áp dụng trong `components/ui/dialog.tsx`
  và `hooks/use-focus-trap.ts`.
- `--domain react "list rerender memo performance"` → áp dụng `React.memo` ở `DocumentCard`,
  `useMemo` với dependency nguyên thủy ở `useDocumentSearch`, derived boolean ở `useMediaQuery`.

## Giới hạn đã biết / việc cần làm tiếp

- Nội dung tài liệu trong `data/seed-documents.ts` là **khung mẫu**, cần đơn vị vận hành Cà Mau
  xác nhận trước khi dùng thật (không bịa quy trình/đầu mối hỗ trợ).
- Chưa có `HttpDocumentRepository` thật — khi có API, chỉ cần viết thêm một file tuân thủ
  `DocumentRepository` rồi đổi một dòng ở `app/provider.tsx`.
- Context7/Firecrawl MCP cần được cấu hình API key để lấy tài liệu/scrape dữ liệu trực tiếp cho
  các vòng lặp tiếp theo — xem hướng dẫn trong phần chat chính.
