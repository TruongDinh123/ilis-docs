import { Input } from "@/components/ui/input";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

export function SearchBar({ value, onChange, id, placeholder }: SearchBarProps) {
  return (
    <Input
      id={id}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder ?? "Tìm hướng dẫn, lỗi..."}
      aria-label="Tìm trong tài liệu"
      leadingIcon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>
      }
    />
  );
}
