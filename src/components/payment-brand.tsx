import { cn } from "@/lib/utils";

type PaymentBrand = "alipay" | "wxpay" | string | null | undefined;

export function paymentBrandName(code: PaymentBrand) {
  if (code === "wxpay") return "微信支付";
  if (code === "alipay") return "支付宝";
  return "收银台";
}

export function paymentBrandTone(code: PaymentBrand) {
  if (code === "wxpay") return "border-[#07c160]/30 bg-[#07c160]/10 text-[#07c160]";
  if (code === "alipay") return "border-[#1677ff]/30 bg-[#1677ff]/10 text-[#1677ff]";
  return "border-primary/30 bg-primary/10 text-primary";
}

export function PaymentBrandIcon({ code, className }: { code: PaymentBrand; className?: string }) {
  const isWechat = code === "wxpay";
  const isAlipay = code === "alipay";

  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-2xl border text-base font-black shadow-sm",
        paymentBrandTone(code),
        className,
      )}
    >
      {isWechat ? <WechatGlyph /> : isAlipay ? <AlipayGlyph /> : "付"}
    </span>
  );
}

function AlipayGlyph() {
  return <span className="text-[20px] leading-none">支</span>;
}

function WechatGlyph() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="size-6 fill-current">
      <path d="M12.2 6.1c-5 0-9 3.1-9 7 0 2.2 1.3 4.1 3.4 5.4l-.7 2.5 2.9-1.5c1 .3 2.1.5 3.4.5 5 0 9-3.1 9-7s-4-6.9-9-6.9Zm-3.1 5.5a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm6.2 0a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z" />
      <path d="M23.7 14.4c.7.9 1.1 2 1.1 3.1 0 1.8-1 3.5-2.7 4.6l.5 2-2.3-1.2c-.8.2-1.6.3-2.5.3-2.8 0-5.2-1.1-6.6-2.8h1c5.9 0 10.8-3.7 11.5-8.4.1.8.1 1.6 0 2.4Z" opacity=".78" />
    </svg>
  );
}