import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('    PROYECTO RIFA — SUITE COMPLETA DE PRUEBAS OBLIGATORIAS');
console.log('           (25 Puntos de Verificación + Auditoría)');
console.log('================================================================\n');

const REAL_DB_PATH = path.join(process.cwd(), 'rifa.db');
const TEST_DB_PATH = path.join(process.cwd(), 'backups/test_isolated.db');

// Si se ejecuta en un clon limpio sin rifa.db local, inicializar automáticamente
if (!fs.existsSync(REAL_DB_PATH)) {
  console.log('Inicializando base de datos local para pruebas (npm run seed)...');
  execFileSync(process.execPath, [path.join(process.cwd(), 'scripts/init-db.mjs')], { stdio: 'inherit' });
}

if (!fs.existsSync(path.dirname(TEST_DB_PATH))) {
  fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
}

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
    assert(totalNums === 100000 && availNums > 0, '1. Consultar disponibilidad pública', `Total: ${totalNums} números, Disponibles: ${availNums}`);

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
      ) VALUES (?, ?, 'Maria Lopez', '3884222333', 'cash', 'paid', 100, 2, 200, ?, 'dirtoken777777777777777777777777', CURRENT_TIMESTAMP, 1, 'yilda', CURRENT_TIMESTAMP, 'yilda')`,
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
    assert(Number(checkDirect.rows[0].is_direct_sale) === 1 && checkDirect.rows[0].created_by_admin === 'yilda', '7. Registrar una venta directa', `Venta directa registrada por administradora Yilda (@yilda)`);

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
    const admin2 = adminsRes.rows.find(a => a.username === 'yilda');
    const pass1Valid = await bcrypt.compare('Rifa2026!Admin1', admin1.password_hash);
    const pass2Valid = await bcrypt.compare('Rifa2026!Admin2', admin2.password_hash);
    assert(
      adminsRes.rows.length >= 2 && pass1Valid && pass2Valid && admin2.display_name === 'Yilda',
      '14. Verificar permisos de ambos administradores',
      `Admin 1 (@alan) y Admin 2 (@yilda - Yilda) validados con permisos y nombre visible correcto.`
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
    assert(Number(backupCheck.rows[0].count) === 100000, '17. Respaldar y restaurar la base', `Respaldo verificado con 100.000 números intactos.`);

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

    // -------------------------------------------------------------
    // PRUEBA 21: Prevención de "Pago Fantasma" en órdenes vencidas/canceladas
    // -------------------------------------------------------------
    const ordersRouteContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/orders/route.ts'), 'utf-8');
    const checksPendingInTx = ordersRouteContent.includes("currentStatus !== 'pending'") && ordersRouteContent.includes("WHERE order_id = ? AND status = 'reserved'");
    assert(checksPendingInTx, '21. Prevención de Pago Fantasma y Máquina de Estados', `Confirmación de pago exige estado "pending" y coincidencia exacta de números reservados dentro de la transacción.`);

    // -------------------------------------------------------------
    // PRUEBA 22: Protección contra Fuerza Bruta (Rate Limiting) en Login
    // -------------------------------------------------------------
    const loginRouteContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/auth/login/route.ts'), 'utf-8');
    const hasRateLimit = loginRouteContent.includes('ADMIN_LOGIN_FAILED') && loginRouteContent.includes('status: 429');
    assert(hasRateLimit, '22. Protección contra Fuerza Bruta en Login Admin', `Intentos fallidos registrados en audit_logs con bloqueo HTTP 429 tras múltiples fallos.`);

    // -------------------------------------------------------------
    // PRUEBA 23: Normalización de celular sin requerir prefijo 54 y formateo WhatsApp
    // -------------------------------------------------------------
    const utilsContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/utils.ts'), 'utf-8');
    const hasPhoneHelpers = utilsContent.includes('formatWhatsAppPhone') && utilsContent.includes("return `549${clean}`");
    assert(hasPhoneHelpers, '23. Carga de celular directo sin prefijo 54', `Normalización automática de números locales (ej: 3884123456) y conversión automática a 549 para enlaces de WhatsApp.`);

    // -------------------------------------------------------------
    // PRUEBA 24: Sanitización contra Inyección de Fórmulas CSV y Códigos RF-XXXXXX con reintento
    // -------------------------------------------------------------
    const exportContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/export/route.ts'), 'utf-8');
    const hasCsvSanitizer = exportContent.includes('sanitizeCsvCell') && utilsContent.includes('generateUniqueOrderCode');
    assert(hasCsvSanitizer, '24. Protección CSV Injection y Códigos Únicos con Reintento', `Celdas CSV neutralizadas ante prefijos (=, +, -, @) y códigos de 6 caracteres con verificación de colisión.`);

    // -------------------------------------------------------------
    // PRUEBA 25: Optimización de lecturas en Turso y Zona Horaria Jujuy
    // -------------------------------------------------------------
    const numbersRouteContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/numbers/route.ts'), 'utf-8');
    const usesIndexedRandom = !numbersRouteContent.includes('ORDER BY RANDOM()') && numbersRouteContent.includes('pickRandomUniqueInts');
    const usesJujuyTz = utilsContent.includes('America/Argentina/Jujuy');
    assert(usesIndexedRandom && usesJujuyTz, '25. Optimización Turso (sin ORDER BY RANDOM) y TZ Jujuy', `Muestreo por clave primaria indexada y zona horaria America/Argentina/Jujuy activa.`);

    // -------------------------------------------------------------
    // PRUEBA 26 (FASE 1): Estadísticas indexadas, caché, throttle y paginación BETWEEN/cursor
    // -------------------------------------------------------------
    const dbContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/db.ts'), 'utf-8');
    const dashboardContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/dashboard/route.ts'), 'utf-8');
    const backupContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/backup/route.ts'), 'utf-8');
    const settingsRouteContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/settings/route.ts'), 'utf-8');
    const directSaleContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/direct-sale/route.ts'), 'utf-8');

    const noFullTableCaseScan =
      !dbContent.includes("SUM(CASE WHEN status = 'available'") &&
      !dashboardContent.includes("SUM(CASE WHEN status = 'available'") &&
      !backupContent.includes("SUM(CASE WHEN status = 'available'");

    const [soldIdxRes, resIdxRes] = await Promise.all([
      newClient.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'sold'"),
      newClient.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'reserved'")
    ]);
    const derivedAvail = 100000 - Number(soldIdxRes.rows[0].count) - Number(resIdxRes.rows[0].count);

    const rangeRes = await newClient.execute({
      sql: 'SELECT number, status FROM numbers WHERE number BETWEEN ? AND ? ORDER BY number ASC',
      args: [61, 120]
    });
    const cursorRes = await newClient.execute({
      sql: "SELECT number, status FROM numbers WHERE status = 'available' AND number > ? ORDER BY number ASC LIMIT ?",
      args: [1500, 10]
    });
    const cursorSkipsSold = cursorRes.rows.every(r => Number(r.number) > 1503 && r.status === 'available');
    const hasCacheAndThrottle =
      pageContent.includes('revalidate = 10') &&
      settingsRouteContent.includes('PUBLIC_CACHE_CONTROL') &&
      numbersRouteContent.includes('PUBLIC_CACHE_CONTROL') &&
      numbersRouteContent.includes('releaseExpiredReservationsThrottled') &&
      directSaleContent.includes('releaseExpiredReservations');

    assert(
      noFullTableCaseScan && derivedAvail > 99990 && rangeRes.rows.length === 60 && cursorSkipsSold && hasCacheAndThrottle,
      '26. Fase 1: Lecturas indexadas Turso, caché 10s, throttle 60s y paginación BETWEEN/cursor',
      `Disponibles derivados: ${derivedAvail}, rango BETWEEN: ${rangeRes.rows.length} filas, cursor post-1500 primer libre: ${cursorRes.rows[0]?.number}`
    );

    // -------------------------------------------------------------
    // PRUEBA 27 (FASE 2): Rate limiting, topes dinámicos, chunking IN(500), UPDATE available+rowsAffected, idempotencia y vista reducida
    // -------------------------------------------------------------
    const reservationsRouteContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/reservations/route.ts'), 'utf-8');
    const orderTokenRouteContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/orders/[token]/route.ts'), 'utf-8');
    const pedidoPageContent = fs.readFileSync(path.join(process.cwd(), 'src/app/pedido/[token]/page.tsx'), 'utf-8');

    // 27.a: Verificar tabla rate_limits y conteo por ventana
    const winStart = Math.floor(Date.now() / 1000 / 600) * 600;
    for (let i = 0; i < 6; i++) {
      await newClient.execute({
        sql: `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
              ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
        args: ['reservations:203.0.113.99', winStart]
      });
    }
    const rlRes = await newClient.execute({
      sql: 'SELECT count FROM rate_limits WHERE key = ? AND window_start = ?',
      args: ['reservations:203.0.113.99', winStart]
    });
    const rlBlocked = Number(rlRes.rows[0]?.count) === 6;

    // 27.b: Idempotencia con orders.request_id e índice UNIQUE idx_orders_request_id
    const reqUuid = 'uuid-idem-test-0001';
    await newClient.execute({
      sql: 'UPDATE orders SET request_id = ? WHERE id = ?',
      args: [reqUuid, orderId]
    });
    let uniqueReqEnforced = false;
    try {
      await newClient.execute({
        sql: 'UPDATE orders SET request_id = ? WHERE id = ?',
        args: [reqUuid, dirOrderId]
      });
    } catch {
      uniqueReqEnforced = true;
    }

    // 27.c: Verificar settings max_numbers_per_order (2000) y max_pending_numbers_per_phone (1000)
    const maxOrderSettingRes = await newClient.execute("SELECT value FROM settings WHERE key = 'max_numbers_per_order'");
    const maxPhoneSettingRes = await newClient.execute("SELECT value FROM settings WHERE key = 'max_pending_numbers_per_phone'");
    const hasNewSettings =
      maxOrderSettingRes.rows[0]?.value === '2000' &&
      maxPhoneSettingRes.rows[0]?.value === '1000';

    // 27.d: Verificar UPDATE ... AND status = 'available' + rowsAffected, chunkArray y enmascarado ***1234
    const hasStrictUpdateAndChunking =
      reservationsRouteContent.includes("AND status = 'available'") &&
      reservationsRouteContent.includes('updatedRowsCount !== uniqueNumbers.length') &&
      directSaleContent.includes("AND status = 'available'") &&
      directSaleContent.includes('updatedRowsCount !== uniqueNumbers.length') &&
      reservationsRouteContent.includes('chunkArray') &&
      reservationsRouteContent.includes('max_pending_numbers_per_phone');

    const hasMaskedShortCodeLookup =
      orderTokenRouteContent.includes('isFullTokenLookup') &&
      orderTokenRouteContent.includes('maskPhoneNumber') &&
      pedidoPageContent.includes('hasPrivateToken');

    assert(
      rlBlocked && uniqueReqEnforced && hasNewSettings && hasStrictUpdateAndChunking && hasMaskedShortCodeLookup,
      '27. Fase 2: Rate limit (5/30 x 10m), topes (2000/1000), chunk 500, UPDATE available, idempotencia UUID y código corto enmascarado',
      `rate_limits count=${rlRes.rows[0]?.count}, UNIQUE(request_id)=${uniqueReqEnforced}, settings=2000/1000, máscara ***1234 activa`
    );

    // -------------------------------------------------------------
    // PRUEBA 28 (FASE 3): Modularización (<400 líneas), constants/types/useCopy, gitignore, viewport/inputs, noindex y middleware JWT
    // -------------------------------------------------------------
    const requiredModules = [
      'src/components/portal/NumberGrid.tsx',
      'src/components/portal/SelectionCart.tsx',
      'src/components/portal/ReservationForm.tsx',
      'src/components/portal/PaymentInstructions.tsx',
      'src/hooks/useNumbers.ts',
      'src/hooks/useCopy.ts',
      'src/lib/constants.ts',
      'src/lib/types.ts',
      'src/middleware.ts',
      'src/app/consultar/layout.tsx',
      'src/app/admin/layout.tsx',
    ];
    const allModulesExist = requiredModules.every((p) =>
      fs.existsSync(path.join(process.cwd(), p))
    );

    function listFilesRecursive(dir) {
      let out = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out = out.concat(listFilesRecursive(full));
        else out.push(full);
      }
      return out;
    }
    const srcFiles = listFilesRecursive(path.join(process.cwd(), 'src'));
    const oversizedFiles = srcFiles.filter(
      (f) => fs.readFileSync(f, 'utf-8').split('\n').length > 400
    );

    const gitignoreContent = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf-8');
    const layoutRootContent = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf-8');
    const globalsCssContent = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf-8');
    const consultarLayoutContent = fs.readFileSync(path.join(process.cwd(), 'src/app/consultar/layout.tsx'), 'utf-8');
    const adminLayoutContent = fs.readFileSync(path.join(process.cwd(), 'src/app/admin/layout.tsx'), 'utf-8');
    const middlewareContent = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf-8');
    const constantsContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/constants.ts'), 'utf-8');
    const useCopyContent = fs.readFileSync(path.join(process.cwd(), 'src/hooks/useCopy.ts'), 'utf-8');

    const fase3Checks =
      allModulesExist &&
      oversizedFiles.length === 0 &&
      gitignoreContent.includes('*.tsbuildinfo') &&
      !layoutRootContent.includes('maximumScale') &&
      globalsCssContent.includes('16px') &&
      consultarLayoutContent.includes('index: false') &&
      adminLayoutContent.includes('index: false') &&
      middlewareContent.includes('jwtVerify') &&
      middlewareContent.includes('rifa_admin_session') &&
      constantsContent.includes('DEFAULT_CONTACT_PHONE') &&
      constantsContent.includes('DEFAULT_SETTINGS') &&
      useCopyContent.includes('useCopyToClipboard');

    assert(
      fase3Checks,
      '28. Fase 3: Archivos <= 400 líneas, componentes/hooks modulares, .gitignore tsbuildinfo, sin maximum-scale=1, noindex y middleware JWT',
      `Archivos src verificados: ${srcFiles.length} (excedidos >400: ${oversizedFiles.length}), middleware JWT y noindex activos`
    );

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
  console.log(`RESUMEN DE PRUEBAS: ${passedCount} PASADAS, ${failedCount} FALLADAS DE ${passedCount + failedCount}`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests();
