"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function SubmitButton({
  children,
  pendingText,
  className,
  size,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: ReactNode;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type={props.type || "submit"}
      size={size}
      variant={variant}
      className={className}
      loading={pending}
      loadingText={pendingText || "处理中..."}
      disabled={props.disabled}
    >
      {children}
    </Button>
  );
}