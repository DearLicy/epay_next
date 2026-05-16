"use client";

import Image from "next/image";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

export function CaptchaImage() {
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const src = `/api/admin/captcha?v=${version}`;

  return (
    <button
      type="button"
      className="relative h-9 overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-75"
      title="点击刷新验证码"
      aria-label="点击刷新验证码"
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={() => {
        setPending(true);
        setVersion((value) => value + 1);
      }}
    >
      {pending ? <span className="absolute inset-0 z-10 grid place-items-center bg-background/65"><LoaderCircle className="size-4 animate-spin" /></span> : null}
      <Image
        src={src}
        alt="验证码"
        width={104}
        height={36}
        unoptimized
        className="h-9 w-[104px] object-cover"
        onLoad={() => setPending(false)}
        onError={() => setPending(false)}
      />
    </button>
  );
}