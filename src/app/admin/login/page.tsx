import { redirect } from "next/navigation";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { CaptchaImage } from "@/components/captcha-image";
import { CodeInput } from "@/components/code-input";
import { MailLoginForm } from "@/components/mail-login-form";
import { LoadingLink } from "@/components/loading-link";
import { SubmitButton } from "@/components/submit-button";
import { UrlToast } from "@/components/url-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/epay/config";

const DEFAULT_ADMIN_LOGIN_BG = "https://i3.wp.com/w.wallhaven.cc/full/5y/wallhaven-5yrw55.jpg";

const errorMessages: Record<string, string> = {
  "1": "登录校验失败。",
  captcha: "图形验证码错误或已过期。",
  password: "账号或密码错误。",
  email_code: "邮件验证码错误或已过期。",
  totp: "2FA 动态口令错误。",
  email: "邮件验证码发送失败，请检查邮箱配置。",
};

const successMessages: Record<string, string> = {
  "1": "邮件验证码已发送。",
  login: "登录成功。",
  logout: "已退出登录。",
};

type LoginMode = "password" | "mail" | "totp";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const session = await getAdminSession();
  if (session) redirect(appUrl("/admin"));

  await searchParams;
  const configs = await prisma.config.findMany();
  const config = Object.fromEntries(configs.map((item) => [item.key, item.value || ""]));
  const mailEnabled = config.mail_login_enabled === "on";
  const mailOnly = config.mail_login_only === "on";
  const totpEnabled = config.totp_enabled === "on";
  const totpOnly = config.totp_login_only === "on";
  const captchaEnabled = config.login_captcha_enabled === "on";
  const loginBg = config.admin_login_bg || DEFAULT_ADMIN_LOGIN_BG;

  const mailAvailable = mailEnabled || mailOnly;
  const totpAvailable = totpEnabled || totpOnly;
  const onlyModesEnabled = mailOnly || totpOnly;
  const modes: LoginMode[] = [];
  if (!onlyModesEnabled) modes.push("password");
  if (mailAvailable && (!onlyModesEnabled || mailOnly)) modes.push("mail");
  if (totpAvailable && (!onlyModesEnabled || totpOnly)) modes.push("totp");
  if (modes.length === 0) modes.push("password");

  const defaultMode = modes[0];
  const multipleModes = modes.length > 1;
  const backgroundStyle = loginBg
    ? {
        backgroundImage: `linear-gradient(rgba(20, 20, 29, 0) 0%, rgba(20, 20, 29, 0.55) 100%), url('${loginBg.replace(/'/g, "%27")}')`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        clipPath: "polygon(0px 0px, 100% 0px, 88% 100%, 0% 100%)",
      }
    : undefined;

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#f8f3ec]">
      <UrlToast
        successParam={["sent", "success"]}
        successMessages={successMessages}
        errorMessages={errorMessages}
        defaultError="登录校验失败。"
      />

      <section className="absolute inset-y-0 left-0 hidden w-[58%] lg:block">
        <div className="absolute inset-0" style={backgroundStyle} />
      </section>

      <section className="relative z-10 grid min-h-svh lg:grid-cols-2">
        <div className="relative hidden h-full flex-col justify-between p-10 text-white lg:flex">
          <LoadingLink href="/" className="flex items-center gap-3 text-sm font-semibold">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs">后台管理</span>
            Next 易支付
          </LoadingLink>
          <div className="max-w-lg pb-10">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Admin · 内部入口</span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight">统一管理订单、通道与系统配置</h1>
            <p className="mt-4 text-sm leading-7 text-white/75">仅供授权管理员访问，用于处理收款订单、支付通道、通知回调和安全登录配置。</p>
          </div>
        </div>

        <section className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-4">
              <h1 className="text-xl font-semibold tracking-tight">管理员登录</h1>
              <p className="mt-1 text-sm text-muted-foreground">输入凭证进入后台控制台</p>
            </div>

            <div>
              {multipleModes ? (
                <Tabs defaultValue={defaultMode}>
                  <TabsList className="mb-5 grid w-full" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
                    {modes.includes("password") ? (
                      <TabsTrigger value="password">
                        <KeyRound className="size-4" />
                        密码登录
                      </TabsTrigger>
                    ) : null}
                    {modes.includes("mail") ? (
                      <TabsTrigger value="mail">
                        <Mail className="size-4" />
                        邮件登录
                      </TabsTrigger>
                    ) : null}
                    {modes.includes("totp") ? (
                      <TabsTrigger value="totp">
                        <ShieldCheck className="size-4" />
                        2FA
                      </TabsTrigger>
                    ) : null}
                  </TabsList>

                  {modes.includes("password") ? (
                    <TabsContent value="password">
                      <LoginForm captchaEnabled={captchaEnabled} totpEnabled={totpEnabled} mode="password" />
                    </TabsContent>
                  ) : null}
                  {modes.includes("mail") ? (
                    <TabsContent value="mail">
                      <MailLoginForm captchaEnabled={captchaEnabled} totpEnabled={totpEnabled && !mailOnly} />
                    </TabsContent>
                  ) : null}
                  {modes.includes("totp") ? (
                    <TabsContent value="totp">
                      <LoginForm captchaEnabled={captchaEnabled} totpEnabled mode="totp" />
                    </TabsContent>
                  ) : null}
                </Tabs>
              ) : defaultMode === "mail" ? (
                <MailLoginForm captchaEnabled={captchaEnabled} totpEnabled={totpEnabled && !mailOnly} />
              ) : defaultMode === "totp" ? (
                <LoginForm captchaEnabled={captchaEnabled} totpEnabled mode="totp" />
              ) : (
                <LoginForm captchaEnabled={captchaEnabled} totpEnabled={totpEnabled} mode="password" />
              )}
              <p className="mt-4 text-center text-xs text-muted-foreground">登录即进入后台管理，仅用于系统管理员。</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function LoginForm({ captchaEnabled, totpEnabled, mode }: { captchaEnabled: boolean; totpEnabled: boolean; mode: "password" | "totp" }) {
  return (
    <form className="grid gap-3" method="post" action="/api/admin/login">
      <input type="hidden" name="mode" value={mode} />
      {mode === "password" ? (
        <>
          <Field name="username" label="管理员账号" defaultValue="admin" />
          <Field name="password" label="登录密码" type="password" />
        </>
      ) : null}
      {totpEnabled ? <Field name="totp_code" label="2FA 动态口令" inputMode="numeric" maxLength={6} mode="digits" /> : null}
      {captchaEnabled ? <CaptchaField /> : null}
      <SubmitButton pendingText="登录中..." className="h-9 w-full text-sm">
        登录
      </SubmitButton>
    </form>
  );
}

function CaptchaField() {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="captcha" className="text-xs">图形验证码</Label>
      <div className="grid grid-cols-[1fr_104px] gap-2">
        <CodeInput id="captcha" name="captcha" mode="uppercase" autoComplete="off" className="h-9 text-sm" />
        <CaptchaImage />
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  inputMode,
  maxLength,
  mode,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  inputMode?: "numeric" | "decimal" | "text";
  maxLength?: number;
  mode?: "digits" | "uppercase";
}) {
  const inputProps = { id: name, name, type, defaultValue, className: "h-9 text-sm" };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      {mode ? (
        <CodeInput {...inputProps} mode={mode} maxLength={maxLength} />
      ) : (
        <Input {...inputProps} inputMode={inputMode} />
      )}
    </div>
  );
}