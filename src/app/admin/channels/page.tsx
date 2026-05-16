import { ChannelProvider } from "@prisma/client";
import { AdminShell } from "@/components/admin-shell";
import { FormSwitch } from "@/components/form-switch";
import { SubmitButton } from "@/components/submit-button";
import { UrlToast } from "@/components/url-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ChannelConfig = Record<string, unknown>;
type ChannelWithType = Awaited<ReturnType<typeof prisma.channel.findMany>>[number] & { type: { name: string; code: string } };

const productOptions = {
  ALIPAY: [
    { value: "qr", label: "当面付扫码" },
    { value: "pc", label: "电脑网站支付" },
    { value: "wap", label: "手机网站支付" },
  ],
  WECHAT: [
    { value: "native", label: "Native 扫码" },
    { value: "h5", label: "H5 支付" },
    { value: "jsapi", label: "JSAPI/公众号" },
    { value: "miniprogram", label: "小程序" },
    { value: "app", label: "APP" },
  ],
} as const;

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  await searchParams;
  const channels = await prisma.channel.findMany({ include: { type: true }, orderBy: { id: "asc" } });

  return (
    <AdminShell title="支付通道" description="维护官方通道产品和商户参数；是否可用只由“启用当前通道”控制。">
      <UrlToast successParam={["saved", "success"]} successMessages={{ "1": "通道配置已保存。" }} errorMessages={{ "1": "保存失败：参数错误。" }} defaultError="保存失败：参数错误。" />

      <section className="grid gap-6 xl:grid-cols-2">
        {channels.map((channel) => <ChannelForm key={channel.id} channel={channel} />)}
      </section>
    </AdminShell>
  );
}

function ChannelForm({ channel }: { channel: ChannelWithType }) {
  const config = (channel.config || {}) as ChannelConfig;
  const provider = channel.provider;
  const products = productOptions[provider];

  return (
    <Card className="washi-strong overflow-hidden rounded-3xl">
      <CardHeader className="border-b border-border/60 bg-muted/30 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{channel.name}</CardTitle>
            <CardDescription>{channel.type.name} / {provider} / #{channel.id}</CardDescription>
          </div>
          <Badge variant={channel.enabled ? "default" : "secondary"}>{channel.enabled ? "启用" : "停用"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <form className="grid gap-5" method="post" action="/api/admin/channels">
          <input type="hidden" name="id" value={channel.id} />
          <FormSwitch name="enabled" label="启用当前通道" defaultChecked={channel.enabled} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="通道名称" defaultValue={channel.name} />
            <div className="grid gap-2">
              <Label>支付产品</Label>
              <Select name="product" defaultValue={channel.product}>
                <SelectTrigger className="w-full"><SelectValue placeholder="选择支付产品" /></SelectTrigger>
                <SelectContent>{products.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          {provider === ChannelProvider.ALIPAY ? <AlipayFields config={config} /> : <WechatFields config={config} />}
          <SubmitButton className="w-full sm:w-fit" pendingText="保存中...">保存通道配置</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function AlipayFields({ config }: { config: ChannelConfig }) {
  return (
    <div className="grid gap-4">
      <Field name="appId" label="支付宝 App ID" defaultValue={String(config.appId || "")} />
      <TextField name="privateKey" label="应用私钥 privateKey" defaultValue={String(config.privateKey || "")} />
      <TextField name="alipayPublicKey" label="支付宝公钥 alipayPublicKey" defaultValue={String(config.alipayPublicKey || "")} />
      <p className="rounded-2xl border border-border/60 bg-muted/25 p-3 text-xs text-muted-foreground backdrop-blur">支付宝网关固定使用生产环境 https://openapi.alipay.com/gateway.do，无需手动配置。</p>
    </div>
  );
}

function WechatFields({ config }: { config: ChannelConfig }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="appId" label="微信 App ID" defaultValue={String(config.appId || "")} />
        <Field name="mchId" label="商户号 mchId" defaultValue={String(config.mchId || "")} />
        <Field name="apiV3Key" label="APIv3 密钥" defaultValue={String(config.apiV3Key || "")} />
        <Field name="merchantSerialNo" label="商户证书序列号" defaultValue={String(config.merchantSerialNo || "")} />
      </div>
      <TextField name="merchantPrivateKey" label="商户私钥 merchantPrivateKey" defaultValue={String(config.merchantPrivateKey || "")} />
      <TextField name="platformCertificate" label="平台证书 platformCertificate" defaultValue={String(config.platformCertificate || "")} />
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return <div className="grid gap-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} defaultValue={defaultValue || ""} /></div>;
}

function TextField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return <div className="grid gap-2"><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} defaultValue={defaultValue || ""} className="min-h-32 font-mono text-xs" /></div>;
}