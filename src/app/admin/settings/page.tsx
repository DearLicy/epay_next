import { Save } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { FormSwitch } from "@/components/form-switch";
import { SubmitButton } from "@/components/submit-button";
import { TotpSetupDialog } from "@/components/totp-setup-dialog";
import { UrlToast } from "@/components/url-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/epay/config";

const DEFAULT_ADMIN_LOGIN_BG = "https://i3.wp.com/w.wallhaven.cc/full/8g/wallhaven-8grkpy.jpg";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  await searchParams;
  const configs = await prisma.config.findMany({ orderBy: { key: "asc" } });
  const configMap = Object.fromEntries(configs.map((config) => [config.key, config.value || ""]));
  const loginBg = configMap.admin_login_bg || DEFAULT_ADMIN_LOGIN_BG;
  const siteUrl = appUrl();

  return (
    <AdminShell title="系统设置" description="管理站点、登录安全、SMTP 和订单通知。">
      <UrlToast
        successParam={["saved", "success"]}
        successMessages={{
          "1": "系统设置已保存。",
          settings: "系统设置已保存。",
        }}
      />

      <form className="grid gap-6" method="post" action="/api/admin/settings">
        <Card className="washi-strong overflow-hidden rounded-3xl">
          <CardHeader className="border-b border-border/60 bg-muted/30 backdrop-blur">
            <CardTitle>基础配置</CardTitle>
            <CardDescription>站点、接口、金额限制和后台账号。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="sitename" label="站点名称" defaultValue={configMap.sitename} />
              <ReadOnlyField label="对接地址" value={siteUrl} note="来自 APP_URL" />
              <ReadOnlyField label="站点地址" value={siteUrl} note="来自 APP_URL" />
              <Field name="admin_login_bg" label="登录页背景 URL" defaultValue={loginBg} />
              <Field name="pay_minmoney" label="最小支付金额" defaultValue={configMap.pay_minmoney} />
              <Field name="pay_maxmoney" label="最大支付金额" defaultValue={configMap.pay_maxmoney} />
              <Field name="admin_user" label="后台账号" defaultValue={configMap.admin_user} />
              <Field name="admin_email" label="管理员邮箱" defaultValue={configMap.admin_email} type="email" />
              <div className="grid gap-2">
                <Label htmlFor="admin_password">新后台密码（留空不修改）</Label>
                <Input id="admin_password" name="admin_password" type="password" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="washi-strong overflow-hidden rounded-3xl">
          <CardHeader className="border-b border-border/60 bg-muted/30 backdrop-blur">
            <CardTitle>登录安全</CardTitle>
            <CardDescription>控制后台登录方式，可组合邮件验证码、2FA 和图形验证码。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <FormSwitch name="mail_login_enabled" label="开启邮件登录" defaultChecked={configMap.mail_login_enabled === "on"} />
              <FormSwitch name="mail_login_only" label="仅邮件登录" defaultChecked={configMap.mail_login_only === "on"} />
              <FormSwitch name="totp_login_only" label="仅 2FA 登录" defaultChecked={configMap.totp_login_only === "on"} />
              <FormSwitch name="login_captcha_enabled" label="登录图形验证码" defaultChecked={configMap.login_captcha_enabled === "on"} />
            </div>
            <TotpSetupDialog enabled={configMap.totp_enabled === "on"} secret={configMap.totp_secret || ""} />
          </CardContent>
        </Card>

        <Card className="washi-strong overflow-hidden rounded-3xl">
          <CardHeader className="border-b border-border/60 bg-muted/30 backdrop-blur">
            <CardTitle>SMTP 邮件</CardTitle>
            <CardDescription>用于邮件登录验证码和订单支付成功通知。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <FormSwitch name="smtp_enabled" label="启用 SMTP" defaultChecked={configMap.smtp_enabled === "on"} />
              <FormSwitch name="smtp_secure" label="SMTP SSL/TLS" defaultChecked={configMap.smtp_secure !== "false"} />
              <FormSwitch name="order_paid_email_enabled" label="订单支付成功邮件通知" defaultChecked={configMap.order_paid_email_enabled !== "off"} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="smtp_host" label="SMTP 主机" defaultValue={configMap.smtp_host} />
              <Field name="smtp_port" label="SMTP 端口" defaultValue={configMap.smtp_port || "465"} />
              <Field name="smtp_user" label="SMTP 账号" defaultValue={configMap.smtp_user} />
              <Field name="smtp_pass" label="SMTP 密码/授权码" defaultValue={configMap.smtp_pass} type="password" />
              <Field name="smtp_from" label="发件人" defaultValue={configMap.smtp_from} />
              <Field name="order_paid_email_to" label="订单通知收件人" defaultValue={configMap.order_paid_email_to} />
            </div>
          </CardContent>
        </Card>

        <Separator />
        <SubmitButton className="w-full sm:w-fit" name="action" value="save" pendingText="保存中...">
          <Save className="size-4" />
          保存设置
        </SubmitButton>
      </form>
    </AdminShell>
  );
}

function Field({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue?: string; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue || ""} type={type} />
    </div>
  );
}

function ReadOnlyField({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} readOnly />
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}