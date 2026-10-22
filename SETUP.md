# SETUP — Instrucciones de instalación

## Estado actual

**Codebase completa generada:** Todas las 7 etapas están listas.

```
Etapa 1: ✅ Infraestructura y autenticación
Etapa 2: ✅ Base de datos y almacenamiento (IndexedDB + Crypto)
Etapa 3: ✅ Módulo financiero (cálculos)
Etapa 4: ✅ UI/UX (vistas)
Etapa 5: ✅ OCR (stub con capacidad de cargar archivos)
Etapa 6: ✅ Backup/restauración cifrado
Etapa 7: ✅ Testing y deployment
```

## Archivos clave

### Frontend (en `/public`)
- `index.html` — Punto de entrada
- `manifest.json` — Configuración PWA
- `service-worker.js` — Caché offline
- `assets/css/styles.css` — Estilos responsive
- `assets/js/*.js` — Lógica de la app (7 módulos)

### Documentación (en `/docs`)
- `ARCHITECTURE.md` — Diseño técnico completo
- `PRIVACY.md` — Garantías y limitaciones de privacidad
- `FINANCIAL_MODEL.md` — Lógica de cálculos financieros (con casos de prueba)
- `DEPLOYMENT.md` — Cómo desplegar en GitHub Pages / Cloudflare

### Guías rápidas (en raíz)
- `README.md` — Overview
- `QUICKSTART.md` — Deploy en 5 minutos
- `CHANGELOG.md` — Historial de cambios
- `SETUP.md` — Este archivo

### Testing
- `tests/test.html` — Tests unitarios (abre en navegador)

---

## Pasos para empezar

### Opción A: GitHub Pages (RECOMENDADA)

#### 1. Crear repositorio

```bash
# En GitHub.com
- New repository
- Name: "finanzas-personales"
- Public: SÍ
- Create repository
```

#### 2. Clonar y subir código

```bash
# En tu terminal
git clone https://github.com/TUUSER/finanzas-personales.git
cd finanzas-personales

# Copia los archivos generados a esta carpeta
# (deberías tener /public, /docs, /tests, README.md, etc.)

git add .
git commit -m "Initial commit: Finanzas Personales MVP"
git push -u origin main
```

#### 3. Activar GitHub Pages

```
En GitHub.com → Tu repositorio → Settings → Pages
- Source: "Deploy from a branch"
- Branch: main
- Folder: / (raíz)
- Clic Save
```

#### 4. Acceder

Después de 1-2 minutos:
```
https://TUUSER.github.io/finanzas-personales
```

---

### Opción B: Local (para desarrollo)

```bash
cd finanzas-personales/public
python3 -m http.server 8000
```

Abre: `http://localhost:8000`

---

## ✅ Verificación post-deploy

### 1. App carga
- [ ] Ves pantalla "Finanzas Personales" con botones Registro/Login

### 2. Registro funciona
- [ ] Usuario: "testuser"
- [ ] Contraseña: "testpass123"
- [ ] Confirmar: "testpass123"
- [ ] Clic "Crear cuenta"
- [ ] ✅ Te redirige al Dashboard

### 3. Dashboard muestra ceros
- [ ] Dinero disponible: $0
- [ ] Dinero comprometido: $0
- [ ] Proyección: $0

### 4. Privacidad verificada (DevTools)
```
F12 → Network tab
1. Realiza una acción (click "Nueva Cuenta")
2. Busca requests POST/PUT/PATCH
3. ❌ No debe haber ninguno
4. ✅ Solo GETs a archivos estáticos
```

### 5. Cifrado funcionando
```
F12 → Application → IndexedDB → finanzas
1. Tabla "accounts"
2. Inspecciona un registro
3. Campo "encrypted": debe ser [números] (base64)
4. Campo "iv": debe estar presente
```

### 6. Offline funciona
```
F12 → Network → Throttling → Offline
1. Página sigue funcionando
2. Puedes ver datos
3. Service Worker activado: ✅ en Application → Service Workers
```

---

## ⚠️ Antes de usar con datos reales

1. **Lee PRIVACY.md** — Entiende qué está protegido y qué no
2. **Descarga respaldo semanal** — Rutina obligatoria para no perder datos
3. **Usa contraseña fuerte** — 12+ caracteres con números/símbolos
4. **Protege tu dispositivo** — El OS debe tener contraseña
5. **No compartas contraseña** — Cada usuario su propia contraseña

---

## 🚀 Próximos pasos recomendados

### Inmediato
- [ ] Verifica funcionamiento (pasos ✅ arriba)
- [ ] Comparte link con familia
- [ ] Descarga tu primer respaldo

### Corto plazo
- [ ] Registra tus cuentas actuales (saldos iniciales)
- [ ] Importa últimos 3 meses de movimientos
- [ ] Configura obligaciones conocidas

### Mediano plazo
- [ ] Crea rutina de respaldo (semanal, sábados)
- [ ] Usa asistente para revisar proyecciones
- [ ] Invita padres / familia a crear cuentas propias

### Largo plazo
- [ ] Monitoreo de tendencias
- [ ] Ajuste de presupuestos
- [ ] Mejora de interfaz según feedback

---

## 📞 Soporte

### Si algo no funciona

1. **Abre DevTools (F12)** → Console → busca errores rojos
2. **Limpia caché:**
   ```javascript
   // En Console
   caches.keys().then(names => 
     Promise.all(names.map(name => caches.delete(name)))
   )
   // Recarga
   ```
3. **Reset completo (⚠️ borra datos):**
   ```javascript
   // En Console
   indexedDB.deleteDatabase('finanzas')
   // Recarga
   ```
4. **Abre GitHub Issues** en el repositorio

### Datos perdidos

- Sin servidor central = sin recuperación de datos
- **Única opción:** Restaurar desde respaldo descargado
- **Prevención:** Descarga respaldo CADA SEMANA

---

## 📊 Checklist final

- [ ] Repositorio en GitHub creado
- [ ] Archivos pusheados
- [ ] GitHub Pages activado
- [ ] App carga en navegador
- [ ] Registro funciona
- [ ] Dashboard visible
- [ ] Network tab: sin datos sensibles transmitidos
- [ ] IndexedDB: datos cifrados
- [ ] Service Worker: activado
- [ ] PRIVACY.md: leído y entendido
- [ ] Primer respaldo: descargado

---

**Estado:** MVP listo para producción local.

**Próxima fase:** Si necesitas OCR con Tesseract.js o asistente con IA, son extensiones del código actual.

¡Éxito! 🚀
