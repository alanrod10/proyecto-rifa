# Manual de Operación para Administradores
## Proyecto RIFA (100.000 Números)

Este manual está diseñado para **Alan** e **Yilda**, administradores del sistema, para guiar la operativa diaria de la rifa familiar desde cualquier teléfono celular o computadora.

---

## 1. Acceso al Panel Administrativo

- **Dirección Web en Producción:** [https://proyecto-rifa.vercel.app/admin/login](https://proyecto-rifa.vercel.app/admin/login)  
  *(En caso de ejecución local: `http://localhost:3000/admin/login`)*.
- **Cuentas Individuales:**
  - **Administrador 1:** Usuario `alan` | Nombre visible: **Alan**
  - **Administradora 2:** Usuario `yilda` *(también identificada históricamente como `esposa`)* | Nombre visible: **Yilda**
- **Permisos:** Ambas cuentas tienen facultades completas e independientes. El sistema registra en el historial de auditoría el nombre exacto de la persona que realizó cada cobro, anulación o ajuste.
- **Cómo Cambiar tu Contraseña:**
  - **Desde la Web (Recomendado):** Ingresá al panel, hacé clic en **Configuración** (`/admin/configuracion`), bajá hasta la sección **Seguridad de Mi Cuenta**, escribí tu contraseña actual, la nueva clave (mínimo 8 caracteres) y confirmá el cambio.
  - **Desde la Consola:** Ejecutá de forma interactiva:
    ```bash
    npm run change-password alan
    # o para Yilda:
    npm run change-password yilda
    ```
    El script solicitará la contraseña de manera enmascarada con asteriscos (`*`) para que no quede expuesta en el historial.

---

## 2. Pantallas y Operaciones Diarias

### A. Dashboard y Resumen General (`/admin`)
Al ingresar, verás la situación en tiempo real de la rifa:
- **Números Vendidos:** Cantidad de boletos confirmados y porcentaje de avance sobre los 100.000.
- **Números Reservados:** Boletos apartados a la espera de comprobante de pago.
- **Números Disponibles:** Boletos libres para reserva pública o venta directa.
- **Recaudación Efectiva:** Total cobrado desglosado entre **Efectivo** y **Transferencia Bancaria**.
- **Dinero Pendiente:** Importe total de las reservas activas aún no acreditadas.
- **Botón "Liberar Vencidos":** Permite forzar la liberación manual de aquellas reservas que superaron las 48 horas de vigencia sin comprobante.

---

### B. Solicitudes Web (`/admin/solicitudes`)
Aquí llegan las reservas realizadas por los compradores a través del portal público:
1. El comprador aparta números y se le asigna un plazo de 48 horas.
2. El comprador envía su comprobante por WhatsApp.
3. **Verificación bancaria estricta:** Antes de confirmar, abrí la aplicación de tu banco o billetera virtual (Mercado Pago, banco, etc.) y asegurate de que los fondos figuren efectivamente acreditados.
4. En **Solicitudes Web**, buscá al comprador por su nombre, teléfono o código de orden (ejemplo: `RF-A1B2C3`).
5. Hacé clic en el botón verde **Confirmar Pago**.
   - El pedido cambia inmediatamente a **Pagado**.
   - Los números pasan a estado **Vendido** de forma definitiva.
   - El monto se suma a la recaudación oficial.
6. Si el comprador decide no pagar o se venció el plazo, podés hacer clic en **Cancelar Reserva** para devolver los números al público.

---

### C. Registro de Ventas Directas en Mano (`/admin/ventas`)
Cuando una persona te compra números personalmente (cara a cara o por llamado telefónico):
1. Ingresá a **Ventas Directas**.
2. Completá los campos:
   - **Nombre y Apellido** del comprador.
   - **Teléfono Celular** (sin prefijo 54 ni 15; el sistema lo normaliza automáticamente).
   - **Números deseados:** Podés escribir números específicos separados por coma o usar los botones rápidos `+1 al azar`, `+3 al azar`, `+5 al azar` o `+10 al azar`.
   - **Medio de Pago:** Seleccioná *Efectivo* o *Transferencia*.
   - **Estado:**
     - Marcá **✓ Pagado ahora** si ya te entregó el dinero.
     - Marcá **⏳ Pendiente** si acordaron el pago para más tarde.
3. Presioná **Confirmar y Guardar Venta**.
4. En pantalla aparecerá el comprobante generado con botones directos para **Copiar enlace privado** o **Abrir comprobante**.

---

### D. Directorio de Compradores (`/admin/compradores`)
Esta sección agrupa todas las compras realizadas por una misma persona según su número de teléfono:
- **Búsqueda Rápida:** Escribí parte del nombre o teléfono para localizar al comprador.
- **Resumen Unificado:** Muestra la lista de todos los números que tiene pagados, los que tiene pendientes y el total de dinero abonado.
- **Recuperar Comprobante Perdido:** Si un comprador extravió su enlace privado, podés desplegar su ficha y pulsar **Copiar Enlace** para reenviárselo.
- **Enviar Resumen Completo por WhatsApp:** El botón verde **WhatsApp con Resumen Total** abre un chat directo con el comprador conteniendo un mensaje prearmado que lista todos sus números adquiridos.

---

### E. Gestor Global de Números (`/admin/numeros`)
Permite conocer el estado exacto de cualquiera de los 100.000 números:
- Ingresá un número puntual (del 1 al 100000) o filtrá por estado (*Disponibles*, *Reservados*, *Vendidos*).
- Podés ver a qué orden pertenece cada número y el nombre del comprador que lo adquirió.

---

### F. Modificación de Ajustes y Datos Bancarios (`/admin/configuracion`)
Permite actualizar la información visible en el portal público sin necesidad de asistencia técnica:
- **Premios:** Texto con los premios que se sortearán (actualizable a medida que se definan).
- **Fecha y Modalidad del Sorteo:** Explicación de cómo y cuándo se efectuará el sorteo.
- **Datos de Transferencia Bancaria:** Alias, CBU, Banco y Nombre del Titular de la cuenta receptora.
- **Teléfonos de Contacto de WhatsApp:**
  - Teléfono principal: Alan (`3884152040`).
  - Teléfono secundario: Yilda (`3884141514`).
- **Plazo de Reserva:** Cantidad de horas antes de que venza una reserva no abonada (por defecto 48 hs).
- **Habilitar/Pausar Reservas:** Interruptor para abrir o cerrar temporalmente la recepción de pedidos en la web.
- Hacé clic en **Guardar Configuración** para aplicar los cambios de forma instantánea.

---

### G. Registro de Auditoría (`/admin/auditoria`)
Registra cada acción sensible realizada en el sistema:
- Quién inició sesión.
- Quién confirmó un cobro o canceló un pedido.
- Quién registró una venta directa.
- Quién modificó los precios o datos bancarios.
- Fecha, hora exacta e IP de conexión.

---

### H. Exportar Planillas a Excel y Descargar Respaldos
1. **Exportación a CSV:**
   - En el Dashboard o en los listados, hacé clic en **Exportar CSV**.
   - Se descargará un archivo compatible con Microsoft Excel conteniendo órdenes, números, compradores e importes.
2. **Descarga de Copia de Seguridad:**
   - En **Configuración** (`/admin/configuracion`), hacé clic en **Descargar Copia de Seguridad**.
   - El sistema generará un archivo `.json` completo con todos los datos y compradores de la rifa para resguardar en tu computadora o pendrive.

---

## 3. Protocolo de Seguridad para Administradores

1. **Verificación bancaria real:** Jamás confirmes un pago guiándote únicamente por una captura de pantalla de WhatsApp. Las capturas pueden ser editadas; verificá siempre que el dinero haya ingresado en tu cuenta bancaria.
2. **Uso individual de cuentas:** No compartan usuarios entre sí. Cada uno debe ingresar con su propio nombre (`alan` e `yilda`) para asegurar que el registro de auditoría sea verídico.
3. **Respaldo periódico:** Descarguen semanalmente la copia de seguridad desde el panel de Configuración y guárdenla en una carpeta segura.
