import { CreditCard, Landmark, LockKeyhole, Sparkles } from "lucide-react";
import { PaymentTypeSelector } from "@/components/payment-type-selector";
import { PublicShell } from "@/components/public-shell";
import { SubmitButton } from "@/components/submit-button";
import { UrlToast } from "@/components/url-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TestPayPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await searchParams;
  const channels = await prisma.channel.findMany({ where: { enabled: true }, include: { type: true }, orderBy: { id: "asc" } });

  return (
    <PublicShell>
      <section className="relative isolate h-full w-full overflow-hidden px-4 py-4 md:px-8 lg:px-12">
        <UrlToast errorMessages={{ "1": "测试支付发起失败。" }} defaultError="测试支付发起失败。" />

        <div className="grid h-full w-full items-center gap-4 lg:grid-cols-[.86fr_1.14fr]">
          <div className="fade-up hidden min-h-0 flex-col justify-center text-center lg:flex lg:text-left">
            <Badge variant="secondary" className="w-fit rounded-full border border-border/60 bg-background/60 px-4 py-1.5 backdrop-blur">
              <Sparkles className="mr-1 size-3.5 text-primary" />
              Sandbox checkout
            </Badge>
            <h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-tight tracking-tight xl:text-6xl">
              <span className="text-gradient">发起一笔优雅的测试支付</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              模拟真实商户请求，自动签名并进入兼容 `/submit.php` 的收银流程。
            </p>
            <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
              <MiniStep icon={<LockKeyhole />} label="签名" text="自动生成" />
              <MiniStep icon={<CreditCard />} label="下单" text="创建订单" />
              <MiniStep icon={<Landmark />} label="支付" text="进入通道" />
            </div>
          </div>

          <div className="relative mx-auto flex h-full w-full max-w-2xl items-center">
            <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-8 bottom-8 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
            <Card className="washi-strong relative w-full overflow-hidden rounded-[2rem] ring-glow">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="rounded-[1.5rem] border border-border/60 bg-background/45 p-4 backdrop-blur sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-primary sm:text-xs">Test Order</p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">测试订单</h2>
                    </div>
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm sm:size-12">
                      <CreditCard className="size-6" />
                    </span>
                  </div>

                  <form className="grid gap-3 sm:gap-4" method="post" action="/api/test-pay">
                    <div className="grid gap-1.5">
                      <Label htmlFor="name">商品名称</Label>
                      <Input id="name" name="name" defaultValue="测试商品" className="h-11 rounded-2xl bg-background/70" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="money">支付金额</Label>
                      <Input id="money" name="money" defaultValue="0.01" inputMode="decimal" className="h-12 rounded-2xl bg-background/70 text-2xl font-semibold" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>支付通道</Label>
                      <PaymentTypeSelector
                        defaultValue={channels[0]?.type.code || "cashier"}
                        options={[
                          { value: "cashier", label: "收银台选择", description: "进入订单页再选择" },
                          ...channels.map((channel) => ({
                            value: channel.type.code,
                            label: channel.type.code === "alipay" || channel.type.code === "wxpay" ? undefined : channel.name,
                            description: channel.name,
                          })),
                        ]}
                      />
                    </div>
                    <SubmitButton size="lg" className="mt-1 h-12 w-full rounded-full" pendingText="发起中...">发起支付测试</SubmitButton>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function MiniStep({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="washi rounded-3xl p-4 text-left">
      <div className="mb-3 grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-5">{icon}</div>
      <div className="font-semibold">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{text}</div>
    </div>
  );
}