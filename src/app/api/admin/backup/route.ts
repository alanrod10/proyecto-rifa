import { NextRequest, NextResponse } from 'next/server';
import { getDb, getNumberStats, logAudit } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = getDb();

    const [settingsRes, buyersRes, ordersRes, nonAvailNumbersRes, numStats, auditRes] = await Promise.all([
      db.execute('SELECT key, value, updated_at FROM settings ORDER BY key ASC'),
      db.execute('SELECT id, name, phone, created_at FROM buyers ORDER BY id ASC'),
      db.execute('SELECT * FROM orders ORDER BY id ASC'),
      db.execute("SELECT number, status, order_id, updated_at FROM numbers WHERE status != 'available' ORDER BY number ASC"),
      getNumberStats(db),
      db.execute('SELECT id, admin_username, action, details, ip_address, created_at FROM audit_logs ORDER BY id DESC LIMIT 500')
    ]);

    const snapshot = {
      version: '2.0',
      generated_at: new Date().toISOString(),
      generated_by: admin.username,
      metrics: {
        total_numbers: numStats.total,
        available_numbers: numStats.available,
        reserved_numbers: numStats.reserved,
        sold_numbers: numStats.sold,
        total_orders: ordersRes.rows.length,
        total_buyers: buyersRes.rows.length,
      },
      data: {
        settings: settingsRes.rows,
        buyers: buyersRes.rows,
        orders: ordersRes.rows,
        occupied_numbers: nonAvailNumbersRes.rows,
        recent_audit_logs: auditRes.rows
      }
    };

    await logAudit(
      admin.username,
      'CLOUD_BACKUP_DOWNLOAD',
      { orders_count: ordersRes.rows.length, occupied_numbers: nonAvailNumbersRes.rows.length },
      request.headers.get('x-forwarded-for') || 'localhost'
    );

    const filename = `respaldo_rifa_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;

    return new NextResponse(JSON.stringify(snapshot, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error al generar respaldo desde panel:', error);
    return NextResponse.json({ error: 'Error al generar copia de seguridad' }, { status: 500 });
  }
}
