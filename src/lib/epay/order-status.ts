import { OrderStatus, type Order } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getConfig } from '@/lib/epay/config';

export const DEFAULT_ORDER_EXPIRE_MINUTES = 15;

export const orderStatusText: Record<OrderStatus, string> = {
  PENDING: '待支付',
  PAID: '已支付',
  REFUNDED: '已退款',
  FROZEN: '已冻结',
  CLOSED: '已关闭',
};

export function getOrderStatusText(status: OrderStatus | string) {
  return orderStatusText[status as OrderStatus] || String(status);
}

export async function getOrderExpireMinutes() {
  const value = Number(await getConfig('order_expire_minutes', String(DEFAULT_ORDER_EXPIRE_MINUTES)));
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_ORDER_EXPIRE_MINUTES;
}

export async function getOrderExpiresAt(createdAt: Date) {
  const minutes = await getOrderExpireMinutes();
  return new Date(createdAt.getTime() + minutes * 60 * 1000);
}

export async function isOrderExpired(order: Pick<Order, 'status' | 'createdAt'>) {
  if (order.status !== OrderStatus.PENDING) return false;
  return Date.now() >= (await getOrderExpiresAt(order.createdAt)).getTime();
}

export async function closeExpiredOrder<T extends Pick<Order, 'tradeNo' | 'status' | 'createdAt'>>(order: T) {
  if (!(await isOrderExpired(order))) return order;
  return prisma.order.update({ where: { tradeNo: order.tradeNo }, data: { status: OrderStatus.CLOSED } });
}

export async function closeExpiredOrders() {
  const minutes = await getOrderExpireMinutes();
  const deadline = new Date(Date.now() - minutes * 60 * 1000);
  return prisma.order.updateMany({
    where: { status: OrderStatus.PENDING, createdAt: { lt: deadline } },
    data: { status: OrderStatus.CLOSED },
  });
}