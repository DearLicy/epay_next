"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
    loadingText?: ReactNode;
    showSpinner?: boolean;
  };

export function LoadingLink({ children, className, onClick, href, loadingText, showSpinner = true, ...props }: LoadingLinkProps) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const target = typeof href === "string" ? href : href.pathname || "";
  const samePath = target === pathname;

  return (
    <Link
      {...props}
      href={href}
      aria-busy={pending || undefined}
      data-pending={pending ? "true" : undefined}
      className={cn("relative", pending && "pointer-events-none opacity-75", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !samePath) {
          setPending(true);
        }
      }}
    >
      {pending && showSpinner ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {pending && loadingText ? loadingText : children}
    </Link>
  );
}