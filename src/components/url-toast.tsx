"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type ToastMessage = string | { title: string; description?: string };

export function UrlToast({
  successParam = "saved",
  errorParam = "error",
  successMessages = {},
  errorMessages = {},
  defaultSuccess = "操作已完成。",
  defaultError = "操作失败。",
}: {
  successParam?: string | string[];
  errorParam?: string | string[];
  successMessages?: Record<string, ToastMessage>;
  errorMessages?: Record<string, ToastMessage>;
  defaultSuccess?: string;
  defaultError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const successKeys = Array.isArray(successParam) ? successParam : [successParam];
    const errorKeys = Array.isArray(errorParam) ? errorParam : [errorParam];
    const successValue = firstParamValue(searchParams, successKeys);
    const errorValue = firstParamValue(searchParams, errorKeys);
    if (!successValue && !errorValue) return;

    if (successValue) showToast(successMessages[successValue] || defaultSuccess, "success");
    if (errorValue) showToast(errorMessages[errorValue] || defaultError, "error");

    const next = new URLSearchParams(searchParams);
    for (const key of successKeys) next.delete(key);
    for (const key of errorKeys) next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [defaultError, defaultSuccess, errorMessages, errorParam, pathname, router, searchParams, successMessages, successParam]);

  return null;
}

function firstParamValue(searchParams: { get: (key: string) => string | null }, keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) return value;
  }
  return null;
}

function showToast(message: ToastMessage, type: "success" | "error") {
  if (typeof message === "string") {
    toast[type](message);
    return;
  }
  toast[type](message.title, { description: message.description });
}