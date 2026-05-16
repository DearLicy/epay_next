"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  loadingText?: ReactNode;
  showSpinner?: boolean;
};

export function LoadingAnchor({ children, className, onClick, loadingText, showSpinner = true, ...props }: LoadingAnchorProps) {
  const [pending, setPending] = useState(false);

  return (
    <a
      {...props}
      aria-busy={pending || undefined}
      data-pending={pending ? "true" : undefined}
      className={cn(pending && "pointer-events-none opacity-75", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setPending(true);
        }
      }}
    >
      {pending && showSpinner ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {pending && loadingText ? loadingText : children}
    </a>
  );
}