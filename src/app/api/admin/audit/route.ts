import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';
import { safeJsonParse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '40', 10)));
    const offset = (page - 1) * limit;

    const db = getDb();
    const countRes = await db.execute('SELECT COUNT(*) as count FROM audit_logs');
    const total = Number(countRes.rows[0].count);

    const logsRes = await db.execute({
      sql: `SELECT id, admin_username, action, details, ip_address, created_at 
            FROM audit_logs 
            ORDER BY id DESC 
            LIMIT ? OFFSET ?`,
      args: [limit, offset]
    });

    return NextResponse.json({
      logs: logsRes.rows.map(r => ({
        id: Number(r.id),
        admin_username: r.admin_username as string,
        action: r.action as string,
        details: safeJsonParse(r.details as string, r.details),
        ip_address: r.ip_address as string | null,
        created_at: r.created_at as string,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al consultar auditoría:', error);
    return NextResponse.json({ error: 'Error al consultar auditoría' }, { status: 500 });
  }
}
