"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type CodeInputProps = Omit<ComponentProps<typeof Input>, "maxLength" | "inputMode"> & {
  maxLength?: number;
  mode: "digits" | "uppercase";
};

export function CodeInput({ mode, maxLength, onChange, ...props }: CodeInputProps) {
  return (
    <Input
      {...props}
      inputMode={mode === "digits" ? "numeric" : "text"}
      maxLength={maxLength}
      onChange={(event) => {
        const nextValue = mode === "digits" ? event.target.value.replace(/\D/g, "").slice(0, maxLength) : event.target.value.toUpperCase();
        event.target.value = nextValue;
        onChange?.(event);
      }}
    />
  );
}