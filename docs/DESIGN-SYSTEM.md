# Design System — iLIS Cà Mau

Nguồn gốc bảng màu: `Màu sắc nhận diện thương hiệu VNPT.txt` (bảng màu **tham khảo**, không phải
bộ nhận diện chính thức đã xác nhận — ghi chú này được giữ nguyên trong token).

## Token màu (`src/styles/tokens.css`)

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--color-primary` | `#005BAA` | Nút chính, liên kết nhấn mạnh, icon nổi bật |
| `--color-primary-strong` | `#003B70` | Sidebar, tiêu đề, trạng thái hover đậm |
| `--color-primary-soft` | `#EAF4FC` | Nền phụ, thẻ icon |
| `--color-background` | `#F5F9FD` | Nền trang |
| `--color-surface` | `#FFFFFF` | Thẻ, hộp thoại |
| `--color-border` | `#DCE5EF` | Viền |
| `--color-text` / `--color-text-muted` | `#1F2937` / `#64748B` | Chữ chính / chữ phụ |
| `--color-success` / `--color-danger` / `--color-warning` | — | Badge trạng thái Hướng dẫn/Lỗi/Thông báo |

Đã thêm `:root[data-theme="dark"]` làm điểm mở rộng chế độ tối (chưa bật UI chuyển đổi).

## Vì sao không dùng Tailwind/CSS-in-JS

Dự án dùng **CSS Modules + custom properties** (cách tiếp cận giống bước "theming với CSS
variables" của shadcn/ui) để giữ bề mặt phụ thuộc cài đặt nhỏ nhất có thể (ít rủi ro khi môi
trường không có mạng ổn định để tải thêm toolchain), trong khi vẫn giữ được nguyên tắc
"semantic token thay vì mã hex rời rạc trong component" mà shadcn/ui áp dụng.

## Quy tắc UX bắt buộc (theo `ui-ux-pro-max`, style "Accessible & Ethical")

1. Độ tương phản chữ tối thiểu 4.5:1.
2. Mọi phần tử tương tác có `:focus-visible` hiển thị rõ (xem `globals.css`).
3. Kích thước chạm tối thiểu 44×44px (`--touch-target-min`), áp dụng cho `Button`, `Input`, menu
   di động.
4. Tôn trọng `prefers-reduced-motion` — tắt animation của `Dialog`/cuộn mượt khi người dùng bật.
5. Không dùng emoji làm icon chức năng — toàn bộ icon là SVG inline.
6. Responsive tại 375 / 768 / 1024 / 1440px, không có cuộn ngang.

## Thành phần cơ bản (`src/components/ui`)

- `Button` — 4 variant (primary/secondary/ghost/danger), 2 size.
- `Badge` — 5 tone, dùng để gắn nhãn loại tài liệu.
- `Input` — hỗ trợ icon đầu dòng, dùng cho ô tìm kiếm.
- `Dialog` — compound component (`Root/Content/Title/CloseButton`), tự khóa cuộn nền + bẫy tiêu
  điểm bàn phím.

Mọi thành phần nghiệp vụ trong `features/documents/components` đều dựng trên các khối này — không
viết lại màu/khoảng cách thủ công.
