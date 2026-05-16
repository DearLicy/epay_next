"use client";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type OrderActionConfirmProps = {
  tradeNo: string;
  action: "mark_paid" | "refund" | "notify";
  label: string;
  title: string;
  description: string;
  confirmText?: string;
  disabled?: boolean;
  destructive?: boolean;
};

export function OrderActionConfirm({
  tradeNo,
  action,
  label,
  title,
  description,
  confirmText = "确认执行",
  disabled,
  destructive,
}: OrderActionConfirmProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant={destructive ? "destructive" : "outline"} disabled={disabled}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] rounded-3xl border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form method="post" action="/api/admin/orders" className="space-y-4">
          <input type="hidden" name="tradeNo" value={tradeNo} />
          <input type="hidden" name="action" value={action} />
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
            平台订单号：<span className="font-mono text-foreground">{tradeNo}</span>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </DialogClose>
            <SubmitButton variant={destructive ? "destructive" : "default"} pendingText="处理中...">
              {confirmText}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}