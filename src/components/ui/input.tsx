import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import styles from "./input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Icon hiển thị bên trái (ví dụ kính lúp tìm kiếm). */
  leadingIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leadingIcon, ...props },
  ref,
) {
  return (
    <div className={styles.wrapper}>
      {leadingIcon ? (
        <span className={styles.icon} aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(styles.input, leadingIcon && styles.withIcon, className)}
        {...props}
      />
    </div>
  );
});
