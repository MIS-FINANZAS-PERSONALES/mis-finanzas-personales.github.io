# Changelog

## [2.0.0] — 2026-10-21

### ✨ Funcionalidades
- Pestañas: Resumen, Movimientos, Presupuesto, Deudas, Metas, Salud financiera
- Tarjetas de crédito y préstamos como pasivos (tasa EA, cuota mínima, cupo); no cuentan como dinero disponible
- Patrimonio neto (activos − deudas)
- Categorías de ingreso y gasto agrupadas en necesidades / deseos
- Transferencias entre cuentas propias (incluye pago de tarjeta)
- Lista de movimientos por mes con filtros, edición y borrado
- Presupuesto mensual por categoría, regla 50/30/20 y presupuesto sugerido (mantiene necesidades, recorta deseos hasta ahorrar 20 %)
- Simulador de deudas: solo mínimos, avalancha y bola de nieve
- Fondo de emergencia (3–12 meses de gastos esenciales) y metas de ahorro
- Puntaje de salud financiera (0–100), indicadores y recomendaciones priorizadas
- Gráficos de ingresos vs. gastos y de gasto vs. presupuesto
- Aviso si llevas más de 7 días sin descargar respaldo

### 🐛 Correcciones
- El respaldo ahora se descarga cifrado (antes salía en texto plano)
- Saldos por cuenta, pagos de obligaciones y proyección ya no se duplican ni se mezclan
- Rutas relativas: funciona en GitHub Pages dentro de una subcarpeta
- No se puede registrar dos veces el mismo usuario

### 🗄️ Datos
- IndexedDB versión 2 (tablas `budgets` y `goals`); los datos de la v1 se conservan
- Respaldo formato v2; los respaldos v1 se siguen aceptando

## [1.0.0] — 2026-10-21

### ✨ Funcionalidades

**Autenticación**
- Registro de usuario con contraseña (8+ caracteres)
- Login con autenticación local
- Derivación de clave PBKDF2 (100k iteraciones)

**Almacenamiento**
- IndexedDB con cifrado AES-256-GCM
- IV único por registro
- Clave en memoria durante sesión

**Finanzas**
- Registro de cuentas (Corriente, Ahorros, TC, Efectivo)
- Ingresos y gastos
- Obligaciones con pagos parciales
- Cálculo de saldo registrado
- Proyección de liquidez (30 días)
- Dinero disponible y comprometido

**Interfaz**
- Dashboard con métricas principales
- Formularios modales para datos
- Responsive (mobile + desktop)
- Dark mode (automático según SO)

**Respaldo**
- Descarga de respaldo como JSON
- Restauración desde archivo
- Respaldo descifrado (datos ya cifrados en DB)

**Asistente**
- Consultas determinísticas
- Análisis de saldos, obligaciones, proyecciones
- Sin IA externa (MVP)

### 🔒 Seguridad

- Autenticación local (sin servidor)
- Cifrado AES-256-GCM
- PBKDF2 con 100k iteraciones
- Clave solo en memoria
- Sin telemetría
- Sin APIs externas con datos

### 📊 Estructura

- 7 archivos JS (auth, db, finance, ui, backup, ocr, assistant)
- 1 CSS responsive
- IndexedDB con 5 tablas
- Service Worker para offline
- 0 dependencias externas

### 📱 Dispositivos

- ✅ iPhone Safari
- ✅ Windows Chrome/Edge/Firefox
- ✅ macOS Chrome/Safari/Firefox
- ✅ Android Chrome

### ⚠️ Limitaciones conocidas

- IndexedDB ~50MB en iOS
- No sincronización en nube
- No notificaciones con app cerrada
- No acceso a filesystem del SO
- Perder contraseña = datos irrecuperables

---

## Roadmap futuro

- [ ] Etapa 2: OCR con Tesseract.js local
- [ ] Etapa 3: Importación de CSV
- [ ] Etapa 4: Asistente con IA local
- [ ] Etapa 5: Gráficos de tendencias
- [ ] Etapa 6: Presupuestos y alertas
- [ ] Etapa 7: Sincronización opcional E2E

---

## Notas de desarrollo

**No realizar cambios**:
- ❌ Agregar backend
- ❌ Agregar APIs externas de datos
- ❌ Compartición sin consentimiento explícito
- ❌ Telemetría
- ❌ Dependencias con vulnerabilidades conocidas

**Sí realizar**:
- ✅ Mejoras de UI
- ✅ Optimizaciones de rendimiento
- ✅ Más casos de test
- ✅ Documentación
- ✅ Soporte de navegadores adicionales
