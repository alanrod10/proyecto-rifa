import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';
import { sanitizeCsvCell } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'orders';

    const db = getDb();
    let csvContent = '\uFEFF'; // BOM para que Excel en Windows reconozca caracteres latinos correctamente
    let filename = `rifa_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'orders') {
      const ordersRes = await db.execute(`
        SELECT id, code, buyer_name, buyer_phone, payment_method, payment_status,
               unit_price, numbers_count, total_amount, numbers_list, is_direct_sale,
               created_by_admin, paid_at, confirmed_by_admin, notes, created_at
        FROM orders ORDER BY id ASC
      `);

      csvContent += 'ID;Codigo;Comprador;Celular;Metodo_Pago;Estado;Precio_Unitario;Cantidad_Numeros;Total_ARS;Lista_Numeros;Venta_Directa;Creado_Por;Fecha_Pago;Confirmado_Por;Notas;Fecha_Creacion\n';

      for (const row of ordersRes.rows) {
        const line = [
          row.id,
          sanitizeCsvCell(row.code),
          sanitizeCsvCell(row.buyer_name),
          sanitizeCsvCell(row.buyer_phone),
          row.payment_method,
          row.payment_status,
          row.unit_price,
          row.numbers_count,
          row.total_amount,
          sanitizeCsvCell(row.numbers_list),
          Number(row.is_direct_sale) === 1 ? 'SI' : 'NO',
          sanitizeCsvCell(row.created_by_admin || ''),
          sanitizeCsvCell(row.paid_at || ''),
          sanitizeCsvCell(row.confirmed_by_admin || ''),
          sanitizeCsvCell(row.notes || ''),
          sanitizeCsvCell(row.created_at)
        ].join(';');
        csvContent += line + '\n';
      }
    } else if (type === 'buyers') {
      const buyersRes = await db.execute(`
        SELECT b.id, b.name, b.phone, b.created_at,
               COUNT(o.id) as orders_count,
               COALESCE(SUM(o.numbers_count), 0) as numbers_count,
               COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) as paid_amount
        FROM buyers b
        LEFT JOIN orders o ON b.id = o.buyer_id
        GROUP BY b.id
        ORDER BY b.id ASC
      `);

      csvContent += 'ID;Nombre;Celular;Total_Pedidos;Total_Numeros;Total_Pagado_ARS;Fecha_Registro\n';

      for (const row of buyersRes.rows) {
        const line = [
          row.id,
          sanitizeCsvCell(row.name),
          sanitizeCsvCell(row.phone),
          row.orders_count,
          row.numbers_count,
          row.paid_amount,
          sanitizeCsvCell(row.created_at)
        ].join(';');
        csvContent += line + '\n';
      }
    } else if (type === 'sold_numbers') {
      const soldRes = await db.execute(`
        SELECT n.number, n.status, o.code as order_code, o.buyer_name, o.buyer_phone, o.payment_status
        FROM numbers n
        LEFT JOIN orders o ON n.order_id = o.id
        WHERE n.status != 'available'
        ORDER BY n.number ASC
      `);

      csvContent += 'Numero;Estado;Codigo_Orden;Comprador;Celular;Estado_Pago\n';

      for (const row of soldRes.rows) {
        const line = [
          row.number,
          row.status,
          sanitizeCsvCell(row.order_code || ''),
          sanitizeCsvCell(row.buyer_name || ''),
          sanitizeCsvCell(row.buyer_phone || ''),
          sanitizeCsvCell(row.payment_status || '')
        ].join(';');
        csvContent += line + '\n';
      }
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error al exportar CSV:', error);
    return NextResponse.json({ error: 'Error al exportar datos' }, { status: 500 });
  }
}
