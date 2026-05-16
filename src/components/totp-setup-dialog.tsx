"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function TotpSetupDialog({ enabled, secret }: { enabled: boolean; secret: string }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(enabled);
  const [pending, setPending] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");

  async function startSetup(nextChecked: boolean) {
    if (!nextChecked) {
      setChecked(false);
      return;
    }
    if (enabled) {
      setChecked(true);
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/admin/totp/setup", { method: "GET" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成 F2A 密钥失败");
      setSetup(data);
      setOpen(true);
    } catch (event) {
      const message = event instanceof Error ? event.message : "生成 F2A 密钥失败";
      toast.error(message);
      setChecked(false);
    } finally {
      setPending(false);
    }
  }

  async function verifySetup() {
    if (!setup) return;
    setPending(true);
    try {
      const response = await fetch("/api/admin/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: setup.secret, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "验证码校验失败");
      setChecked(true);
      setOpen(false);
      toast.success("F2A 已开启");
      window.location.href = "/admin/settings?success=settings";
    } catch (event) {
      const message = event instanceof Error ? event.message : "验证码校验失败";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
        <div>
          <Label className="text-sm font-medium">开启 F2A 登录</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            {enabled && secret ? `已绑定密钥：${secret.slice(0, 4)}••••${secret.slice(-4)}` : "首次开启必须扫码并输入动态验证码验证。"}
          </p>
        </div>
        <Switch checked={checked} disabled={pending || enabled} onCheckedChange={startSetup} />
      </div>
      {enabled ? <input type="hidden" name="totp_enabled" value="on" /> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>开启 F2A 登录</DialogTitle>
            <DialogDescription>使用认证器扫描二维码，输入当前 6 位验证码。验证通过后才会保存 32 位原始密钥。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex justify-center rounded-xl border bg-muted/40 p-4">
              {setup?.qr ? <Image src={setup.qr} alt="F2A 二维码" width={180} height={180} className="size-44" /> : null}
            </div>
            <div className="grid gap-2">
              <Label>32 位原始密钥</Label>
              <Input value={setup?.secret || ""} readOnly className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="totp_verify_code">动态验证码</Label>
              <Input id="totp_verify_code" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" />
            </div>
                </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>取消</Button>
            <Button type="button" onClick={verifySetup} loading={pending} loadingText="验证中..." disabled={!code}>
              确定验证
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}