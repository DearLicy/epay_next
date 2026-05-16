import type { ReactNode } from "react";
import { Activity, KeyRound, ReceiptText, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { UrlToast } from "@/components/url-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { closeExpiredOrders } from "@/lib/epay/order-status";
import { appUrl } from "@/lib/epay/config";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; reset?: string }> }) {
  await requireAdmin();
  const { reset } = await searchParams;
  await closeExpiredOrders();
  const [orders, paidOrders, pendingOrders, merchant] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.merchant.findUnique({ where: { id: 1000 } }),
  ]);

  const paidMoney = paidOrders.reduce((sum, order) => sum + Number(order.money), 0);
  const successRate = orders > 0 ? Math.round((paidOrders.length / orders) * 100) : 0;
  const merchantName = merchant?.name || "默认商户";
  const apiUrl = appUrl();
  const pid = String(merchant?.id || 1000);
  const apiKey = merchant?.apiKey || "";

  return (
    <AdminShell title="控制台" description="单商户收款系统的实时运行概览。">
      <UrlToast
        successParam={["saved", "success"]}
        successMessages={{
          "1": reset ? "商户 KEY 已重新生成，请同步更新商户系统。" : "保存成功。",
          login: "登录成功。",
          merchant: "默认商户名称已保存。",
          reset_key: "商户 KEY 已重新生成，请同步更新商户系统。",
        }}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ReceiptText />} label="订单总数" value={String(orders)} hint="平台累计订单" />
        <Metric icon={<TrendingUp />} label="已支付金额" value={`¥ ${paidMoney.toFixed(2)}`} hint={`${paidOrders.length} 笔成功订单`} />
        <Metric icon={<Activity />} label="待支付订单" value={String(pendingOrders)} hint="等待用户完成支付" />
        <Metric icon={<Activity />} label="成功率" value={`${successRate}%`} hint="按当前订单总量计算" />
      </section>

      <Card className="washi-strong overflow-hidden rounded-3xl">
        <CardHeader className="border-b border-border/60 bg-muted/30 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><KeyRound className="size-5" />默认商户</CardTitle>
              <CardDescription>按名称、接口地址、商户 PID、KEY 的顺序展示，地址、PID、KEY 均可复制。</CardDescription>
            </div>
            <Badge variant={merchant?.status ? "default" : "secondary"}>{merchant?.status ? "正常" : "停用"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-5">
          <form method="post" action="/api/admin/settings" className="grid gap-4 rounded-2xl border border-border/60 bg-muted/25 p-4 backdrop-blur md:grid-cols-[1fr_auto] md:items-end">
            <input type="hidden" name="merchant_key" value={apiKey} />
            <input type="hidden" name="redirect_to" value="/admin" />
            <div className="grid gap-2">
              <Label htmlFor="merchant_name">默认商户名称</Label>
              <Input id="merchant_name" name="merchant_name" defaultValue={merchantName} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitButton name="action" value="update_merchant" variant="outline" pendingText="保存中...">
                保存名称
              </SubmitButton>
              <SubmitButton name="action" value="reset_key" variant="destructive" pendingText="重置中...">
                重置 KEY
              </SubmitButton>
            </div>
          </form>

          <div className="grid gap-4">
            <Info label="接口地址" value={apiUrl} />
            <Info label="商户 PID" value={pid} />
            <Info label="商户 KEY" value={apiKey} mono />
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}

function Metric({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card className="washi overflow-hidden rounded-3xl transition-transform hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={value || "-"} readOnly className={mono ? "font-mono text-xs" : undefined} />
        {value ? <CopyButton value={value} iconOnly /> : null}
      </div>
    </div>
  );
}