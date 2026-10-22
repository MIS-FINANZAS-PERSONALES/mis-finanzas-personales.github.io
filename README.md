# Finanzas Personales Privadas

**App:** https://mis-finanzas-personales.github.io/

PWA local-first para gestión de finanzas personales. Todo los datos permanecen en tu dispositivo.

## Instalación rápida

### GitHub Pages
```bash
git clone https://github.com/MIS-FINANZAS-PERSONALES/mis-finanzas-personales.github.io.git
cd mis-finanzas-personales.github.io
git push origin main
```

Accede a: `https://mis-finanzas-personales.github.io/`

### Instalación local
```bash
cd public
python3 -m http.server 8000
```

Abre: `http://localhost:8000`

## Características

- ✅ Autenticación local (contraseña derivada con PBKDF2)
- ✅ Cifrado AES-256-GCM para todos los datos
- ✅ Cuentas (corriente, ahorros, efectivo, inversión) y deudas (tarjeta, préstamo) con tasa EA
- ✅ Ingresos y gastos por categoría, transferencias, edición y borrado
- ✅ Presupuesto mensual por categoría con regla 50/30/20 y presupuesto sugerido
- ✅ Plan de pago de deudas: avalancha vs. bola de nieve, fecha de salida e intereses
- ✅ Fondo de emergencia y metas de ahorro con aporte mensual necesario
- ✅ Puntaje de salud financiera, indicadores y recomendaciones
- ✅ Patrimonio neto y proyección de liquidez a 30 días
- ✅ Respaldo descargable cifrado (requiere la contraseña para restaurar)
- ✅ Funciona offline
- ✅ Sin servidor, sin nube, sin datos compartidos

## Estructura

```
finanzas-personales/
├── public/                 # Archivos PWA
│   ├── index.html
│   ├── manifest.json
│   ├── service-worker.js
│   └── assets/
│       ├── css/styles.css
│       └── js/
│           ├── app.js
│           ├── auth.js
│           ├── db.js
│           ├── finance.js
│           ├── ui.js
│           ├── backup.js
│           ├── ocr.js
│           └── assistant.js
├── docs/                   # Documentación
└── tests/                  # Tests
```

## Seguridad

- Contraseña derivada con PBKDF2 (100,000 iteraciones)
- Datos cifrados con AES-256-GCM
- IV único por registro
- Clave solo en memoria durante sesión
- No hay backend, no hay cookies, no hay tracking

## Limitaciones

- IndexedDB en iOS Safari: ~50MB max
- Recomendación: Descarga respaldo semanal
- Sin notificaciones con app cerrada

## Primeros pasos

1. Crea una cuenta (usuario + contraseña de 8+ caracteres)
2. Crea una cuenta financiera (saldo inicial)
3. Registra movimientos (ingresos/gastos)
4. Descarga respaldo cada semana
5. Usa el asistente para consultas

## Migración a otro dispositivo

1. Descarga respaldo en dispositivo original
2. Instala app en nuevo dispositivo
3. Crea nueva cuenta
4. Sube el archivo de respaldo desde la app

## Contacto

Sin servidor central = sin soporte técnico centralizado. Si encuentras un bug, abre un issue en GitHub.
