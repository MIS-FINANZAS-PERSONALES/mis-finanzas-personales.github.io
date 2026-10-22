# Privacidad — Finanzas Personales

## Garantías de privacidad

1. **Datos locales:** Todos los datos financieros permanecen en tu dispositivo
2. **Sin servidor central:** No hay backend que almacene tus finanzas
3. **Sin tracking:** No hay analytics ni telemetría
4. **Sin credenciales compartidas:** Cada usuario tiene clave independiente
5. **Sin acceso del desarrollador:** Imposible consultar tus datos remotamente

## Lo que SÍ ocurre

- Descargas archivos estáticos desde GitHub Pages
- Guardas datos cifrados en IndexedDB local
- Descargas respaldo como archivo local
- Consultas el asistente con tus datos locales

## Lo que NO ocurre

- ❌ Envíos de movimientos a un servidor
- ❌ Transmisión de documentos
- ❌ Sincronización en nube
- ❌ Análisis de patrones de gasto
- ❌ Compartición con otros usuarios (excepto que TÚ lo autorices explícitamente)
- ❌ Almacenamiento de contraseña

## Cifrado

- **Algoritmo:** AES-256-GCM
- **Derivación:** PBKDF2(password, salt, 100k iteraciones, SHA-256)
- **IV:** Aleatorio único por registro (12 bytes)
- **Auth tag:** Incluido automáticamente por GCM

## Contraseña

- **Se almacena:** Solo el salt (32 bytes) y IV (12 bytes) en IndexedDB
- **No se almacena:** La contraseña nunca se guarda
- **Derivación:** Cada login regenera la clave
- **Pérdida:** Si olvidas la contraseña, tus datos son irrecuperables

## Respaldo

- **Formato:** JSON sin encripción adicional (tus registros ya están cifrados)
- **Control:** Tú descargarlo, guardarlo, restaurarlo
- **Ubicación:** Tu computadora, iCloud Drive, Mail, o donde quieras
- **Protección:** El archivo contiene solo datos cifrados, no contraseña

## Riesgos residuales

| Riesgo | Protección | Comentario |
|--------|-----------|-----------|
| Otro usuario del navegador | Cierre de sesión | Logout limpia la clave de memoria |
| Acceso físico al dispositivo | Contraseña del SO | iOS/Windows/Mac deben estar protegidas |
| Pérdida de IndexedDB en iOS | Respaldo descargable | Descarga semanal recomendada |
| Malware en el dispositivo | Vigilancia del SO | Responsabilidad del usuario |
| Pérdida de contraseña | Ninguna | Implica pérdida permanente de datos |

## Verificación técnica

### Para verificar que no hay backend

1. Abre DevTools (F12)
2. Pestaña **Network**
3. Realiza cualquier acción (nuevo movimiento, obligación, etc.)
4. **Resultado esperado:** Ninguna request POST/PUT/PATCH a un servidor
5. **Único request:** Posiblemente GET a archivos estáticos (solo al cargar)

### Para verificar que no hay APIs externas

1. **Network tab:** Busca requests a dominios ajenos (`api.example.com`, `analytics.google.com`, etc.)
2. **Resultado esperado:** Ninguna
3. **Excepciones permitidas:** GitHub Pages (código), Cloudflare (CDN), pero NO APIs con datos

### Para verificar clave en memoria

1. DevTools → **Console**
2. `fdb.key` (debe mostrar CryptoKey o null)
3. Realiza logout
4. `fdb.key` (debe mostrar null)

## Hipótesis de amenaza

### Scope de protección

- ✅ Usuario A no puede leer datos de Usuario B (otra persona con otra cuenta)
- ✅ Otro navegador del mismo dispositivo no puede acceder a datos sin contraseña
- ✅ El desarrollador no puede leer datos sin acceso físico
- ✅ ISP no puede ver movimientos financieros (aunque sí que accediste a la app)

### Out of scope

- ❌ Protección contra malware/spyware en el dispositivo
- ❌ Protección contra acceso físico no autorizado al SO
- ❌ Protección contra pérdida de contraseña (sin recoverykey)
- ❌ Protección contra purga de IndexedDB en Safari iOS (mitigation: respaldo semanal)

## Contacto y responsabilidad

- **No hay garantía:** Esta app se proporciona "tal cual"
- **Sin SLA:** No hay soporte técnico centralizado
- **Responsabilidad:** El usuario es responsable de:
  - Proteger su contraseña
  - Descargar respaldos regularmente
  - Proteger su dispositivo
  - Custodiar sus archivos de respaldo
