import { Badge } from "@/components/ui/badge";
import { OrderActionConfirm } from "@/components/order-action-confirm";
import { UrlToast } from "@/components/url-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { closeExpiredOrders, getOrderStatusText } from "@/lib/epay/order-status";
import { moneyToString } from "@/lib/epay/utils";

export const dynamic = "force-dynamic";

const savedMessages: Record<string, string> = {
  paid: "补单成功，已按已支付订单触发商户通知。",
  refunded: "退款状态已更新。",
  notified: "重新通知已执行。",
};

const errorMessages: Record<string, string> = {
  missing_trade_no: "订单号不能为空。",
  order_not_found: "订单不存在。",
  refund_status: "当前订单状态不支持退款。",
  refund_failed: "官方退款接口调用失败，请检查通道证书、商户号和平台返回信息。",
  unknown_action: "未知操作。",
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  await searchParams;
  await closeExpiredOrders();
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { channel: true } });

  return (
    <AdminShell title="订单管理" description="最近 100 笔订单，支持补单、退款和重新通知。">
      <UrlToast successMessages={savedMessages} errorMessages={errorMessages} defaultSuccess="操作成功。" defaultError="操作失败。" />

      <Card className="washi-strong overflow-hidden rounded-3xl">
        <CardHeader className="border-b border-border/60 bg-muted/30 backdrop-blur">
          <CardTitle>订单列表</CardTitle>
          <CardDescription>补单会将待支付订单置为已支付，并触发商户异步通知。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/25 hover:bg-muted/25">
                  <TableHead>平台订单号</TableHead>
                  <TableHead>商户订单号</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>方式</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.tradeNo}>
                    <TableCell className="font-mono text-xs">{order.tradeNo}</TableCell>
                    <TableCell className="font-mono text-xs">{order.outTradeNo}</TableCell>
                    <TableCell className="min-w-44 font-medium">{order.name}</TableCell>
                    <TableCell>¥ {moneyToString(order.money)}</TableCell>
                    <TableCell>{order.channel?.name || order.typeCode || "-"}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="min-w-40 text-muted-foreground">{order.createdAt.toLocaleString("zh-CN")}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <OrderActionConfirm
                          tradeNo={order.tradeNo}
                          action="mark_paid"
                          label="补单"
                          title="确认补单"
                          description="补单会把当前待支付订单置为已支付，并立即触发商户异步通知。"
                          confirmText="确认补单"
                          disabled={order.status !== "PENDING"}
                        />
                        <OrderActionConfirm
                          tradeNo={order.tradeNo}
                          action="refund"
                          label="退款"
                          title="确认退款"
                          description="退款会调用当前订单对应通道的官方退款接口，成功后订单状态会更新为已退款。"
                          confirmText="确认退款"
                          disabled={order.status !== "PAID"}
                          destructive
                        />
                        <OrderActionConfirm
                          tradeNo={order.tradeNo}
                          action="notify"
                          label="通知"
                          title="确认重新通知"
                          description="系统会重新向商户 notify_url 发送一次已支付通知，并记录通知结果。"
                          confirmText="重新通知"
                          disabled={order.status !== "PAID"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">暂无订单</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "PAID" ? "default" : status === "PENDING" ? "secondary" : "outline";
  return <Badge variant={variant}>{getOrderStatusText(status)}</Badge>;
}
