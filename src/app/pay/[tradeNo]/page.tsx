import QRCode from "qrcode";
import { ExternalLink, QrCode, ReceiptText, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingAnchor } from "@/components/loading-anchor";
import { PaymentQr } from "@/components/payment-qr";
import { PaymentStatusPoller } from "@/components/payment-status-poller";
import { PublicShell } from "@/components/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { closeExpiredOrder, getOrderExpiresAt, getOrderStatusText } from "@/lib/epay/order-status";
import { moneyToString } from "@/lib/epay/utils";

export const dynamic = "force-dynamic";

const paymentThemes = {
  alipay: {
    name: "支付宝",
    appHint: "请使用支付宝 App 扫描二维码完成支付。",
    badge: "Alipay secure checkout",
    qrTone: "text-[#1677ff]",
    accent: "[--pay-primary:#1677ff] [--pay-primary-rgb:22_119_255] [--pay-secondary:#69b1ff]",
    button: "bg-[#1677ff] text-white hover:bg-[#0958d9]",
  },
  wxpay: {
    name: "微信支付",
    appHint: "请使用微信 App 扫描二维码完成支付。",
    badge: "WeChat Pay secure checkout",
    qrTone: "text-[#07c160]",
    accent: "[--pay-primary:#07c160] [--pay-primary-rgb:7_193_96] [--pay-secondary:#95de64]",
    button: "bg-[#07c160] text-white hover:bg-[#05a955]",
  },
} as const;

type PaymentType = keyof typeof paymentThemes;

