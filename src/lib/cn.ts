/**
 * Gộp class name có điều kiện, bỏ qua giá trị falsy.
 * Tiện ích nhỏ, không phụ thuộc gói ngoài — giữ bề mặt cài đặt tối thiểu.
 */
export type ClassValue = string | number | null | false | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
