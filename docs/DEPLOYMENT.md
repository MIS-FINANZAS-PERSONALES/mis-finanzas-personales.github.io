# Deployment — Finanzas Personales

## GitHub Pages (Recomendado)

### Configuración inicial

```bash
# 1. Crea un repositorio en GitHub
# Nombre: finanzas-personales
# Público: SÍ (para que funcione GitHub Pages)

# 2. Clona el repositorio
git clone https://github.com/tuuser/finanzas-personales.git
cd finanzas-personales

# 3. Copia los archivos
# Asegúrate que /public está en la raíz

# 4. Configura GitHub Pages
# Repo → Settings → Pages → Source: "Deploy from a branch"
# Branch: main, folder: /root o /(root)
```

### Para servir desde /public

En GitHub Pages, activa:
- Settings → Pages
- Source: "Deploy from a branch"
- Branch: `main`, folder: `/`

Luego mueve contenido de `/public/*` a raíz del repositorio.

O usa:
```bash
# Copia /public al root
cp -r public/* .
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### Acceso

```
https://tuuser.github.io/finanzas-personales
```

### Actualización

```bash
git add .
git commit -m "Update features"
git push origin main
```

Service Worker se actualiza automáticamente en 24 horas (o manual: Settings → Purge cache).

## Cloudflare Pages (Respaldo)

### Setup

1. Conecta tu GitHub en cloudflare.com
2. Crea proyecto: "finanzas-personales"
3. Build command: (deja vacío, sitio estático)
4. Publish directory: `public`
5. Deploy

### Acceso

```
https://finanzas-personales.pages.dev
```

## Local (desarrollo)

```bash
cd public
python3 -m http.server 8000
```

Abre: `http://localhost:8000`

## Testing

### Prueba de red (privacidad)

```bash
# 1. Abre DevTools (F12)
# 2. Network tab
# 3. Realiza acciones (nuevo movimiento, etc.)
# 4. Busca requests POST/PUT/PATCH
# Resultado esperado: NINGUNO
```

### Prueba de datos

```bash
# 1. Console (F12)
# 2. fdb.userId  // Debe ser un número
# 3. fdb.key     // Debe ser CryptoKey (no null)
# 4. logout()
# 5. fdb.key     // Debe ser null
```

### Prueba de cifrado

```bash
# 1. IndexedDB (F12 → Application → IndexedDB)
# 2. Inspecciona tabla "accounts"
# 3. Busca campo "encrypted" (debe estar cifrado)
# 4. Campo "iv" debe estar presente
```

## Migración desde GitHub Pages a Cloudflare

Sin cambiar datos locales:

1. Actualiza URLs de favoritos
2. Instala PWA nuevamente en dispositivo
3. Descarga respaldo desde GitHub Pages
4. En Cloudflare Pages, importa respaldo

Datos SIEMPRE permanecen locales.

## Limpieza y renovación

### Limpiar caché de Service Worker

```javascript
// Console
caches.keys().then(names => 
  Promise.all(names.map(name => caches.delete(name)))
)
```

### Forzar actualización de SW

```bash
# En settings del SW
# Abre DevTools → Application → Service Workers
# Haz clic en "Update"
```

### Reset completo de app

```javascript
// Console
indexedDB.deleteDatabase('finanzas');
// Recarga la página
```

⚠️ Esto BORRA TODOS LOS DATOS LOCALES. Descarga respaldo primero.

## Monitoreo

GitHub Pages:
- Stats: https://github.com/tuuser/finanzas-personales
- Build logs: Actions tab
- Uptime: Siempre en línea (GitHub)

Cloudflare Pages:
- Analytics: Dashboard
- Build logs: Pages > Deployments
- Uptime: Siempre en línea (Cloudflare)

## Consideraciones de cost

- GitHub Pages: $0 (incluido en GitHub Free)
- Cloudflare Pages: $0 (incluido en Cloudflare Free)
- Dominio personalizado: $0-$12/año (opcional)

Sin backend, sin CDN premium, sin APIs pagas.

## Seguridad en deployment

- ✅ Código público (auditoría)
- ✅ HTTPS forzado (GitHub/Cloudflare)
- ✅ Sin credenciales en código
- ✅ Sin claves de API en repo
- ✅ Sin datos de usuario en repo
