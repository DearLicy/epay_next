"use client";

import { CheckCircle2 } from "lucide-react";
import { PaymentBrandIcon, paymentBrandName, paymentBrandTone } from "@/components/payment-brand";
import { cn } from "@/lib/utils";

type Option = {
  value: string;
  label?: string;
  description?: string;
};

export function PaymentTypeSelector({ name = "type", options, defaultValue }: { name?: string; options: Option[]; defaultValue?: string }) {
  const initial = defaultValue || options[0]?.value || "cashier";

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {options.map((option) => {
          const tone = paymentBrandTone(option.value);
          return (
            <label
              key={option.value}
              className="group relative cursor-pointer rounded-2xl border border-border/70 bg-background/58 p-3 text-left backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-background/80 hover:shadow-sm has-[:checked]:border-primary/55 has-[:checked]:ring-2 has-[:checked]:ring-primary/16 sm:p-4"
            >
              <input type="radio" name={name} value={option.value} defaultChecked={option.value === initial} className="peer sr-only" />
              <div className="flex items-center gap-3">
                <PaymentBrandIcon code={option.value} className="size-10 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{option.label || paymentBrandName(option.value)}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{option.description || "点击选择"}</div>
                </div>
              </div>
              <CheckCircle2 className={cn("absolute right-3 top-3 size-4 text-transparent transition peer-checked:text-primary", tone.includes("#07c160") && "peer-checked:text-[#07c160]", tone.includes("#1677ff") && "peer-checked:text-[#1677ff]")} />
            </label>
          );
        })}
      </div>
    </div>
  );
}