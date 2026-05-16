import nodemailer from 'nodemailer';
import { getConfigMap } from '@/lib/epay/config';

export async function sendMail(input: { to: string; subject: string; text: string; html?: string }) {
  const config = await getConfigMap();
  if (config.smtp_enabled !== 'on') return { skipped: true };
  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass || !config.smtp_from) throw new Error('SMTP 未完整配置');

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: Number(config.smtp_port || 465),
    secure: config.smtp_secure !== 'false',
    auth: { user: config.smtp_user, pass: config.smtp_pass },
  });

  await transporter.sendMail({
    from: config.smtp_from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { skipped: false };
}

export async function sendLoginCodeMail(to: string, code: string) {
  return sendMail({
    to,
    subject: '后台登录验证码',
    text: `你的后台登录验证码是：${code}，5 分钟内有效。`,
  });
}

export async function sendOrderPaidMail(order: { tradeNo: string; outTradeNo: string; name: string; money: unknown; typeCode?: string | null }) {
  const config = await getConfigMap();
  const to = config.order_paid_email_to || config.admin_email || '';
  const notifyEnabled = config.order_paid_email_enabled !== 'off';
  if (!notifyEnabled || !to) return { skipped: true };
  return sendMail({
    to,
    subject: `订单支付成功：${order.outTradeNo}`,
    text: `订单已支付\n平台订单号：${order.tradeNo}\n商户订单号：${order.outTradeNo}\n商品：${order.name}\n金额：${String(order.money)}\n支付方式：${order.typeCode || '-'}`,
  });
}