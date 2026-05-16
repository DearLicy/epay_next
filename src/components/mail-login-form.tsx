"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CaptchaImage } from "@/components/captcha-image";
import { CodeInput } from "@/components/code-input";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MailLoginForm({ captchaEnabled, totpEnabled }: { captchaEnabled: boolean; totpEnabled: boolean }) {
  const [sending, setSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const cooldownSeconds = useMemo(() => Math.max(0, Math.ceil((cooldownUntil - now) / 1000)), [cooldownUntil, now]);
  const disabled = sending || cooldownSeconds > 0;

  async function sendCode() {
    if (disabled) return;
    setSending(true);
    try {
      const response = await fetch("/api/admin/send-login-code", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        if (typeof payload.retryAfter === "number" && payload.retryAfter > 0) {
          setCooldownUntil(Date.now() + payload.retryAfter * 1000);
        }
        throw new Error(payload.message || "邮件验证码发送失败。");
      }
      setCooldownUntil(typeof payload.cooldownUntil === "number" ? payload.cooldownUntil : Date.now() + 60_000);
      toast.success(payload.message || "邮件验证码已发送。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "邮件验证码发送失败。");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="grid gap-3" method="post" action="/api/admin/login">
      <input type="hidden" name="mode" value="mail" />
      <div className="grid gap-1.5">
        <Label htmlFor="email_code" className="text-xs">邮件验证码</Label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <CodeInput id="email_code" name="email_code" mode="digits" autoComplete="one-time-code" className="h-9 text-sm" />
          <Button type="button" variant="outline" className="h-9 px-3 text-sm" loading={sending} disabled={disabled} onClick={sendCode}>
            {cooldownSeconds > 0 ? `${cooldownSeconds}s` : "获取验证码"}
          </Button>
        </div>
      </div>
      {totpEnabled ? <Field name="totp_code" label="2FA 动态口令" inputMode="numeric" maxLength={6} mode="digits" /> : null}
      {captchaEnabled ? <CaptchaField /> : null}
      <SubmitButton pendingText="登录中..." className="h-9 w-full text-sm">
        登录
      </SubmitButton>
    </form>
  );
}

function CaptchaField() {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="captcha" className="text-xs">图形验证码</Label>
      <div className="grid grid-cols-[1fr_104px] gap-2">
        <CodeInput id="captcha" name="captcha" mode="uppercase" autoComplete="off" className="h-9 text-sm" />
        <CaptchaImage />
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  inputMode,
  maxLength,
  mode,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  inputMode?: "numeric" | "decimal" | "text";
  maxLength?: number;
  mode?: "digits" | "uppercase";
}) {
  const inputProps = { id: name, name, type, defaultValue, className: "h-9 text-sm" };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      {mode ? (
        <CodeInput {...inputProps} mode={mode} maxLength={maxLength} />
      ) : (
        <Input {...inputProps} inputMode={inputMode} />
      )}
    </div>
  );
}