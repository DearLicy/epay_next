"use client";

import Image from "next/image";
import { useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PaymentQr({ src, compact = false }: { src: string; compact?: boolean }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const loading = imageLoading || refreshing;

  return (
    <div className={cn("grid", compact ? "gap-2" : "gap-3")}>
      <div className={cn("relative mx-auto rounded-2xl border bg-background shadow-sm", compact ? "p-2" : "p-4")}>
        {loading ? (
          <div className="absolute inset-4 z-10 grid place-items-center rounded-xl bg-background/80 backdrop-blur-sm">
            <LoaderCircle className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        {imageError ? (
          <div className="absolute inset-4 z-20 grid place-items-center rounded-xl bg-background/90 p-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
            二维码加载失败，请刷新重试。
          </div>
        ) : null}
        <Image
          src={src}
          alt="支付二维码"
          width={compact ? 230 : 300}
          height={compact ? 230 : 300}
          unoptimized
          className={cn("rounded-xl transition-opacity", loading && "opacity-30", imageError && "opacity-20")}
          onLoad={() => {
            setImageLoading(false);
            setImageError(false);
          }}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
            toast.error("二维码加载失败，请刷新重试");
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        className={cn("mx-auto", compact && "h-8 rounded-full px-3 text-xs")}
        loading={refreshing}
        disabled={refreshing}
        onClick={() => {
          setImageError(false);
          setImageLoading(true);
          setRefreshing(true);
          toast.info("正在刷新二维码...");
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      >
        {!refreshing ? <RefreshCw className="size-4" /> : null}
        刷新二维码
      </Button>
    </div>
  );
}