# QuickStart — Deploy en 5 minutos

## 1. Crear repositorio en GitHub

```bash
# Opción A: Desde cero
mkdir finanzas-personales
cd finanzas-personales
git init
git add .
git commit -m "Initial commit"
git branch -M main
# Luego: git remote add origin https://github.com/MIS-FINANZAS-PERSONALES/mis-finanzas-personales.github.io.git
# git push -u origin main
```

## 2. Copiar archivos

```bash
# Descarga todos los archivos de este repo
# Estructura final:
finanzas-personales/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── service-worker.js
│   └── assets/
│       ├── css/styles.css
│       └── js/ (7 archivos)
├── docs/
├── tests/
├── README.md
└── .gitignore
```

## 3. Push a GitHub

```bash
git add .
git commit -m "Add Finanzas Personales app"
git push origin main
```

## 4. Activar GitHub Pages

En tu repositorio:
- ⚙️ Settings → Pages
- **Source:** Deploy from a branch
- **Branch:** main
- **Folder:** / (raíz, o /public si moviste contenido)
- Clic en Save

## 5. Acceder

Espera 1 minuto.

Tu app está en: `https://mis-finanzas-personales.github.io/`

---

## ✅ Verificación

### 1. App carga
- [ ] Ves pantalla de Registro/Login

### 2. Registro funciona
- [ ] Creas usuario + contraseña
- [ ] Te redirige a Dashboard

### 3. Datos se guardan locales
- [ ] Abre DevTools (F12) → Network
- [ ] Registra un movimiento
- [ ] ❌ Ningún request POST/PUT a servidor (✅ solo archivos estáticos)

### 4. Cifrado funciona
- [ ] F12 → Application → IndexedDB → finanzas
- [ ] Tabla "accounts" tiene datos
- [ ] Campo "encrypted" está como números (base64)

### 5. Offline funciona
- [ ] F12 → Network → Offline
- [ ] Recarga página
- [ ] App sigue funcionando
- [ ] Service Worker activado (⚙️ Application → Service Workers)

---

## 🚀 Próximos pasos

1. **Descarga respaldo regularmente** (semanal recomendado)
2. **Protege tu contraseña** (no la olvides = datos irrecuperables)
3. **Comparte el link** con familia (cada uno su contraseña)
4. **Lee PRIVACY.md** para entender garantías

---

## ❌ Troubleshooting

### "Error 404"
- GitHub Pages tardó en activarse (espera 2-3 minutos)
- Verifica que carpeta es `/public` o raíz

### "Service Worker no se instala"
- Abre en pestaña incógnito
- F12 → Application → Clear site data
- Recarga

### "Los datos no se guardan"
- ¿Permitiste IndexedDB? (Chrome → Settings → Cookies)
- ¿Tienes espacio disponible en el navegador? (~50MB en móvil)

### "Perdí mi contraseña"
- Sin base de datos central, sin recuperación
- Solo tienes respaldo descargado (si lo hiciste)

---

## 📞 Support

- Sin servidor = Sin soporte centralizado
- Issues: GitHub Issues del repo
- Documentación: /docs/
