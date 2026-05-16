import { ArrowRight, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingAnchor } from "@/components/loading-anchor";
import { PaymentBrandIcon, paymentBrandName } from "@/components/payment-brand";
import { PublicShell } from "@/components/public-shell";
import { UrlToast } from "@/components/url-toast";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { closeExpiredOrder, getOrderExpiresAt, getOrderStatusText } from "@/lib/epay/order-status";
import { moneyToString } from "@/lib/epay/utils";

export const dynamic = "force-dynamic";

export default async function CashierPage({ params }: { params: Promise<{ tradeNo: string }> }) {
  const { tradeNo } = await params;
  const found = await prisma.order.findUnique({ where: { tradeNo } });
  const channels = await prisma.channel.findMany({ where: { enabled: true }, include: { type: true }, orderBy: { id: "asc" } });

  if (!found) {
    return <PublicShell><section className="grid h-full place-items-center px-4"><Card className="washi rounded-3xl"><CardContent className="p-8 text-center">订单不存在</CardContent></Card></section></PublicShell>;
  }

  const order = await closeExpiredOrder(found);
  const expiresAt = await getOrderExpiresAt(order.createdAt);
  const canPay = order.status === "PENDING";
  const statusText = getOrderStatusText(order.status);

  return (
    <PublicShell>
      <UrlToast errorMessages={{ default: "支付发起失败。" }} defaultError="支付发起失败。" />
      <section className="relative isolate h-full w-full overflow-hidden px-4 py-4 md:px-8 lg:px-12">
        <div className="grid h-full w-full items-center gap-4 lg:grid-cols-[.92fr_1.08fr]">
          <div className="fade-up hidden min-h-0 flex-col justify-center text-center lg:flex lg:text-left">
            <Badge variant="secondary" className="w-fit rounded-full border border-border/60 bg-background/60 px-4 py-1.5 backdrop-blur">
              <Sparkles className="mr-1 size-3.5 text-primary" />
              Secure cashier
            </Badge>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight tracking-tight xl:text-6xl">
              <span className="text-gradient">确认订单并选择支付方式</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              订单已通过商户签名校验。核对金额与商品信息后选择可用通道完成付款。
            </p>
            <div className="mt-7 grid max-w-2xl grid-cols-3 gap-3">
              <InfoPill label="平台订单" value={order.tradeNo} />
              <InfoPill label="商户订单" value={order.outTradeNo} />
              <InfoPill label="订单状态" value={statusText} />
            </div>
          </div>

          <div className="relative mx-auto flex h-full w-full max-w-2xl items-center">
            <div className="absolute -left-8 top-8 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-10 bottom-10 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
            <Card className="washi-strong relative w-full overflow-hidden rounded-[2rem] ring-glow">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="rounded-[1.5rem] border border-border/60 bg-background/45 p-4 backdrop-blur sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-primary sm:text-xs">Order summary</p>
                      <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{order.name}</h2>
                    </div>
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm sm:size-12">
                      <ReceiptText className="size-6" />
                    </span>
                  </div>

                  <div className="mt-4 rounded-[1.35rem] border border-border/60 bg-background/55 p-4 backdrop-blur sm:p-5">
                    <p className="text-sm text-muted-foreground">应付金额</p>
                    <div className="mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">¥ {moneyToString(order.money)}</div>
                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:text-sm">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      <span>支付完成后自动通知商户系统</span>
                    </div>
                    <span>有效期至：{expiresAt.toLocaleString("zh-CN")}</span>
                  </div>
                  </div>

                  <div className="mt-4 grid max-h-[34svh] gap-2 overflow-hidden sm:max-h-none sm:gap-3">
                    {canPay ? channels.slice(0, 4).map((channel) => (
                      <LoadingAnchor
                        key={channel.id}
                        href={`/pay/start/${order.tradeNo}?type=${channel.type.code}`}
                        className={buttonVariants({
                          size: "lg",
                          variant: "outline",
                          className:
                            "h-auto min-h-12 justify-between rounded-2xl border-border/70 bg-background/60 px-4 py-2.5 backdrop-blur hover:bg-primary/10 hover:text-primary sm:min-h-14 sm:py-3",
                        })}
                      >
                        <span className="flex min-w-0 items-center gap-3 text-left">
                          <PaymentBrandIcon code={channel.type.code} className="size-10 rounded-xl" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{paymentBrandName(channel.type.code)}</span>
                            <span className="block text-xs text-muted-foreground">{channel.name}</span>
                          </span>
                        </span>
                        <ArrowRight className="size-4" />
                      </LoadingAnchor>
                    )) : (
                      <Button size="lg" variant="outline" disabled className="h-auto min-h-12 justify-between rounded-2xl border-border/70 bg-background/60 px-4 py-2.5 sm:min-h-14 sm:py-3">
                        <span className="text-left">订单{statusText}，不可支付</span>
                      </Button>
                    )}
                    {canPay && channels.length === 0 ? <div className="rounded-2xl border border-border/70 bg-background/55 p-4 text-sm text-muted-foreground">暂无启用支付通道，请先到后台通道配置启用。</div> : null}
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="washi rounded-3xl p-4 text-left">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}