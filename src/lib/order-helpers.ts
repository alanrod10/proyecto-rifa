import { Transaction } from '@libsql/client';
import { logAudit, invalidatePublicCache } from '@/lib/db';

export function buildAdminOrdersQuery(status: string | null, search: string | null) {
  let whereClause = '1=1';
  let orderBy = 'id DESC';
  const args: (string | number)[] = [];

  if (status === 'expiring_6h') {
    whereClause +=
      " AND payment_status = 'pending' AND datetime(expires_at) >= datetime('now') AND datetime(expires_at) <= datetime('now', '+6 hours')";
    orderBy = 'datetime(expires_at) ASC, id ASC';
  } else if (status && status !== 'all') {
    whereClause += ' AND payment_status = ?';
    args.push(status);
  }

  if (search && search.trim().length > 0) {
    const trimmed = search.trim();
    const q = `%${trimmed}%`;
    const parsedNum = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : NaN;
    const isRaffleNumber = !isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 100000;

    if (isRaffleNumber) {
      whereClause += ` AND (
        code LIKE ? OR buyer_name LIKE ? OR buyer_phone LIKE ?
        OR id IN (SELECT order_id FROM numbers WHERE number = ? AND order_id IS NOT NULL)
        OR numbers_list LIKE ? OR numbers_list LIKE ? OR numbers_list LIKE ? OR numbers_list LIKE ?
      )`;
      args.push(
        q,
        q,
        q,
        parsedNum,
        `%[${parsedNum}]%`,
        `%[${parsedNum},%`,
        `%,${parsedNum},%`,
        `%,${parsedNum}]%`
      );
    } else {
      whereClause +=
        ' AND (code LIKE ? OR buyer_name LIKE ? OR buyer_phone LIKE ? OR numbers_list LIKE ?)';
      args.push(q, q, q, q);
    }
  }

  return { whereClause, args, orderBy };
}

export async function handleChangePaymentMethodInTx(
  tx: Transaction,
  order: Record<string, unknown>,
  adminUsername: string,
  requestedMethod: string | undefined,
  clientIp: string
) {
  const orderId = Number(order.id);
  const currentPaymentMethod = String(order.payment_method);
  const targetMethod =
    requestedMethod === 'cash' || requestedMethod === 'transfer'
      ? requestedMethod
      : currentPaymentMethod === 'cash'
      ? 'transfer'
      : 'cash';

  await tx.execute({
    sql: `UPDATE orders 
          SET payment_method = ?, 
              notes = COALESCE(notes || ' | ', '') || ? 
          WHERE id = ?`,
    args: [
      targetMethod,
      `Medio de pago cambiado a ${
        targetMethod === 'cash' ? 'Efectivo' : 'Transferencia'
      } por ${adminUsername}`,
      orderId,
    ],
  });

  await tx.commit();
  invalidatePublicCache();

  await logAudit(
    adminUsername,
    'CHANGE_PAYMENT_METHOD',
    {
      order_id: orderId,
      code: order.code,
      buyer_name: order.buyer_name,
      previous_method: currentPaymentMethod,
      new_method: targetMethod,
    },
    clientIp
  );

  return {
    success: true,
    payment_method: targetMethod,
    message: `Medio de pago actualizado a ${
      targetMethod === 'cash' ? 'Efectivo' : 'Transferencia'
    }.`,
  };
}

export async function handleDeleteOrderInTx(
  tx: Transaction,
  order: Record<string, unknown>,
  adminUsername: string,
  reason: string | undefined,
  clientIp: string
) {
  const orderId = Number(order.id);
  const buyerId = Number(order.buyer_id);
  const currentStatus = String(order.payment_status);
  const expectedCount = Number(order.numbers_count);

  const releaseRes = await tx.execute({
    sql: `UPDATE numbers 
          SET status = 'available', order_id = NULL, updated_at = CURRENT_TIMESTAMP 
          WHERE order_id = ?`,
    args: [orderId],
  });
  const releasedCount = Number(releaseRes.rowsAffected || 0);

  await tx.execute({
    sql: 'DELETE FROM orders WHERE id = ?',
    args: [orderId],
  });

  let buyerDeleted = false;
  if (buyerId) {
    const remainingOrdersRes = await tx.execute({
      sql: 'SELECT COUNT(*) as count FROM orders WHERE buyer_id = ?',
      args: [buyerId],
    });
    if (Number(remainingOrdersRes.rows[0]?.count || 0) === 0) {
      await tx.execute({
        sql: 'DELETE FROM buyers WHERE id = ?',
        args: [buyerId],
      });
      buyerDeleted = true;
    }
  }

  await tx.commit();
  invalidatePublicCache();

  await logAudit(
    adminUsername,
    'DELETE_ORDER',
    {
      order_id: orderId,
      code: order.code,
      buyer_name: order.buyer_name,
      buyer_phone: order.buyer_phone,
      previous_status: currentStatus,
      numbers_count: expectedCount,
      released_numbers: releasedCount,
      buyer_deleted: buyerDeleted,
      reason: reason || 'Eliminación manual por administrador',
    },
    clientIp
  );

  return {
    success: true,
    message: `Registro ${order.code} eliminado definitivamente y sus números quedaron disponibles.`,
  };
}
