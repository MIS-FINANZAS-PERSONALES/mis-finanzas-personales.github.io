const ITERACIONES = 600000;
const ITERACIONES_LEGADO = 100000;

class FDB {
  constructor() {
    this.db = null;
    this.key = null;
    this.userId = null;
  }

  // v2 agrega presupuestos y metas. nombre permite a los tests usar otra base.
  async init(nombre = 'finanzas') {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(nombre, 2);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        ['accounts', 'transactions', 'obligations', 'documents', 'settings', 'budgets', 'goals'].forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            const os = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
            os.createIndex('userId', 'userId', { unique: false });
            os.createIndex('date', 'date', { unique: false });
          }
        });
      };
    });
  }

  // Usuarios nuevos: 600.000 iteraciones (recomendación OWASP para PBKDF2-SHA256).
  // Los creados antes no guardan el dato y siguen con 100.000.
  async derivaKey(password, salt, iterations = ITERACIONES_LEGADO) {
    const enc = new TextEncoder();
    const material = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, 256);
    return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  async usuarioExiste(username) {
    const s = this.db.transaction('settings', 'readonly').objectStore('settings');
    return new Promise((resolve, reject) => {
      const req = s.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result.some(st => st.username === username));
    });
  }

  async registro(username, password) {
    if (await this.usuarioExiste(username)) throw new Error('Ese usuario ya existe en este dispositivo');
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const key = await this.derivaKey(password, salt, ITERACIONES);
    const enc = new TextEncoder();
    const msg = enc.encode(JSON.stringify({ username, createdAt: new Date().toISOString() }));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, msg);
    const setting = {
      username,
      salt: Array.from(salt),
      iterations: ITERACIONES,
      iv: Array.from(iv),
      encrypted: Array.from(new Uint8Array(encrypted)),
      createdAt: new Date().toISOString()
    };
    const s = this.db.transaction('settings', 'readwrite').objectStore('settings');
    return new Promise((resolve, reject) => {
      const req = s.add(setting);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.userId = req.result;
        this.key = key;
        resolve(this.userId);
      };
    });
  }

  async login(username, password) {
    const s = this.db.transaction('settings', 'readonly').objectStore('settings');
    return new Promise((resolve, reject) => {
      const req = s.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = async () => {
        const settings = req.result.find(st => st.username === username);
        if (!settings) return reject(new Error('Usuario no encontrado'));
        try {
          const salt = new Uint8Array(settings.salt);
          const key = await this.derivaKey(password, salt, settings.iterations || ITERACIONES_LEGADO);
          const iv = new Uint8Array(settings.iv);
          const encrypted = new Uint8Array(settings.encrypted);
          await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
          this.userId = settings.id;
          this.key = key;
          resolve(this.userId);
        } catch (e) {
          reject(new Error('Contraseña incorrecta'));
        }
      };
    });
  }

  async cifra(data) {
    if (!this.key) throw new Error('No autenticado');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const msg = enc.encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, msg);
    return { iv: Array.from(iv), encrypted: Array.from(new Uint8Array(encrypted)) };
  }

  async descifra(iv, encrypted) {
    if (!this.key) throw new Error('No autenticado');
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      this.key,
      new Uint8Array(encrypted)
    );
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  }

  // Sal e iteraciones PBKDF2 del usuario en sesión; se guardan en el respaldo
  // para poder re-derivar la clave con la contraseña en otro dispositivo.
  async kdfActual() {
    const s = this.db.transaction('settings', 'readonly').objectStore('settings');
    return new Promise((resolve, reject) => {
      const req = s.get(this.userId);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => req.result
        ? resolve({ salt: req.result.salt, iterations: req.result.iterations || ITERACIONES_LEGADO })
        : reject(new Error('No autenticado'));
    });
  }

  async descifraConPassword(password, salt, iterations, iv, encrypted) {
    const key = await this.derivaKey(password, new Uint8Array(salt), iterations);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(encrypted)
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  // Con data.id actualiza ese registro; sin id crea uno nuevo.
  // El id vive en el registro de IndexedDB, no dentro del contenido cifrado.
  async guarda(table, data) {
    const { id, ...contenido } = data;
    contenido.userId = this.userId;
    const { iv, encrypted } = await this.cifra(contenido);
    const record = { userId: this.userId, date: new Date().toISOString(), iv, encrypted };
    if (id !== undefined) record.id = id;
    const tx = this.db.transaction(table, 'readwrite').objectStore(table);
    return new Promise((resolve, reject) => {
      const req = id !== undefined ? tx.put(record) : tx.add(record);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async obten(table, id) {
    const tx = this.db.transaction(table, 'readonly').objectStore(table);
    return new Promise((resolve, reject) => {
      const req = tx.get(id);
      req.onerror = () => reject(req.error);
      req.onsuccess = async () => {
        if (!req.result || req.result.userId !== this.userId) return resolve(null);
        const data = await this.descifra(req.result.iv, req.result.encrypted);
        resolve({ ...data, id: req.result.id });
      };
    });
  }

  async lista(table) {
    const tx = this.db.transaction(table, 'readonly').objectStore(table);
    const index = tx.index('userId');
    return new Promise((resolve, reject) => {
      const req = index.getAll(this.userId);
      req.onerror = () => reject(req.error);
      req.onsuccess = async () => {
        try {
          const records = await Promise.all(req.result.map(async r => ({ ...(await this.descifra(r.iv, r.encrypted)), id: r.id })));
          resolve(records);
        } catch (e) {
          reject(e);
        }
      };
    });
  }

  async borra(table, id) {
    if (!(await this.obten(table, id))) throw new Error('Registro no encontrado');
    const tx = this.db.transaction(table, 'readwrite').objectStore(table);
    return new Promise((resolve, reject) => {
      const req = tx.delete(id);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async limpia() {
    this.key = null;
    this.userId = null;
  }
}

const fdb = new FDB();
