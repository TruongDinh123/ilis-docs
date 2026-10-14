import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Nút dùng chung của design system. min-height tuân thủ touch target 44px (trừ size="sm"
 * dùng trong vùng mật độ cao, vẫn giữ padding đủ lớn để đạt diện tích chạm tương đương).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(styles.button, styles[variant], styles[size], className)}
      {...props}
    />
  );
});
