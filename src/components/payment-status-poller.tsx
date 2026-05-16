"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FROZEN" | "CLOSED";

type StatusPayload = {
  code: number;
  msg: string;
  trade_no?: string;
  status?: PaymentStatus;
  status_text?: string;
  provider_state?: string;
  paid_at?: string | null;
  expires_at?: string;
  return_url?: string | null;
};

const terminalStatuses = new Set<PaymentStatus>(["PAID", "REFUNDED", "FROZEN", "CLOSED"]);

export function PaymentStatusPoller({
  tradeNo,
  initialStatus,
  initialStatusText,
}: {
  tradeNo: string;
  initialStatus: PaymentStatus;
  initialStatusText: string;
}) {
  const [status, setStatus] = useState<PaymentStatus>(initialStatus);
  const [statusText, setStatusText] = useState(initialStatusText);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [providerState, setProviderState] = useState<string | null>(null);
  const [checking, setChecking] = useState(initialStatus === "PENDING");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const successHandledRef = useRef(initialStatus === "PAID");

  const checkStatus = useCallback(async () => {
    try {
      setChecking(true);
      const response = await fetch(`/api/pay/status/${encodeURIComponent(tradeNo)}`, { cache: "no-store" });
      const data = (await response.json()) as StatusPayload;
      if (!response.ok || data.code !== 1 || !data.status) throw new Error(data.msg || "状态查询失败");

      setStatus(data.status);
      setStatusText(data.status_text || data.status);
      setProviderState(data.provider_state || null);
      setReturnUrl(data.return_url || null);
      setLastCheckedAt(new Date());

      if (data.status === "PAID" && !successHandledRef.current) {
        successHandledRef.current = true;
        toast.success("支付成功，订单状态已更新");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "状态查询失败";
      toast.error(message);
    } finally {
      setChecking(false);
    }
  }, [tradeNo]);

  useEffect(() => {
    if (terminalStatuses.has(status)) return;

    void checkStatus();
    const timer = window.setInterval(() => {
      void checkStatus();
    }, 2500);

    return () => window.clearInterval(timer);
  }, [status, tradeNo, checkStatus]);

  const paid = status === "PAID";
  const closed = status === "CLOSED" || status === "REFUNDED" || status === "FROZEN";
  const waitingTitle = providerState ? providerStatusTitle(providerState) : "等待扫码或确认支付";
  const waitingDescription = providerState ? providerStatusDescription(providerState) : "页面会每 2.5 秒自动检测订单状态；扫码后请在支付 App 内完成确认。";

  return (
    <div
      className={cn(
        "mt-3 rounded-2xl border p-3 text-left text-sm backdrop-blur sm:mt-4",
        paid && "border-emerald-200 bg-emerald-50/85 text-emerald-950",
        closed && "border-destructive/20 bg-destructive/10 text-destructive",
        !paid && !closed && "border-border/70 bg-background/60 text-foreground",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
            paid && "bg-emerald-500 text-white",
            closed && "bg-destructive text-destructive-foreground",
            !paid && !closed && "bg-[rgb(var(--pay-primary-rgb)/.12)] text-[var(--pay-primary)]",
          )}
        >
          {paid ? <CheckCircle2 className="size-5" /> : closed ? <XCircle className="size-5" /> : checking ? <LoaderCircle className="size-5 animate-spin" /> : <Clock3 className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{paid ? "支付成功" : closed ? statusText : waitingTitle}</p>
            <span className="text-xs opacity-70">{checking ? "检测中" : lastCheckedAt ? `更新于 ${lastCheckedAt.toLocaleTimeString("zh-CN")}` : "等待检测"}</span>
          </div>
          <p className="mt-1 text-xs leading-5 opacity-75">
            {paid
              ? "平台已收到支付回调，订单状态已更新为已支付。"
              : closed
                ? "该订单当前不可继续支付，请返回重新发起订单。"
                : waitingDescription}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {returnUrl ? (
              <Button size="sm" className="h-8 rounded-full" onClick={() => { window.location.href = returnUrl; }}>
                返回商户
              </Button>
            ) : null}
            {!paid ? (
              <Button size="sm" variant="outline" className="h-8 rounded-full bg-background/60" loading={checking} onClick={() => void checkStatus()}>
                {!checking ? <RotateCcw className="size-3.5" /> : null}
                手动检测
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function providerStatusTitle(state: string) {
  if (state === "WAIT_BUYER_PAY") return "二维码已生成，等待扫码";
  if (state === "USERPAYING") return "已扫码，等待确认支付";
  if (state === "NOTPAY") return "等待扫码支付";
  if (state === "ACCEPT") return "支付请求已受理";
  return "等待扫码或确认支付";
}

function providerStatusDescription(state: string) {
  if (state === "WAIT_BUYER_PAY") return "支付通道仍在等待买家扫码或打开支付链接。";
  if (state === "USERPAYING") return "用户已进入支付流程，请在支付 App 内完成确认。";
  if (state === "NOTPAY") return "微信侧显示订单未支付，请继续扫码完成付款。";
  if (state === "ACCEPT") return "微信侧已受理支付请求，系统会继续自动检测最终结果。";
  return `三方状态：${state}，系统会继续自动检测最终结果。`;
}