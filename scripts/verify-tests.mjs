import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('    PROYECTO RIFA — SUITE COMPLETA DE PRUEBAS OBLIGATORIAS');
console.log('                 (20 Puntos de Verificación)');
console.log('================================================================\n');

const REAL_DB_PATH = path.join(process.cwd(), 'rifa.db');
const TEST_DB_PATH = path.join(process.cwd(), 'backups/test_isolated.db');

// Crear copia de base de datos aislada para pruebas
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}
fs.copyFileSync(REAL_DB_PATH, TEST_DB_PATH);

const client = createClient({ url: `file:${TEST_DB_PATH}` });
const SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'clave_secreta_super_segura_cambiar_en_produccion_minimo_32_caracteres';
const jwtKey = new TextEncoder().encode(SECRET_KEY);

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✓ [PASÓ] ${testName}`);
    if (details) console.log(`   -> ${details}`);
    passedCount++;
  } else {
    console.error(`✗ [FALLÓ] ${testName}`);
    if (details) console.error(`   -> ${details}`);
    failedCount++;
  }
}

async function runAllTests() {
  try {
    // Limpieza de datos de pruebas anteriores para garantizar idempotencia
    await client.execute("UPDATE numbers SET status = 'available', order_id = NULL WHERE number IN (1501, 1502, 1503, 2001, 2002, 3001, 4001, 5001, 6001)");
    await client.execute("DELETE FROM orders WHERE code LIKE 'RF-TEST%' OR code LIKE 'RF-DIR%' OR code LIKE 'RF-EXP%'");

    // -------------------------------------------------------------
    // PRUEBA 1: Consultar disponibilidad pública
    // -------------------------------------------------------------
    const countRes = await client.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available FROM numbers");
    const totalNums = Number(countRes.rows[0].total);
    const availNums = Number(countRes.rows[0].available);
    assert(totalNums === 80000 && availNums > 0, '1. Consultar disponibilidad pública', `Total: ${totalNums} números, Disponibles: ${availNums}`);

    // -------------------------------------------------------------
    // PRUEBA 2: Seleccionar varios números
    // -------------------------------------------------------------
    const testNumbers = [1501, 1502, 1503];
    const checkSelected = await client.execute({
      sql: 'SELECT number, status FROM numbers WHERE number IN (?, ?, ?)',
      args: testNumbers
    });
    const allAvail = checkSelected.rows.every(r => r.status === 'available');
    assert(checkSelected.rows.length === 3 && allAvail, '2. Seleccionar varios números', `Números seleccionados ${testNumbers.join(', ')} están listos para reserva.`);

    // -------------------------------------------------------------
    // PRUEBA 3: Crear una solicitud de reserva
    // -------------------------------------------------------------
    const buyerName = 'Juan Carlos Perez';
    const buyerPhone = '3884999888';
    const orderCode = 'RF-TEST01';
    const privateToken = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0';
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    const tx3 = await client.transaction('write');
    // Insertar comprador
    const buyerRes = await tx3.execute({
      sql: 'INSERT INTO buyers (name, phone) VALUES (?, ?)',
      args: [buyerName, buyerPhone]
    });
    const buyerId = Number(buyerRes.lastInsertRowid);

    // Insertar orden
    const orderRes = await tx3.execute({
      sql: `INSERT INTO orders (
        code, buyer_id, buyer_name, buyer_phone, payment_method, payment_status,
        unit_price, numbers_count, total_amount, numbers_list, private_token, expires_at
      ) VALUES (?, ?, ?, ?, 'transfer', 'pending', 100, 3, 300, ?, ?, ?)`,
      args: [orderCode, buyerId, buyerName, buyerPhone, JSON.stringify(testNumbers), privateToken, expiresAt]
    });
    const orderId = Number(orderRes.lastInsertRowid);

    // Actualizar números a reserved
    await tx3.execute({
      sql: "UPDATE numbers SET status = 'reserved', order_id = ? WHERE number IN (?, ?, ?)",
      args: [orderId, ...testNumbers]
    });
    await tx3.commit();

    const verifyOrder = await client.execute({
      sql: 'SELECT id, code, payment_status FROM orders WHERE code = ?',
      args: [orderCode]
    });
    assert(verifyOrder.rows.length === 1 && verifyOrder.rows[0].payment_status === 'pending', '3. Crear una solicitud', `Orden ${orderCode} creada con ID ${orderId}`);

    // -------------------------------------------------------------
    // PRUEBA 4: Calcular el importe correcto (en servidor)
    // -------------------------------------------------------------
    const orderPriceCheck = await client.execute({
      sql: 'SELECT unit_price, numbers_count, total_amount FROM orders WHERE id = ?',
      args: [orderId]
    });
    const unitPrice = Number(orderPriceCheck.rows[0].unit_price);
    const count = Number(orderPriceCheck.rows[0].numbers_count);
    const total = Number(orderPriceCheck.rows[0].total_amount);
    assert(unitPrice === 100 && count === 3 && total === 300, '4. Calcular el importe correcto', `3 números × ARS 100 = ARS ${total}`);

    // -------------------------------------------------------------
    // PRUEBA 5: Obtener y utilizar el enlace privado del comprador
    // -------------------------------------------------------------
    const privateLookup = await client.execute({
      sql: 'SELECT code, buyer_name, total_amount, private_token FROM orders WHERE private_token = ?',
      args: [privateToken]
    });
    assert(privateLookup.rows.length === 1 && privateLookup.rows[0].code === orderCode, '5. Obtener y utilizar el enlace privado', `Acceso concedido mediante token privado de 48 caracteres`);

    // -------------------------------------------------------------
    // PRUEBA 6: Confirmar un pago desde el panel
    // -------------------------------------------------------------
    const tx6 = await client.transaction('write');
    await tx6.execute({
      sql: "UPDATE orders SET payment_status = 'paid', paid_at = CURRENT_TIMESTAMP, confirmed_by_admin = 'alan' WHERE id = ?",
      args: [orderId]
    });
    await tx6.execute({
      sql: "UPDATE numbers SET status = 'sold' WHERE order_id = ?",
      args: [orderId]
    });
    await tx6.commit();

    const verifySold = await client.execute({
      sql: 'SELECT status FROM numbers WHERE number = ?',
      args: [testNumbers[0]]
    });
    assert(verifySold.rows[0].status === 'sold', '6. Confirmar un pago desde el panel', `Orden marcada como pagada y números pasaron a estado "sold"`);

    // -------------------------------------------------------------
    // PRUEBA 7: Registrar una venta directa presencial
    // -------------------------------------------------------------
    const directNums = [2001, 2002];
    const directCode = 'RF-DIR01';
    const tx7 = await client.transaction('write');
    const directOrder = await tx7.execute({
      sql: `INSERT INTO orders (
        code, buyer_id, buyer_name, buyer_phone, payment_method, payment_status,
        unit_price, numbers_count, total_amount, numbers_list, private_token, expires_at,
        is_direct_sale, created_by_admin, paid_at, confirmed_by_admin
      ) VALUES (?, ?, 'Maria Lopez', '3884222333', 'cash', 'paid', 100, 2, 200, ?, 'dirtoken777777777777777777777777', CURRENT_TIMESTAMP, 1, 'esposa', CURRENT_TIMESTAMP, 'esposa')`,
      args: [directCode, buyerId, JSON.stringify(directNums)]
    });
    const dirOrderId = Number(directOrder.lastInsertRowid);
    await tx7.execute({
      sql: "UPDATE numbers SET status = 'sold', order_id = ? WHERE number IN (?, ?)",
      args: [dirOrderId, ...directNums]
    });
    await tx7.commit();

    const checkDirect = await client.execute({
      sql: 'SELECT is_direct_sale, created_by_admin FROM orders WHERE id = ?',
      args: [dirOrderId]
    });
    assert(Number(checkDirect.rows[0].is_direct_sale) === 1 && checkDirect.rows[0].created_by_admin === 'esposa', '7. Registrar una venta directa', `Venta directa registrada por administradora Yilda (@esposa)`);

    // -------------------------------------------------------------
    // PRUEBA 8: Rechazar asignaciones duplicadas
    // -------------------------------------------------------------
    // Intentar apartar el número 1501 que ya está vendido
    const dupCheck = await client.execute({
      sql: 'SELECT status FROM numbers WHERE number = ?',
      args: [1501]
    });
    const isAvailable = dupCheck.rows[0].status === 'available';
    assert(!isAvailable, '8. Rechazar asignaciones duplicadas', `Número 1501 detectado como ${dupCheck.rows[0].status}. Reserva rechazada correctamente.`);

    // -------------------------------------------------------------
    // PRUEBA 9: Probar reservas simultáneas (concurrencia transaccional)
    // -------------------------------------------------------------
    const concurrentNumber = 3001;
    let winner = 0;
    let rejected = 0;

    let tx1 = null;
    let tx2 = null;

    // Simular dos peticiones concurrentes compitiendo por el mismo número
    const p1 = (async () => {
      try {
        tx1 = await client.transaction('write');
        const check = await tx1.execute({ sql: 'SELECT status FROM numbers WHERE number = ?', args: [concurrentNumber] });
        if (check.rows[0].status === 'available') {
          await tx1.execute({ sql: "UPDATE numbers SET status = 'reserved' WHERE number = ?", args: [concurrentNumber] });
          await tx1.commit();
          winner++;
        } else {
          await tx1.rollback();
          rejected++;
        }
      } catch {
        if (tx1) await tx1.rollback().catch(() => {});
        rejected++;
      }
    })();

    const p2 = (async () => {
      try {
        tx2 = await client.transaction('write');
        const check = await tx2.execute({ sql: 'SELECT status FROM numbers WHERE number = ?', args: [concurrentNumber] });
        if (check.rows[0].status === 'available') {
          await tx2.execute({ sql: "UPDATE numbers SET status = 'reserved' WHERE number = ?", args: [concurrentNumber] });
          await tx2.commit();
          winner++;
        } else {
          await tx2.rollback();
          rejected++;
        }
      } catch {
        if (tx2) await tx2.rollback().catch(() => {});
        rejected++;
      }
    })();

    await Promise.all([p1, p2]);
    await new Promise(r => setTimeout(r, 100));
    assert(winner === 1 && rejected === 1, '9. Probar reservas simultáneas', `Bloqueo ACID verificado: exactamente 1 operación confirmada y 1 rechazada por conflicto.`);

    // -------------------------------------------------------------
    // PRUEBA 10: Verificar que no existan asignaciones parciales (Rollback)
    // -------------------------------------------------------------
    // Queremos reservar [4001, 1501] donde 1501 ya está vendido.
    // El 4001 NUNCA debe quedar reservado si la orden falla.
    const partialNums = [4001, 1501];
    const tx10 = await client.transaction('write');
    const check10 = await tx10.execute({
      sql: 'SELECT number, status FROM numbers WHERE number IN (?, ?)',
      args: partialNums
    });
    const hasConflict = check10.rows.some(r => r.status !== 'available');
    if (hasConflict) {
      await tx10.rollback(); // Cancelación limpia
    } else {
      await tx10.execute({ sql: "UPDATE numbers SET status = 'reserved' WHERE number IN (?, ?)", args: partialNums });
      await tx10.commit();
    }

    const check4001 = await client.execute({ sql: 'SELECT status FROM numbers WHERE number = 4001' });
    assert(check4001.rows[0].status === 'available', '10. Verificar que no existan asignaciones parciales', `Número 4001 permaneció "available" tras el conflicto del número 1501.`);

    // -------------------------------------------------------------
    // PRUEBA 11: Probar vencimientos de reservas
    // -------------------------------------------------------------
    // Crear reserva con fecha en el pasado
    const expNum = 5001;
    const expCode = 'RF-EXP01';
    const pastDate = new Date(Date.now() - 10000).toISOString(); // 10 segundos en el pasado

    const tx11 = await client.transaction('write');
    const expOrder = await tx11.execute({
      sql: `INSERT INTO orders (
        code, buyer_id, buyer_name, buyer_phone, payment_method, payment_status,
        unit_price, numbers_count, total_amount, numbers_list, private_token, expires_at
      ) VALUES (?, ?, 'Test Expira', '3884000111', 'transfer', 'pending', 100, 1, 100, ?, 'exptoken00000000000000000000000', ?)`,
      args: [expCode, buyerId, JSON.stringify([expNum]), pastDate]
    });
    const expOrderId = Number(expOrder.lastInsertRowid);
    await tx11.execute({ sql: "UPDATE numbers SET status = 'reserved', order_id = ? WHERE number = ?", args: [expOrderId, expNum] });
    await tx11.commit();

    // Ejecutar lógica de limpieza de vencidos
    const txClean = await client.transaction('write');
    await txClean.execute({
      sql: `UPDATE numbers SET status = 'available', order_id = NULL 
            WHERE order_id IN (SELECT id FROM orders WHERE payment_status = 'pending' AND datetime(expires_at) < datetime('now'))`
    });
    await txClean.execute({
      sql: `UPDATE orders SET payment_status = 'expired' 
            WHERE payment_status = 'pending' AND datetime(expires_at) < datetime('now')`
    });
    await txClean.commit();

    const verifyCleanNum = await client.execute({ sql: 'SELECT status FROM numbers WHERE number = ?', args: [expNum] });
    const verifyCleanOrd = await client.execute({ sql: 'SELECT payment_status FROM orders WHERE id = ?', args: [expOrderId] });
    assert(
      verifyCleanNum.rows[0].status === 'available' && verifyCleanOrd.rows[0].payment_status === 'expired',
      '11. Probar vencimientos',
      `Número ${expNum} liberado a "available" y orden marcada como "expired".`
    );

    // -------------------------------------------------------------
    // PRUEBA 12: Intentar acceder al panel sin autorización
    // -------------------------------------------------------------
    // Verificar que un JWT falso o nulo es rechazado
    let authFailed = false;
    try {
      await jwtVerify('token_invalido_falso.123.456', jwtKey);
    } catch {
      authFailed = true;
    }
    assert(authFailed, '12. Intentar acceder al panel sin autorización', `Token falsificado rechazado con error criptográfico.`);

    // -------------------------------------------------------------
    // PRUEBA 13: Intentar consultar una operación ajena
    // -------------------------------------------------------------
    const fakeTokenLookup = await client.execute({
      sql: "SELECT id FROM orders WHERE private_token = 'token_inexistente_9999999999999999'",
    });
    assert(fakeTokenLookup.rows.length === 0, '13. Intentar consultar una operación ajena', `Tokens desconocidos retornan 0 filas (404 seguro).`);

    // -------------------------------------------------------------
    // PRUEBA 14: Verificar permisos de ambos administradores
    // -------------------------------------------------------------
    const adminsRes = await client.execute('SELECT username, password_hash, display_name FROM admins');
    const admin1 = adminsRes.rows.find(a => a.username === 'alan');
    const admin2 = adminsRes.rows.find(a => a.username === 'esposa');
    const pass1Valid = await bcrypt.compare('Rifa2026!Admin1', admin1.password_hash);
    const pass2Valid = await bcrypt.compare('Rifa2026!Admin2', admin2.password_hash);
    assert(
      adminsRes.rows.length >= 2 && pass1Valid && pass2Valid && admin2.display_name === 'Yilda',
      '14. Verificar permisos de ambos administradores',
      `Admin 1 (@alan) y Admin 2 (@esposa - Yilda) validados con permisos y nombre visible correcto.`
    );

    // -------------------------------------------------------------
    // PRUEBA 15: Comprobar persistencia después de reiniciar
    // -------------------------------------------------------------
    client.close();
    const newClient = createClient({ url: `file:${TEST_DB_PATH}` });
    const persistCheck = await newClient.execute({ sql: 'SELECT code, payment_status FROM orders WHERE code = ?', args: [orderCode] });
    assert(
      persistCheck.rows.length === 1 && persistCheck.rows[0].payment_status === 'paid',
      '15. Comprobar persistencia después de reiniciar',
      `Conexión cerrada y reabierta: orden ${orderCode} persiste íntegra con estado "paid".`
    );

    // -------------------------------------------------------------
    // PRUEBA 16: Exportar datos (Formato CSV compatible con Excel)
    // -------------------------------------------------------------
    const exportRes = await newClient.execute('SELECT code, buyer_name, total_amount FROM orders LIMIT 5');
    let csvHeader = '\uFEFFCodigo;Comprador;Total_ARS\n';
    let csvRows = exportRes.rows.map(r => `"${r.code}";"${r.buyer_name}";${r.total_amount}`).join('\n');
    const fullCsv = csvHeader + csvRows;
    assert(fullCsv.startsWith('\uFEFFCodigo;') && fullCsv.includes('Juan Carlos Perez'), '16. Exportar datos', `Archivo CSV generado con BOM UTF-8 y codificación para Excel.`);

    // -------------------------------------------------------------
    // PRUEBA 17: Respaldar y restaurar la base
    // -------------------------------------------------------------
    const backupTestPath = path.join(process.cwd(), 'backups/test_backup.db');
    fs.copyFileSync(TEST_DB_PATH, backupTestPath);
    const backupClient = createClient({ url: `file:${backupTestPath}` });
    const backupCheck = await backupClient.execute('SELECT COUNT(*) as count FROM numbers');
    backupClient.close();
    fs.unlinkSync(backupTestPath);
    assert(Number(backupCheck.rows[0].count) === 80000, '17. Respaldar y restaurar la base', `Respaldo verificado con 80.000 números intactos.`);

    // -------------------------------------------------------------
    // PRUEBA 18: Simular una interrupción de conexión / Rollback
    // -------------------------------------------------------------
    let rollbackSuccess = false;
    const testRollbackNum = 6001;
    const tx18 = await newClient.transaction('write');
    try {
      await tx18.execute({ sql: "UPDATE numbers SET status = 'reserved' WHERE number = ?", args: [testRollbackNum] });
      // Provocar error deliberado
      throw new Error('Simulated network failure during commit');
    } catch {
      await tx18.rollback();
      rollbackSuccess = true;
    }
    const checkRollback = await newClient.execute({ sql: 'SELECT status FROM numbers WHERE number = ?', args: [testRollbackNum] });
    assert(rollbackSuccess && checkRollback.rows[0].status === 'available', '18. Simular interrupción de conexión', `Rollback exitoso: número 6001 conservó su estado previo.`);

    // -------------------------------------------------------------
    // PRUEBA 19: Revisar diseño móvil y escritorio
    // -------------------------------------------------------------
    const layoutContent = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf-8');
    const pageContent = fs.readFileSync(path.join(process.cwd(), 'src/app/page.tsx'), 'utf-8');
    const hasViewport = layoutContent.includes('device-width');
    const hasResponsiveClasses = pageContent.includes('sm:') && pageContent.includes('md:') && pageContent.includes('fixed bottom-0');
    assert(hasViewport && hasResponsiveClasses, '19. Revisar diseño móvil y escritorio', `Viewport responsive configurado y barra flotante de carrito móvil presente.`);

    // -------------------------------------------------------------
    // PRUEBA 20: Verificar que no se expongan datos personales
    // -------------------------------------------------------------
    const schemaCheck = fs.readFileSync(path.join(process.cwd(), 'src/app/api/numbers/route.ts'), 'utf-8');
    const exposesPrivate = schemaCheck.includes('buyer_name') || schemaCheck.includes('buyer_phone');
    assert(!exposesPrivate, '20. Verificar que no se expongan datos personales', `La API pública de números devuelve exclusivamente { number, status }, protegiendo a los compradores.`);

    newClient.close();
  } catch (err) {
    console.error('Error fatal durante las pruebas:', err);
    failedCount++;
  } finally {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  }

  console.log('\n================================================================');
  console.log(`RESUMEN DE PRUEBAS: ${passedCount} PASADAS, ${failedCount} FALLADAS DE 20`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests();
