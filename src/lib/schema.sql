-- ========================================================
-- PROYECTO RIFA - ESQUEMA DE BASE DE DATOS (LibSQL / SQLite)
-- Optimizado para 80.000 números con integridad transaccional
-- ========================================================

-- Tabla de Configuración Global del Sorteo
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Administradores (Esposo y Esposa con credenciales individuales)
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Tabla de Compradores (Datos centralizados y protegidos)
CREATE TABLE IF NOT EXISTS buyers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_buyers_phone ON buyers(phone);
CREATE INDEX IF NOT EXISTS idx_buyers_name ON buyers(name);

-- Tabla de Pedidos / Solicitudes
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,                      -- Ej: RF-A893K
    buyer_id INTEGER NOT NULL REFERENCES buyers(id),
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('cash', 'transfer')) NOT NULL,
    payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'cancelled', 'expired')) NOT NULL DEFAULT 'pending',
    unit_price INTEGER NOT NULL,                   -- Precio unitario histórico al momento de la orden
    numbers_count INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    numbers_list TEXT NOT NULL,                     -- Lista JSON con los números asignados: [1, 2, ...]
    private_token TEXT UNIQUE NOT NULL,             -- Token criptográfico seguro para URL privada
    expires_at DATETIME NOT NULL,
    is_direct_sale INTEGER NOT NULL DEFAULT 0,      -- 1 si fue venta directa presencial por admin
    created_by_admin TEXT,                          -- Usuario del admin si fue venta directa
    paid_at DATETIME,
    confirmed_by_admin TEXT,                        -- Usuario del admin que verificó el pago
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(private_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_expires ON orders(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- Tabla de 80.000 Números
CREATE TABLE IF NOT EXISTS numbers (
    number INTEGER PRIMARY KEY,                     -- Del 1 al 80000
    status TEXT CHECK(status IN ('available', 'reserved', 'sold')) NOT NULL DEFAULT 'available',
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_numbers_status ON numbers(status);
CREATE INDEX IF NOT EXISTS idx_numbers_order ON numbers(order_id);

-- Tabla de Auditoría (Registro inmutable de acciones sensibles)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,                           -- Ej: CONFIRM_PAYMENT, CANCEL_ORDER, DIRECT_SALE, UPDATE_SETTINGS, RELEASE_EXPIRED
    details TEXT NOT NULL,                          -- JSON con detalles de la operación
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs(admin_username);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
