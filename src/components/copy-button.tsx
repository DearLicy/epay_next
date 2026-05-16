"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label = "复制", iconOnly = false }: { value: string; label?: string; iconOnly?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  return (
    <Button
      type="button"
      size={iconOnly ? "icon" : "sm"}
      variant="outline"
      className={iconOnly ? "size-9 shrink-0" : undefined}
      loading={copying}
      disabled={copying}
      onClick={async () => {
        setCopying(true);
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("已复制到剪贴板");
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          toast.error("复制失败，请手动复制");
        } finally {
          setCopying(false);
        }
      }}
    >
      {copied ? <Check className="size-4" /> : !copying ? <Copy className="size-4" /> : null}
      {!iconOnly ? (copied ? "已复制" : label) : <span className="sr-only">{copied ? "已复制" : label}</span>}
    </Button>
  );
}