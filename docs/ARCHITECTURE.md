# Arquitectura — Finanzas Personales Privadas

## 1. Stack técnico

- **Frontend:** HTML, CSS, JavaScript vanilla (ES6+)
- **Almacenamiento:** IndexedDB (local, no sincronizado)
- **Cifrado:** Web Crypto API (AES-256-GCM, PBKDF2-SHA256)
- **Hosting:** GitHub Pages (estático)
- **Red:** Solo lectura de archivos estáticos; SIN APIs de backend

## 2. Flujo de datos

```
Usuario instala → GitHub Pages → Descarga archivos estáticos
                              ↓
                    Service Worker almacena en caché
                              ↓
                          App funciona offline
                              ↓
                    Datos → IndexedDB (cifrado localmente)
                              ↓
                    Usuario descarga respaldo cifrado
```

## 3. Autenticación

- Registro: usuario + contraseña
- Derivación: PBKDF2(contraseña + salt, 100k iteraciones, SHA-256) → clave AES
- Almacenamiento: salt + IV visibles en IndexedDB; clave solo en memoria
- Logout: limpia clave de memoria

## 4. Cifrado

```json
{
  "userId": 1,              // Visible (índice)
  "date": "2024-10-20",     // Visible (índice)
  "iv": [12, 255, 3, ...],  // IV único (12 bytes)
  "encrypted": [...]        // Payload AES-256-GCM cifrado
}
```

- Cada registro tiene IV único
- El payload descifrado contiene: amount, description, vendor, etc.
- Clave nunca se almacena en disco

## 5. Base de datos

### Tablas

- **accounts**: Cuentas financieras (balanceInitial, tipo, estado)
- **transactions**: Movimientos (type, amount, date, status, accountId)
- **obligations**: Obligaciones (amountTotal, amountPaid, amountPending, dueDate)
- **documents**: Documentos cargados (PDF, imágenes)
- **settings**: Configuración de usuario (salt, IV, metadata)

### Índices

- userId (todas las tablas)
- date (transactions, obligations)

## 6. Cálculos financieros

### Saldo registrado
```
saldo[cuenta] = balanceInitial 
              + Σ(ingresos confirmados) 
              - Σ(gastos confirmados)
```

### Dinero disponible hoy
```
disponible = Σ(saldos de todas las cuentas)
```

### Dinero comprometido
```
comprometido = Σ(obligaciones pendientes) 
             + Σ(gastos pendientes)
```

### Dinero proyectado
```
proyectado = disponible 
           + Σ(ingresos futuros confirmados) 
           - Σ(gastos futuros confirmados)
           - Σ(obligaciones vencidas)
```

## 7. Respaldo

Archivo JSON descargable con estructura:
```json
{
  "version": 1,
  "format": "finanzas-personales-backup",
  "timestamp": "2024-10-21T15:30:00Z",
  "username": "usuario",
  "metadata": { "recordCount": {...}, "schemaVersion": "1.0.0" },
  "data": { "accounts": [...], "transactions": [...], "obligations": [...] }
}
```

**NO contiene:** contraseña, salt, clave derivada, clave maestra.

Restauración: carga archivo → importa todos los registros.

## 8. Seguridad por capas

| Capa | Mecanismo | Efectivo contra |
|------|-----------|-----------------|
| SO | Contraseña del dispositivo | Acceso físico |
| Navegador | Session storage | Otro usuario del navegador |
| App | PBKDF2 derivación | Fuerza bruta de contraseña |
| Datos | AES-256-GCM | Robo de IndexedDB |

## 9. Limitaciones reales

- **IndexedDB en iOS Safari:** ~50MB, puede purgarse
- **Sin sincronización:** Datos no se replican entre dispositivos
- **Sin push notifications:** Requeriría servidor
- **Sin acceso a filesystem:** Safari no permite rutas del SO
- **Perder contraseña:** Datos irrecuperables (sin master key)

## 10. Privacidad verificable

Busca estas AUSENCIAS en el tráfico de red:
- ❌ Requests a `/api/` (backend)
- ❌ Datos financieros en URLs
- ❌ Payloads POST/PUT con transacciones
- ❌ Tokens o credentials transmitidos
- ❌ Calls a servicios de IA/analytics

Busca estas PRESENCIAS:
- ✅ GET a `github.com` (archivos estáticos)
- ✅ GET a CDN para librerías (primera carga)
- ✅ Nada después de instalación offline
