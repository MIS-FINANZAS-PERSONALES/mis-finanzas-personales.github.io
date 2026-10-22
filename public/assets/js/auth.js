class Auth {
  constructor() {
    this.usuario = null;
    this.autenticado = false;
  }

  // Pide al navegador no borrar los datos cuando falte espacio
  // (Safari en iPhone los purga si la app no se usa en semanas).
  async pidePersistencia() {
    try {
      if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) {
        await navigator.storage.persist();
      }
    } catch (e) { /* no soportado */ }
  }

  async registro(username, password, passwordConfirm) {
    if (!username || !password) throw new Error('Completa todos los campos');
    if (password !== passwordConfirm) throw new Error('Las contraseñas no coinciden');
    if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

    await fdb.registro(username, password);
    this.usuario = username;
    this.autenticado = true;
    this.pidePersistencia();
    return { ok: true, usuario: username };
  }

  async login(username, password) {
    if (!username || !password) throw new Error('Completa todos los campos');
    await fdb.login(username, password);
    this.usuario = username;
    this.autenticado = true;
    this.pidePersistencia();
    sessionStorage.setItem('usuario', username);
    return { ok: true, usuario: username };
  }

  logout() {
    fdb.limpia();
    this.usuario = null;
    this.autenticado = false;
    sessionStorage.removeItem('usuario');
  }

  estaAutenticado() {
    return this.autenticado && fdb.userId !== null;
  }
}

const auth = new Auth();