export default async function PayPage({ params }: { params: Promise<{ tradeNo: string }> }) {
  const { tradeNo } = await params;
  const found = await prisma.order.findUnique({ where: { tradeNo } });

  if (!found) {
    return <PublicShell><section className="grid h-full place-items-center px-4"><Card className="washi rounded-3xl"><CardContent className="p-8 text-center">订单不存在</CardContent></Card></section></PublicShell>;
  }

  const order = await closeExpiredOrder(found);
  const paymentType: PaymentType = order.typeCode === "wxpay" ? "wxpay" : "alipay";
  const theme = paymentThemes[paymentType];
  const canPay = order.status === "PENDING";
  const statusText = getOrderStatusText(order.status);
  const expiresAt = await getOrderExpiresAt(order.createdAt);
  const qrText = canPay ? resolveQrText(order, tradeNo) : null;
  const qrDataUrl = qrText ? await QRCode.toDataURL(qrText, { margin: 1, width: 260 }) : null;

  return (
    <PublicShell>
      <section className={`relative isolate h-full w-full overflow-hidden px-4 py-4 md:px-8 lg:px-12 ${theme.accent}`}>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgb(var(--pay-primary-rgb)/.22),transparent_35%),radial-gradient(circle_at_82%_18%,color-mix(in_oklch,var(--pay-secondary)_22%,transparent),transparent_34%),radial-gradient(circle_at_52%_92%,rgb(var(--pay-primary-rgb)/.12),transparent_40%)]" />

        <div className="grid h-full w-full items-center gap-4 lg:grid-cols-[.86fr_1.14fr]">
          <div className="fade-up hidden min-h-0 flex-col justify-center text-center lg:flex lg:text-left">
            <Badge variant="secondary" className="w-fit rounded-full border border-border/60 bg-background/60 px-4 py-1.5 backdrop-blur">
              <Sparkles className={`mr-1 size-3.5 ${theme.qrTone}`} />
              {theme.badge}
            </Badge>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight tracking-tight xl:text-6xl">
              <span className={theme.qrTone}>{theme.name}</span>
              <span className="block">扫码完成这笔收款</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              {theme.appHint}支付完成后，系统会自动更新订单状态并通知商户回调地址。
            </p>
            <div className="mt-7 grid max-w-xl grid-cols-2 gap-3">
              <InfoCard icon={<ReceiptText />} label="商品名称" value={order.name} tone={theme.qrTone} />
              <InfoCard icon={<ShieldCheck />} label="订单状态" value={statusText} tone={theme.qrTone} />
            </div>
          </div>

          <div className="relative mx-auto flex h-full w-full max-w-2xl items-center">
            <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-[rgb(var(--pay-primary-rgb)/.16)] blur-3xl" />
            <div className="absolute -right-8 bottom-8 h-44 w-44 rounded-full bg-[rgb(var(--pay-primary-rgb)/.12)] blur-3xl" />
            <Card className="washi-strong relative w-full overflow-hidden rounded-[2rem] ring-glow">
              <CardContent className="p-3 sm:p-5 md:p-6">
                <div className="rounded-[1.5rem] border border-border/60 bg-background/45 p-3 text-center backdrop-blur sm:p-5">
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="min-w-0">
                      <p className={`text-[10px] font-medium uppercase tracking-[0.24em] sm:text-xs ${theme.qrTone}`}>{theme.name} Amount</p>
                      <div className="mt-1 text-4xl font-semibold tracking-tight sm:text-6xl">¥ {moneyToString(order.money)}</div>
                      <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{order.name}</p>
                    </div>
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--pay-primary)] text-white shadow-sm sm:size-14">
                      <QrCode className="size-6 sm:size-7" />
                    </div>
                  </div>

                  <div className="mx-auto mt-3 w-fit rounded-[1.5rem] border border-border/70 bg-white/85 p-2 shadow-sm backdrop-blur sm:mt-5 sm:rounded-[2rem] sm:p-3">
                    {qrDataUrl ? (
                      <PaymentQr src={qrDataUrl} compact />
                    ) : (
                      <div className="grid size-[230px] place-items-center rounded-2xl border border-dashed border-border bg-background/70 p-5 text-center text-sm text-muted-foreground sm:size-[270px]">
                        当前订单没有真实的三方支付链接。请重新发起支付，或检查通道下单接口返回值。
                      </div>
                    )}
                  </div>

                  <PaymentStatusPoller tradeNo={order.tradeNo} initialStatus={order.status} initialStatusText={statusText} />

                  <div className="mt-3 grid gap-1 text-[11px] text-muted-foreground sm:mt-4 sm:text-xs">
                    <span className="truncate">商户订单号：{order.outTradeNo}</span>
                    <span className="truncate">平台订单号：{order.tradeNo}</span>
                    <span className="truncate">有效期至：{expiresAt.toLocaleString("zh-CN")}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                    {qrText ? (
                      <LoadingAnchor
                        href={qrText}
                        className={buttonVariants({
                          size: "sm",
                          className: `rounded-full sm:h-11 ${theme.button}`,
                        })}
                      >
                        <ExternalLink className="size-4" />
                        打开支付
                      </LoadingAnchor>
                    ) : (
                      <Button size="sm" disabled className="rounded-full sm:h-11">
                        <ExternalLink className="size-4" />
                        暂无链接
                      </Button>
                    )}
                    <LoadingAnchor
                      href={`/pay/${order.tradeNo}`}
                      className={buttonVariants({
                        size: "sm",
                        variant: "outline",
                        className: "rounded-full bg-background/60 sm:h-11",
                      })}
                    >
                      <RefreshCw className="size-4" />
                      刷新
                    </LoadingAnchor>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function resolveQrText(order: { qrCode: string | null; payUrl: string | null; urlScheme: string | null }, tradeNo: string) {
  return [order.qrCode, order.payUrl, order.urlScheme].find((value) => value && !isInternalPayUrl(value, tradeNo)) || null;
}

function isInternalPayUrl(value: string, tradeNo: string) {
  try {
    const url = new URL(value);
    return url.pathname === `/pay/${tradeNo}`;
  } catch {
    return value.includes(`/pay/${tradeNo}`);
  }
}

function InfoCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="washi rounded-3xl p-4 text-left">
      <div className={`mb-3 grid size-10 place-items-center rounded-2xl bg-[rgb(var(--pay-primary-rgb)/.10)] ${tone} [&_svg]:size-5`}>{icon}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}