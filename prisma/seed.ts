import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getDatabaseUrl } from '../src/lib/database-url';
import { appUrl } from '../src/lib/server-app-url';

const DEFAULT_ADMIN_LOGIN_BG = 'https://i3.wp.com/w.wallhaven.cc/full/8g/wallhaven-8grkpy.jpg';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

async function main() {
  await prisma.merchant.upsert({
    where: { id: 1000 },
    update: {},
    create: {
      id: 1000,
      name: '默认商户',
      apiKey: 'epay_default_key_change_me',
      status: true,
    },
  });

  const siteUrl = appUrl('/');
  const configs: Record<string, string> = {
    sitename: 'Next 易支付',
    apiurl: siteUrl,
    localurl: siteUrl,
    pay_minmoney: '0.01',
    pay_maxmoney: '50000',
    admin_user: 'admin',
    admin_pwd_hash: await bcrypt.hash('123456', 10),
    admin_login_bg: DEFAULT_ADMIN_LOGIN_BG,
    alipay_gateway: 'https://openapi.alipay.com/gateway.do',
    wechat_gateway: 'https://api.mch.weixin.qq.com',
  };

  for (const [key, value] of Object.entries(configs)) {
    await prisma.config.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  const alipay = await prisma.payType.upsert({
    where: { code: 'alipay' },
    update: { name: '支付宝', enabled: true, sort: 1 },
    create: { code: 'alipay', name: '支付宝', enabled: true, sort: 1 },
  });
  const wxpay = await prisma.payType.upsert({
    where: { code: 'wxpay' },
    update: { name: '微信支付', enabled: true, sort: 2 },
    create: { code: 'wxpay', name: '微信支付', enabled: true, sort: 2 },
  });

  await prisma.channel.upsert({
    where: { code: 'alipay_official' },
    update: {},
    create: {
      typeId: alipay.id,
      provider: 'ALIPAY',
      code: 'alipay_official',
      name: '支付宝官方支付',
      product: 'qr',
      enabled: false,
      config: {},
    },
  });

  await prisma.channel.upsert({
    where: { code: 'wechat_v3' },
    update: {},
    create: {
      typeId: wxpay.id,
      provider: 'WECHAT',
      code: 'wechat_v3',
      name: '微信支付 APIv3',
      product: 'native',
      enabled: false,
      config: {},
    },
  });
}

main()
  .finally(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });