// Escapa texto del usuario antes de insertarlo con innerHTML.
function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dinero(n) {
  const v = Math.round(n || 0);
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('es-CO');
}

// Estado con ícono + texto: el color nunca va solo.
const ESTADOS = {
  critico: { icono: '✖', etiqueta: 'Crítico' },
  alerta: { icono: '▲', etiqueta: 'Atención' },
  bien: { icono: '✔', etiqueta: 'Bien' },
  info: { icono: 'ℹ', etiqueta: 'Sugerencia' }
};

function estado(nivel, texto) {
  const e = ESTADOS[nivel];
  return `<span class="estado estado-${nivel}"><span aria-hidden="true">${e.icono}</span> ${esc(texto || e.etiqueta)}</span>`;
}

const $id = id => document.getElementById(id);
const valorNum = id => parseFloat($id(id).value);

const PESTANAS = [
  { id: 'resumen', nombre: 'Resumen' },
  { id: 'movimientos', nombre: 'Movimientos' },
  { id: 'presupuesto', nombre: 'Presupuesto' },
  { id: 'deudas', nombre: 'Deudas' },
  { id: 'metas', nombre: 'Metas' },
  { id: 'salud', nombre: 'Salud financiera' }
];

class UI {
  constructor() {
    this.app = $id('app');
    this.tab = 'resumen';
    this.mesMov = mesDe(fechaLocal());
    this.mesPres = mesDe(fechaLocal());
    this.filtros = { cuenta: '', categoria: '', tipo: '' };
    this.planDeuda = { extra: 0 };
  }

  pantallaPrincipal() {
    charts.initTooltip();
    if (!auth.estaAutenticado()) return this.pantallaLogin();
    return this.render();
  }

  // ---------- Acceso ----------

  pantallaLogin() {
    this.app.innerHTML = `
      <div style="max-width:400px;margin:4rem auto;">
        <div class="card">
          <h1 style="text-align:center;margin-bottom:0.5rem;">Finanzas Personales</h1>
          <p class="muted" style="text-align:center;margin-bottom:1.5rem;">Tus datos se guardan cifrados solo en este dispositivo.</p>
          <div class="row" style="margin-bottom:1.5rem;">
            <button class="btn btn-secondary" onclick="ui.mostrarLogin()">Entrar</button>
            <button class="btn btn-secondary" onclick="ui.mostrarRegistro()">Crear cuenta</button>
          </div>
          <div id="form-container"></div>
          <p style="text-align:center;margin-top:1.5rem;"><a href="ayuda.html">¿Primera vez? Lee la guía de uso</a></p>
        </div>
      </div>
    `;
    this.mostrarLogin();
  }

  mostrarLogin() {
    $id('form-container').innerHTML = `
      <div class="form-group"><label for="login-user">Usuario</label><input id="login-user" type="text" autocomplete="username"></div>
      <div class="form-group"><label for="login-pass">Contraseña</label><input id="login-pass" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')ui.intentaLogin()"></div>
      <button class="btn btn-primary" style="width:100%" onclick="ui.intentaLogin()">Entrar</button>
      <div id="login-msg" style="margin-top:1rem;"></div>
    `;
  }

  mostrarRegistro() {
    $id('form-container').innerHTML = `
      <div class="form-group"><label for="reg-user">Usuario</label><input id="reg-user" type="text" autocomplete="username"></div>
      <div class="form-group"><label for="reg-pass">Contraseña (8+ caracteres)</label><input id="reg-pass" type="password" autocomplete="new-password"></div>
      <div class="form-group"><label for="reg-pass2">Confirmar contraseña</label><input id="reg-pass2" type="password" autocomplete="new-password"></div>
      <div class="alert alert-warning">Si olvidas la contraseña, no hay forma de recuperar los datos. Anótala en un lugar seguro.</div>
      <button class="btn btn-primary" style="width:100%" onclick="ui.intentaRegistro()">Crear cuenta</button>
      <div id="reg-msg" style="margin-top:1rem;"></div>
    `;
  }

  async intentaLogin() {
    try {
      await auth.login($id('login-user').value.trim(), $id('login-pass').value);
      this.pantallaPrincipal();
    } catch (e) {
      $id('login-msg').innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
    }
  }

  async intentaRegistro() {
    try {
      await auth.registro($id('reg-user').value.trim(), $id('reg-pass').value, $id('reg-pass2').value);
      this.pantallaPrincipal();
    } catch (e) {
      $id('reg-msg').innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
    }
  }

  logout() {
    auth.logout();
    this.pantallaPrincipal();
  }

  // ---------- Estructura ----------

  async irA(tab) {
    this.tab = tab;
    await this.render();
    window.scrollTo(0, 0);
  }

  async render() {
    const vistas = {
      resumen: () => this.vistaResumen(),
      movimientos: () => this.vistaMovimientos(),
      presupuesto: () => this.vistaPresupuesto(),
      deudas: () => this.vistaDeudas(),
      metas: () => this.vistaMetas(),
      salud: () => this.vistaSalud()
    };
    let contenido;
    try {
      contenido = await vistas[this.tab]();
    } catch (e) {
      console.error(e);
      contenido = `<div class="alert alert-error">Error: ${esc(e.message)}</div>`;
    }

    this.app.innerHTML = `
      <div class="header">
        <h1>Finanzas Personales</h1>
        <div class="row">
          <span class="muted usuario">${esc(auth.usuario)}</span>
          <a class="btn btn-secondary btn-sm" href="ayuda.html">Ayuda</a>
          <button class="btn btn-secondary btn-sm" onclick="ui.logout()">Salir</button>
        </div>
      </div>
      <nav class="tabs" role="tablist">
        ${PESTANAS.map(p => `<button role="tab" aria-selected="${p.id === this.tab}" class="tab ${p.id === this.tab ? 'active' : ''}" onclick="ui.irA('${p.id}')">${p.nombre}</button>`).join('')}
      </nav>
      <div class="acciones">
        <button class="btn btn-primary btn-sm" onclick="ui.formMovimiento()">+ Movimiento</button>
        <button class="btn btn-secondary btn-sm" onclick="ui.formTransferencia()">Transferencia / pago de tarjeta</button>
        <button class="btn btn-secondary btn-sm" onclick="ui.formCuenta()">+ Cuenta</button>
        <button class="btn btn-secondary btn-sm" onclick="ui.formObligacion()">+ Obligación</button>
        <button class="btn btn-secondary btn-sm" onclick="ui.mostrarBackup()">Respaldo</button>
      </div>
      <main>${contenido}</main>
      <div id="modal" class="modal" onclick="if(event.target===this)ui.cerrarModal()">
        <div class="modal-content" role="dialog" aria-modal="true">
          <button class="btn btn-secondary btn-sm" onclick="ui.cerrarModal()" style="float:right;" aria-label="Cerrar">✕</button>
          <div id="modal-body"></div>
        </div>
      </div>
    `;
  }

  abrirModal(html) {
    $id('modal-body').innerHTML = html;
    $id('modal').classList.add('active');
    const primero = $id('modal-body').querySelector('input, select');
    if (primero) primero.focus();
  }

  cerrarModal() {
    $id('modal').classList.remove('active');
  }

  async guardarY(fn) {
    try {
      await fn();
      this.cerrarModal();
      this.render();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  // ---------- Resumen ----------

  async avisoRespaldo() {
    const movs = (await fdb.lista('transactions')).length;
    if (!movs) return '';
    let ultimo = null;
    try { ultimo = localStorage.getItem('ultimoRespaldo:' + auth.usuario); } catch (e) { /* sin almacenamiento */ }
    const dias = ultimo ? Math.floor((Date.now() - new Date(ultimo).getTime()) / 86400000) : null;
    if (dias !== null && dias < 7) return '';
    return `<div class="alert alert-warning row-between">
      <span>${estado('alerta', 'Respaldo')} ${dias === null ? 'Aún no has descargado ningún respaldo.' : `Tu último respaldo fue hace ${dias} días.`} Si el navegador borra sus datos, solo el respaldo te salva.</span>
      <button class="btn btn-secondary btn-sm" onclick="ui.descargarRespaldo()">Descargar ahora</button>
    </div>`;
  }

  async vistaResumen() {
    const ind = await analysis.indicadores();
    const score = analysis.puntaje(ind);
    const recs = analysis.recomendaciones(ind);
    const comprometido = await finance.dineroComprometido();
    const proyectado = await finance.dineroProyectado();
    const cuentas = await finance.cuentas();
    const saldos = await finance.saldoRegistrado();
    const obligaciones = await finance.obligacionesPendientes();
    const serie = await analysis.serieMensual(6);

    const listaCuentas = cuentas.length ? cuentas.map(c => {
      const t = TIPOS_CUENTA[c.tipo];
      const s = saldos[c.id] || 0;
      const valor = t.naturaleza === 'pasivo' ? `<span class="neg">Debes ${dinero(Math.max(0, -s))}</span>` : dinero(s);
      return `<div class="item">
        <span>${esc(c.nombre)}<br><small class="muted">${esc(t.nombre)}${c.tasaEA ? ` · ${c.tasaEA} % EA` : ''}</small></span>
        <span class="row"><strong>${valor}</strong><button class="btn btn-link" onclick="ui.formCuenta(${c.id})">Editar</button></span>
      </div>`;
    }).join('') : '<p class="muted">Aún no tienes cuentas. Empieza creando tus cuentas bancarias, efectivo y tarjetas.</p>';

    const listaObligaciones = obligaciones.length ? obligaciones
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map(o => {
        const vencida = o.dueDate < fechaLocal();
        return `<div class="item">
          <span>${esc(o.nombre)} ${vencida ? estado('critico', 'Vencida') : ''}<br><small class="muted">Vence ${esc(o.dueDate)} · pendiente ${dinero(o.amountPending)} de ${dinero(o.amountTotal)}</small></span>
          <button class="btn btn-secondary btn-sm" onclick="ui.formPago(${o.id})">Pagar</button>
        </div>`;
      }).join('') : '<p class="muted">No tienes obligaciones pendientes.</p>';

    const recsHtml = recs.slice(0, 3).map(r => this.tarjetaRec(r)).join('');

    return `
      ${await this.avisoRespaldo()}
      <div class="grid kpis">
        ${this.kpi('Disponible hoy', dinero(ind.liquidez), 'Efectivo y cuentas bancarias')}
        ${this.kpi('Patrimonio neto', dinero(ind.patrimonio.neto), `Activos ${dinero(ind.patrimonio.activos)} − deudas ${dinero(ind.patrimonio.pasivos)}`)}
        ${this.kpi('Comprometido', dinero(comprometido), 'Obligaciones por pagar')}
        ${this.kpi('Proyección 30 días', dinero(proyectado), 'Disponible tras movimientos y obligaciones')}
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="row-between"><h3>Salud financiera</h3><button class="btn btn-link" onclick="ui.irA('salud')">Ver diagnóstico</button></div>
          ${score ? `<div class="score"><span class="score-num">${score.total}</span><span class="score-de">/100</span> ${estado(this.nivelScore(score.total), score.nivel)}</div>
            ${charts.progreso(score.total / 100, null, this.tonoScore(score.total))}` : '<p class="muted">Registra movimientos para calcular tu puntaje.</p>'}
          <h4 style="margin-top:1.25rem;">Lo más importante ahora</h4>
          ${recsHtml || '<p class="muted">Sin alertas.</p>'}
        </div>
        <div class="card">
          <h3>Ingresos y gastos (6 meses)</h3>
          ${charts.mensual(serie)}
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card"><h3>Cuentas</h3>${listaCuentas}</div>
        <div class="card"><h3>Obligaciones pendientes</h3>${listaObligaciones}</div>
      </div>
    `;
  }

  kpi(titulo, valor, nota) {
    return `<div class="card kpi"><div class="kpi-t">${titulo}</div><div class="kpi-v">${valor}</div><div class="kpi-n muted">${nota}</div></div>`;
  }

  nivelScore(t) { return t >= 80 ? 'bien' : t >= 60 ? 'info' : t >= 40 ? 'alerta' : 'critico'; }
  tonoScore(t) { return t >= 80 ? 'good' : t >= 60 ? 's1' : t >= 40 ? 'warning' : 'critical'; }

  tarjetaRec(r) {
    return `<div class="rec rec-${r.nivel}"><div>${estado(r.nivel)} <strong>${esc(r.titulo)}</strong></div><p>${esc(r.detalle)}</p></div>`;
  }

  // ---------- Movimientos ----------

  async vistaMovimientos() {
    const cuentas = await finance.cuentas();
    const nombreCuenta = id => (cuentas.find(c => c.id === id) || {}).nombre || '—';
    const f = this.filtros;
    let movs = (await fdb.lista('transactions')).filter(t => mesDe(t.date) === this.mesMov);
    if (f.cuenta) movs = movs.filter(t => [t.accountId, t.fromAccountId, t.toAccountId].includes(Number(f.cuenta)));
    if (f.tipo) movs = movs.filter(t => t.type === f.tipo);
    if (f.categoria) movs = movs.filter(t => t.categoria === f.categoria);
    movs.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

    const resumen = await finance.resumenMes(this.mesMov);
    const filas = movs.map(t => {
      const esTransf = t.type === 'transfer';
      const monto = esTransf ? dinero(t.amount) : t.type === 'income' ? `<span class="pos">+${dinero(t.amount)}</span>` : `<span class="neg">−${dinero(t.amount)}</span>`;
      const cuenta = esTransf ? `${esc(nombreCuenta(t.fromAccountId))} → ${esc(nombreCuenta(t.toAccountId))}` : esc(nombreCuenta(t.accountId));
      const cat = esTransf ? 'Transferencia' : esc(categoria(t.categoria).nombre);
      const futuro = t.date > fechaLocal() ? ' <small class="muted">(programado)</small>' : '';
      return `<tr>
        <td>${esc(t.date)}${futuro}</td>
        <td>${esc(t.description || '—')}<br><small class="muted">${cat} · ${cuenta}</small></td>
        <td class="num">${monto}</td>
        <td class="num nowrap">
          <button class="btn btn-link" onclick="ui.${esTransf ? 'formTransferencia' : 'formMovimiento'}(${t.id})">Editar</button>
          <button class="btn btn-link neg" onclick="ui.borrarMovimiento(${t.id})">Borrar</button>
        </td>
      </tr>`;
    }).join('');

    const opcCat = [...CATEGORIAS_INGRESO, ...CATEGORIAS_GASTO].map(c => `<option value="${c.id}" ${f.categoria === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');

    return `
      ${this.navMes('mesMov')}
      <div class="grid kpis">
        ${this.kpi('Ingresos del mes', dinero(resumen.ingresos), '')}
        ${this.kpi('Gastos del mes', dinero(resumen.gastos), '')}
        ${this.kpi('Balance', dinero(resumen.ingresos - resumen.gastos), resumen.ingresos ? `Ahorro: ${pct(Math.max(0, (resumen.ingresos - resumen.gastos) / resumen.ingresos))} del ingreso` : '')}
      </div>
      <div class="card">
        <div class="filtros">
          <select onchange="ui.filtrar('cuenta', this.value)" aria-label="Cuenta"><option value="">Todas las cuentas</option>${cuentas.map(c => `<option value="${c.id}" ${String(c.id) === f.cuenta ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select>
          <select onchange="ui.filtrar('tipo', this.value)" aria-label="Tipo">
            <option value="">Todos los tipos</option>
            <option value="income" ${f.tipo === 'income' ? 'selected' : ''}>Ingresos</option>
            <option value="expense" ${f.tipo === 'expense' ? 'selected' : ''}>Gastos</option>
            <option value="transfer" ${f.tipo === 'transfer' ? 'selected' : ''}>Transferencias</option>
          </select>
          <select onchange="ui.filtrar('categoria', this.value)" aria-label="Categoría"><option value="">Todas las categorías</option>${opcCat}</select>
        </div>
        ${movs.length ? `<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Fecha</th><th>Detalle</th><th class="num">Monto</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`
          : '<p class="muted">No hay movimientos con estos filtros en este mes.</p>'}
      </div>
    `;
  }

  navMes(prop) {
    return `<div class="navmes">
      <button class="btn btn-secondary btn-sm" onclick="ui.cambiaMes('${prop}', -1)" aria-label="Mes anterior">‹</button>
      <strong>${esc(nombreMes(this[prop]))}</strong>
      <button class="btn btn-secondary btn-sm" onclick="ui.cambiaMes('${prop}', 1)" aria-label="Mes siguiente">›</button>
    </div>`;
  }

  cambiaMes(prop, n) {
    this[prop] = sumaMeses(this[prop], n);
    this.render();
  }

  filtrar(campo, valor) {
    this.filtros[campo] = valor;
    this.render();
  }

  async borrarMovimiento(id) {
    const t = await fdb.obten('transactions', id);
    if (!t) return;
    const aviso = t.obligationId ? '\n\nEs el pago de una obligación: la obligación volverá a quedar pendiente por este monto.' : '';
    if (!confirm(`¿Borrar "${t.description || 'movimiento'}" por ${dinero(t.amount)}?${aviso}`)) return;
    await this.guardarY(() => finance.borraMovimiento(id));
  }

  // ---------- Presupuesto ----------

  async vistaPresupuesto() {
    const resumen = await finance.resumenMes(this.mesPres);
    const presupuestos = await finance.presupuestos();
    const b = await analysis.base();
    const ingreso = resumen.ingresos || b.ingresos;
    const notaIngreso = resumen.ingresos ? 'ingreso del mes' : `sin ingresos este mes; uso tu ${b.periodo}`;

    const grupo = (nombre, valor, meta, invertido = false) => {
      const p = ingreso > 0 ? valor / ingreso : 0;
      const ok = invertido ? p >= meta : p <= meta;
      return `<div class="regla">
        <div class="row-between"><span><strong>${nombre}</strong> <small class="muted">meta ${invertido ? '≥' : '≤'} ${pct(meta)}</small></span>
          <span>${dinero(valor)} · ${ingreso > 0 ? pct(p) : '—'} ${ingreso > 0 ? estado(ok ? 'bien' : 'alerta', ok ? 'En meta' : 'Fuera de meta') : ''}</span></div>
        ${charts.progreso(p, meta, ok ? 's1' : 'warning')}
      </div>`;
    };
    const ahorro = ingreso - resumen.porGrupo.necesidades - resumen.porGrupo.deseos;

    const items = CATEGORIAS_GASTO
      .map(c => ({ id: c.id, nombre: c.nombre, grupo: c.grupo, gastado: resumen.porCategoria[c.id] || 0, presupuesto: presupuestos[c.id] ? presupuestos[c.id].monto : 0 }));

    const filas = ['necesidades', 'deseos'].map(g => `
      <tr class="grupo"><td colspan="4">${g === 'necesidades' ? 'Necesidades' : 'Deseos'}</td></tr>
      ${items.filter(i => i.grupo === g).map(i => {
        const restante = i.presupuesto - i.gastado;
        return `<tr>
          <td>${esc(i.nombre)}</td>
          <td class="num"><input class="input-num" type="number" min="0" step="10000" id="pres-${i.id}" value="${i.presupuesto || ''}" placeholder="0" aria-label="Presupuesto ${esc(i.nombre)}"></td>
          <td class="num">${dinero(i.gastado)}</td>
          <td class="num">${i.presupuesto ? (restante >= 0 ? dinero(restante) : `<span class="neg">${dinero(restante)}</span>`) : '—'}</td>
        </tr>`;
      }).join('')}`).join('');

    const totalPres = items.reduce((s, i) => s + i.presupuesto, 0);
    const graf = items.filter(i => i.gastado > 0 || i.presupuesto > 0).sort((a, b) => b.gastado - a.gastado);

    return `
      ${this.navMes('mesPres')}
      <div class="grid grid-2">
        <div class="card">
          <h3>Regla 50/30/20</h3>
          <p class="muted" style="margin-bottom:1rem;">Base: ${dinero(ingreso)} (${notaIngreso}).</p>
          ${grupo('Necesidades', resumen.porGrupo.necesidades, 0.5)}
          ${grupo('Deseos', resumen.porGrupo.deseos, 0.3)}
          ${grupo('Ahorro y pago extra de deudas', Math.max(0, ahorro), 0.2, true)}
          <p class="muted small">Necesidades: lo que debes pagar sí o sí. Deseos: lo que podrías recortar. Ahorro: lo que queda; idealmente apártalo apenas recibes el ingreso.</p>
        </div>
        <div class="card">
          <h3>Gasto vs. presupuesto</h3>
          ${charts.categorias(graf)}
        </div>
      </div>
      <div class="card">
        <div class="row-between">
          <h3>Presupuesto mensual por categoría</h3>
          <div class="row">
            <button class="btn btn-secondary btn-sm" onclick="ui.sugerirPresupuesto()">Sugerir según mis gastos</button>
            <button class="btn btn-primary btn-sm" onclick="ui.guardarPresupuesto()">Guardar presupuesto</button>
          </div>
        </div>
        <p class="muted small" id="pres-nota">Total presupuestado: ${dinero(totalPres)}${ingreso ? ` (${pct(totalPres / ingreso)} del ingreso)` : ''}. El presupuesto es el mismo cada mes.</p>
        <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Categoría</th><th class="num">Presupuesto</th><th class="num">Gastado</th><th class="num">Restante</th></tr></thead><tbody>${filas}</tbody></table></div>
      </div>
    `;
  }

  async sugerirPresupuesto() {
    const { sugerido, base, recorteDeseos } = await analysis.sugerirPresupuesto();
    if (!Object.keys(sugerido).length) return alert('Necesito al menos un mes con gastos por categoría para sugerir un presupuesto.');
    CATEGORIAS_GASTO.forEach(c => { $id('pres-' + c.id).value = sugerido[c.id] || ''; });
    const total = Object.values(sugerido).reduce((s, v) => s + v, 0);
    const necesidadesAltas = base.ingresos > 0 && base.necesidades / base.ingresos > UMBRALES.necesidadesMax;
    $id('pres-nota').innerHTML = `${estado('info', 'Sugerido')} Basado en tu ${esc(base.periodo)} de gastos. Mantengo tus necesidades y ${recorteDeseos > 0 ? `recorto ${dinero(recorteDeseos)} en deseos` : 'tus deseos ya están en rango'} para acercarte a un ahorro del 20 %. Total: ${dinero(total)}${base.ingresos ? ` (${pct(total / base.ingresos)} del ingreso)` : ''}.` +
      (necesidadesAltas ? ` Tus necesidades son el ${pct(base.necesidades / base.ingresos)} del ingreso: para bajar de 50 % hay que revisar los rubros grandes (vivienda, transporte, créditos), no basta con recortar gastos pequeños.` : '') +
      ' Revisa los valores y pulsa <strong>Guardar presupuesto</strong>.';
  }

  async guardarPresupuesto() {
    try {
      for (const c of CATEGORIAS_GASTO) {
        await finance.guardaPresupuesto(c.id, parseFloat($id('pres-' + c.id).value) || 0);
      }
      this.render();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  // ---------- Deudas ----------

  async vistaDeudas() {
    const deudas = await analysis.deudas();
    if (!deudas.length) {
      return `<div class="card"><h3>Deudas</h3>
        <p class="muted">No tienes deudas registradas. Crea tus tarjetas de crédito y préstamos como cuentas (tipo "Tarjeta de crédito" o "Crédito o préstamo") con su saldo, tasa EA y cuota mínima.</p>
        <button class="btn btn-primary" style="margin-top:1rem;" onclick="ui.formCuenta()">Agregar deuda</button></div>`;
    }

    const extra = this.planDeuda.extra || 0;
    const minimos = analysis.planDeudas(deudas, 0, 'avalancha', false);
    const avalancha = analysis.planDeudas(deudas, extra, 'avalancha');
    const bola = analysis.planDeudas(deudas, extra, 'bola');
    const total = deudas.reduce((s, d) => s + d.saldo, 0);
    const cuotas = deudas.reduce((s, d) => s + d.cuotaMinima, 0);
    const interesMes = deudas.reduce((s, d) => s + d.saldo * tasaMensual(d.tasaEA), 0);

    const fechaLibre = m => {
      const d = new Date(); d.setMonth(d.getMonth() + m);
      return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    };
    const celda = p => p.imposible
      ? `<td colspan="3">${estado('critico', 'No se termina de pagar')} las cuotas no cubren los intereses</td>`
      : `<td class="num">${p.meses} meses<br><small class="muted">${fechaLibre(p.meses)}</small></td><td class="num">${dinero(p.intereses)}</td><td>${p.orden.map((o, i) => `${i + 1}. ${esc(o.nombre)} <small class="muted">(mes ${o.mes})</small>`).join('<br>')}</td>`;

    const ahorroAv = !minimos.imposible && !avalancha.imposible ? minimos.intereses - avalancha.intereses : null;
    const empate = !avalancha.imposible && !bola.imposible && Math.abs(avalancha.intereses - bola.intereses) < 1;
    const mejor = !avalancha.imposible && !bola.imposible && !empate
      ? (avalancha.intereses < bola.intereses ? 'avalancha' : 'bola') : null;

    const filas = deudas.sort((a, b) => b.tasaEA - a.tasaEA).map(d => {
      const im = d.saldo * tasaMensual(d.tasaEA);
      const alerta = d.cuotaMinima > 0 && d.cuotaMinima <= im ? estado('critico', 'Cuota ≤ intereses') : d.tasaEA >= UMBRALES.tasaAlta ? estado('alerta', 'Deuda cara') : '';
      return `<tr>
        <td>${esc(d.nombre)}<br><small class="muted">${esc(TIPOS_CUENTA[d.tipo].nombre)}${d.cupo ? ` · uso ${pct(d.saldo / d.cupo)} del cupo` : ''}</small> ${alerta}</td>
        <td class="num">${dinero(d.saldo)}</td><td class="num">${d.tasaEA} %</td><td class="num">${dinero(d.cuotaMinima)}</td><td class="num">${dinero(im)}</td>
        <td><button class="btn btn-link" onclick="ui.formCuenta(${d.id})">Editar</button></td>
      </tr>`;
    }).join('');

    return `
      <div class="grid kpis">
        ${this.kpi('Deuda total', dinero(total), `${deudas.length} ${deudas.length === 1 ? 'deuda' : 'deudas'}`)}
        ${this.kpi('Cuotas mínimas', dinero(cuotas) + '/mes', '')}
        ${this.kpi('Intereses este mes', dinero(interesMes), 'Lo que te cuesta la deuda cada mes')}
      </div>
      <div class="card">
        <h3>Tus deudas</h3>
        <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Deuda</th><th class="num">Saldo</th><th class="num">Tasa EA</th><th class="num">Cuota mín.</th><th class="num">Interés/mes</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>
      </div>
      <div class="card">
        <h3>Plan para salir de deudas</h3>
        <p class="muted small">Pagas la cuota mínima de todas y destinas un monto extra a una sola. Cuando una se termina, su cuota pasa a la siguiente.
          <strong>Avalancha</strong>: primero la de mayor tasa (pagas menos intereses). <strong>Bola de nieve</strong>: primero la de menor saldo (logras victorias rápidas y mantienes la motivación).</p>
        <div class="form-group" style="max-width:320px;margin-top:1rem;">
          <label for="deuda-extra">Pago extra mensual</label>
          <input id="deuda-extra" type="number" min="0" step="50000" value="${extra || ''}" placeholder="0" onchange="ui.planDeuda.extra = parseFloat(this.value) || 0; ui.render()">
        </div>
        <div class="tabla-scroll"><table class="tabla">
          <thead><tr><th>Estrategia</th><th class="num">Libre de deudas</th><th class="num">Intereses totales</th><th>Orden de pago</th></tr></thead>
          <tbody>
            <tr><td>Solo cuotas mínimas</td>${celda(minimos)}</tr>
            <tr><td>Avalancha ${mejor === 'avalancha' ? estado('bien', 'Menos intereses') : ''}</td>${celda(avalancha)}</tr>
            <tr><td>Bola de nieve ${mejor === 'bola' ? estado('bien', 'Menos intereses') : ''}</td>${celda(bola)}</tr>
          </tbody>
        </table></div>
        ${empate && deudas.length > 1 ? `<p class="muted small" style="margin-top:1rem;">Ambas estrategias coinciden: tu deuda más cara es también la de menor saldo.</p>` : ''}
        ${ahorroAv > 0 ? `<p style="margin-top:1rem;">${estado('bien', 'Ahorro')} Con el plan avalancha${extra ? ` y ${dinero(extra)} extra al mes` : ''} te ahorras <strong>${dinero(ahorroAv)}</strong> en intereses frente a pagar solo mínimos.</p>` : ''}
        <p class="muted small" style="margin-top:1rem;">Simulación con tasa fija y sin compras nuevas. Para pagar la tarjeta usa "Transferencia / pago de tarjeta" desde tu cuenta bancaria.</p>
      </div>
    `;
  }

  // ---------- Metas ----------

  async vistaMetas() {
    const ind = await analysis.indicadores();
    const meses = ind.mesesEmergencia;
    const progresoFondo = ind.metaEmergencia > 0 ? ind.liquidez / ind.metaEmergencia : 0;
    const nivelFondo = ind.mesesCobertura === null ? null : ind.mesesCobertura >= meses ? 'bien' : ind.mesesCobertura >= 3 ? 'info' : ind.mesesCobertura >= 1 ? 'alerta' : 'critico';

    const metas = ind.metas.map(m => `
      <div class="card">
        <div class="row-between"><h3>${esc(m.nombre)}</h3>
          <span class="row"><button class="btn btn-link" onclick="ui.formMeta(${m.id})">Editar</button><button class="btn btn-link neg" onclick="ui.borrarMeta(${m.id})">Borrar</button></span></div>
        <p>${dinero(m.ahorrado)} de ${dinero(m.meta)} · ${pct(m.progreso)} ${m.falta === 0 ? estado('bien', 'Lograda') : m.vencida ? estado('critico', 'Fecha vencida') : ''}</p>
        ${charts.progreso(m.progreso, null, m.falta === 0 ? 'good' : 's1')}
        ${m.falta > 0 ? `<p class="muted small" style="margin-top:0.5rem;">Fecha objetivo ${esc(m.fechaObjetivo)} · ${m.vencida ? 'vencida' : `${m.mesesRestantes} meses`} · aporte necesario <strong>${dinero(m.aporteMensual)}/mes</strong>
          ${ind.base.ingresos ? ` (${pct(m.aporteMensual / ind.base.ingresos)} de tu ingreso)` : ''}</p>` : ''}
        <div class="row" style="margin-top:0.75rem;">
          <input type="number" id="abono-${m.id}" placeholder="Monto" style="max-width:160px;" aria-label="Monto a abonar">
          <button class="btn btn-secondary btn-sm" onclick="ui.abonarMeta(${m.id}, 1)">Abonar</button>
          <button class="btn btn-link" onclick="ui.abonarMeta(${m.id}, -1)">Retirar</button>
        </div>
      </div>`).join('');

    return `
      <div class="card">
        <div class="row-between"><h3>Fondo de emergencia</h3>${nivelFondo ? estado(nivelFondo, `${ind.mesesCobertura.toFixed(1)} meses cubiertos`) : ''}</div>
        ${ind.gastoEsencial > 0 ? `
          <p>Tienes ${dinero(ind.liquidez)} disponibles para una meta de <strong>${dinero(ind.metaEmergencia)}</strong> (${meses} meses de gastos esenciales de ${dinero(ind.gastoEsencial)}).</p>
          ${charts.progreso(progresoFondo, 3 / meses, nivelFondo === 'bien' ? 'good' : 's1')}
          <p class="muted small" style="margin-top:0.5rem;">La marca indica el mínimo recomendado de 3 meses.${progresoFondo < 1 ? ` Te faltan ${dinero(ind.metaEmergencia - ind.liquidez)}.` : ''}</p>`
          : '<p class="muted">Registra tus gastos para calcular cuánto necesitas.</p>'}
        <div class="form-group" style="max-width:320px;margin-top:1rem;">
          <label for="meses-emergencia">Meses a cubrir</label>
          <select id="meses-emergencia" onchange="ui.guardarY(() => finance.guardaMesesEmergencia(Number(this.value)))">
            ${[3, 6, 9, 12].map(n => `<option value="${n}" ${n === meses ? 'selected' : ''}>${n} meses</option>`).join('')}
          </select>
        </div>
        <p class="muted small">3 meses si tienes empleo estable y nadie depende de ti; 6 o más si eres independiente, tienes ingresos variables o personas a cargo. Guárdalo en una cuenta de ahorros aparte, fácil de retirar.</p>
      </div>
      <div class="row-between" style="margin:1.5rem 0 1rem;"><h2>Metas de ahorro</h2><button class="btn btn-primary btn-sm" onclick="ui.formMeta()">+ Nueva meta</button></div>
      ${metas || '<div class="card"><p class="muted">Define metas concretas (vacaciones, cuota inicial de vivienda, estudio) con valor y fecha: así sabes cuánto apartar cada mes.</p></div>'}
    `;
  }

  async abonarMeta(id, signo) {
    const monto = parseFloat($id('abono-' + id).value);
    if (!(monto > 0)) return alert('Escribe un monto');
    await this.guardarY(() => finance.abonaMeta(id, signo * monto));
  }

  async borrarMeta(id) {
    if (!confirm('¿Borrar esta meta?')) return;
    await this.guardarY(() => finance.borraMeta(id));
  }

  // ---------- Salud financiera ----------

  async vistaSalud() {
    const ind = await analysis.indicadores();
    const score = analysis.puntaje(ind);
    const recs = analysis.recomendaciones(ind);
    const b = ind.base;

    const fila = (nombre, valor, meta, nivel, nota) => `<tr><td>${nombre}<br><small class="muted">${nota}</small></td><td class="num">${valor}</td><td class="num">${meta}</td><td>${nivel ? estado(nivel) : '<span class="muted">Sin datos</span>'}</td></tr>`;
    const niv = (v, bien, alerta, menorEsMejor = false) => v === null ? null
      : menorEsMejor ? (v <= bien ? 'bien' : v <= alerta ? 'alerta' : 'critico')
      : (v >= bien ? 'bien' : v >= alerta ? 'alerta' : 'critico');

    return `
      <div class="grid grid-2">
        <div class="card">
          <h3>Puntaje de salud financiera</h3>
          ${score ? `<div class="score"><span class="score-num">${score.total}</span><span class="score-de">/100</span> ${estado(this.nivelScore(score.total), score.nivel)}</div>
            ${score.componentes.map(c => `<div class="regla"><div class="row-between"><span>${c.nombre}</span><span>${c.puntos}/20</span></div>${charts.progreso(c.puntos / 20, null, c.puntos >= 15 ? 'good' : c.puntos >= 8 ? 'warning' : 'critical')}</div>`).join('')}`
            : '<p class="muted">Registra movimientos para calcular tu puntaje.</p>'}
          <p class="muted small">Calculado con tu ${esc(b.periodo)}: ingresos ${dinero(b.ingresos)}, gastos ${dinero(b.gastos)} al mes.</p>
        </div>
        <div class="card">
          <h3>Indicadores</h3>
          <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Indicador</th><th class="num">Tú</th><th class="num">Meta</th><th>Estado</th></tr></thead><tbody>
            ${fila('Tasa de ahorro', ind.tasaAhorro === null ? '—' : pct(ind.tasaAhorro), '≥ 20 %', niv(ind.tasaAhorro, 0.2, 0.1), 'Lo que queda del ingreso tras gastos')}
            ${fila('Fondo de emergencia', ind.mesesCobertura === null ? '—' : ind.mesesCobertura.toFixed(1) + ' meses', '3–6 meses', niv(ind.mesesCobertura, 3, 1), 'Disponible ÷ gastos esenciales')}
            ${fila('Endeudamiento', ind.endeudamiento === null ? '—' : pct(ind.endeudamiento), '≤ 30 %', niv(ind.endeudamiento, 0.3, 0.4, true), 'Cuotas de deuda ÷ ingreso')}
            ${fila('Uso de tarjetas', ind.utilizacion === null ? '—' : pct(ind.utilizacion), '≤ 30 %', niv(ind.utilizacion, 0.3, 0.5, true), 'Deuda en tarjetas ÷ cupo total')}
            ${fila('Necesidades', ind.pctNecesidades === null ? '—' : pct(ind.pctNecesidades), '≤ 50 %', niv(ind.pctNecesidades, 0.5, 0.6, true), 'Gastos esenciales ÷ ingreso')}
            ${fila('Deseos', ind.pctDeseos === null ? '—' : pct(ind.pctDeseos), '≤ 30 %', niv(ind.pctDeseos, 0.3, 0.4, true), 'Gastos no esenciales ÷ ingreso')}
            ${fila('Patrimonio neto', dinero(ind.patrimonio.neto), '> 0', ind.patrimonio.activos || ind.patrimonio.pasivos ? (ind.patrimonio.neto > 0 ? 'bien' : 'critico') : null, 'Lo que tienes − lo que debes')}
          </tbody></table></div>
        </div>
      </div>
      <div class="card">
        <h3>Recomendaciones</h3>
        ${recs.map(r => this.tarjetaRec(r)).join('') || '<p class="muted">Sin recomendaciones por ahora.</p>'}
        <p class="muted small" style="margin-top:1rem;">Orientación educativa basada en reglas generales de finanzas personales. No es asesoría de inversión ni reemplaza a un asesor financiero certificado.</p>
      </div>
    `;
  }

  // ---------- Formularios ----------

  async opcionesCuentas(seleccion, filtro = () => true) {
    const cuentas = (await finance.cuentas()).filter(filtro);
    return cuentas.map(c => `<option value="${c.id}" ${c.id === seleccion ? 'selected' : ''}>${esc(c.nombre)} · ${esc(TIPOS_CUENTA[c.tipo].nombre)}</option>`).join('');
  }

  opcionesCategorias(tipo, seleccion) {
    if (tipo === 'income') return CATEGORIAS_INGRESO.map(c => `<option value="${c.id}" ${c.id === seleccion ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');
    return ['necesidades', 'deseos'].map(g => `<optgroup label="${g === 'necesidades' ? 'Necesidades' : 'Deseos'}">${CATEGORIAS_GASTO.filter(c => c.grupo === g).map(c => `<option value="${c.id}" ${c.id === seleccion ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</optgroup>`).join('');
  }

  async formCuenta(id) {
    const c = id !== undefined ? (await finance.cuentas()).find(x => x.id === id) : null;
    const tipo = c ? c.tipo : 'ahorros';
    const saldo = c ? (TIPOS_CUENTA[tipo].naturaleza === 'pasivo' ? -c.balanceInitial : c.balanceInitial) || 0 : '';
    this.abrirModal(`
      <h2>${c ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
      <div class="form-group"><label for="cuenta-nombre">Nombre</label><input id="cuenta-nombre" type="text" placeholder="Ej: Ahorros Bancolombia, Visa" value="${esc(c ? c.nombre : '')}"></div>
      <div class="form-group"><label for="cuenta-tipo">Tipo</label>
        <select id="cuenta-tipo" onchange="ui.camposDeuda()">${Object.entries(TIPOS_CUENTA).map(([k, t]) => `<option value="${k}" ${k === tipo ? 'selected' : ''}>${t.nombre}</option>`).join('')}</select></div>
      <div class="form-group"><label for="cuenta-saldo" id="label-saldo">Saldo inicial</label><input id="cuenta-saldo" type="number" placeholder="0" value="${saldo}"></div>
      <div id="campos-deuda">
        <div class="form-group"><label for="cuenta-tasa">Tasa de interés efectiva anual (% EA)</label><input id="cuenta-tasa" type="number" step="0.01" placeholder="Ej: 28.5" value="${c && c.tasaEA ? c.tasaEA : ''}"></div>
        <div class="form-group"><label for="cuenta-cuota">Cuota mínima mensual</label><input id="cuenta-cuota" type="number" placeholder="0" value="${c && c.cuotaMinima ? c.cuotaMinima : ''}"></div>
        <div class="form-group" id="grupo-cupo"><label for="cuenta-cupo">Cupo total de la tarjeta</label><input id="cuenta-cupo" type="number" placeholder="0" value="${c && c.cupo ? c.cupo : ''}"></div>
      </div>
      <p class="muted small" id="nota-cuenta" style="margin-bottom:1rem;"></p>
      <div class="row">
        <button class="btn btn-primary" onclick="ui.guardarCuenta(${c ? c.id : 'undefined'})">Guardar</button>
        ${c ? `<button class="btn btn-link neg" onclick="ui.borrarCuenta(${c.id})">Borrar cuenta</button>` : ''}
      </div>
    `);
    this.camposDeuda();
  }

  camposDeuda() {
    const tipo = $id('cuenta-tipo').value;
    const pasivo = TIPOS_CUENTA[tipo].naturaleza === 'pasivo';
    $id('campos-deuda').style.display = pasivo ? '' : 'none';
    $id('grupo-cupo').style.display = tipo === 'tarjeta' ? '' : 'none';
    $id('label-saldo').textContent = pasivo ? 'Deuda actual (lo que debes hoy)' : 'Saldo actual';
    $id('nota-cuenta').textContent = tipo === 'tarjeta'
      ? 'Las compras con tarjeta se registran como gastos de esta cuenta; el pago, como transferencia desde tu cuenta bancaria. La tasa EA aparece en tu extracto.'
      : tipo === 'inversion' ? 'Cuenta para tu patrimonio; no se suma al dinero disponible de hoy.' : '';
  }

  async guardarCuenta(id) {
    await this.guardarY(() => finance.registraCuenta({
      id,
      nombre: $id('cuenta-nombre').value.trim(),
      tipo: $id('cuenta-tipo').value,
      saldo: valorNum('cuenta-saldo') || 0,
      tasaEA: valorNum('cuenta-tasa') || 0,
      cuotaMinima: valorNum('cuenta-cuota') || 0,
      cupo: valorNum('cuenta-cupo') || 0
    }));
  }

  async borrarCuenta(id) {
    if (!confirm('¿Borrar esta cuenta?')) return;
    await this.guardarY(() => finance.borraCuenta(id));
  }

  async formMovimiento(id) {
    const t = id !== undefined ? await fdb.obten('transactions', id) : null;
    const opciones = await this.opcionesCuentas(t ? t.accountId : undefined);
    if (!opciones) return alert('Primero crea una cuenta.');
    const tipo = t ? t.type : 'expense';
    this.abrirModal(`
      <h2>${t ? 'Editar movimiento' : 'Registrar movimiento'}</h2>
      <div class="segmented" role="radiogroup">
        <label><input type="radio" name="mov-tipo" value="expense" ${tipo === 'expense' ? 'checked' : ''} onchange="ui.cambiaTipoMov()"> Gasto</label>
        <label><input type="radio" name="mov-tipo" value="income" ${tipo === 'income' ? 'checked' : ''} onchange="ui.cambiaTipoMov()"> Ingreso</label>
      </div>
      <div class="form-group"><label for="mov-monto">Monto</label><input id="mov-monto" type="number" placeholder="0" value="${t ? t.amount : ''}" ${t && t.obligationId ? 'disabled' : ''}></div>
      <div class="form-group"><label for="mov-cat">Categoría</label><select id="mov-cat">${this.opcionesCategorias(tipo, t && t.categoria)}</select></div>
      <div class="form-group"><label for="mov-cuenta">Cuenta</label><select id="mov-cuenta">${opciones}</select></div>
      <div class="form-group"><label for="mov-desc">Descripción</label><input id="mov-desc" type="text" placeholder="Ej: Mercado del mes" value="${esc(t ? t.description : '')}"></div>
      <div class="form-group"><label for="mov-fecha">Fecha</label><input id="mov-fecha" type="date" value="${t ? t.date : fechaLocal()}"></div>
      <button class="btn btn-primary" onclick="ui.guardarMovimiento(${t ? t.id : 'undefined'})">Guardar</button>
    `);
  }

  cambiaTipoMov() {
    const tipo = document.querySelector('input[name="mov-tipo"]:checked').value;
    $id('mov-cat').innerHTML = this.opcionesCategorias(tipo);
  }

  async guardarMovimiento(id) {
    const datos = {
      type: document.querySelector('input[name="mov-tipo"]:checked').value,
      amount: valorNum('mov-monto'),
      categoria: $id('mov-cat').value,
      accountId: Number($id('mov-cuenta').value),
      description: $id('mov-desc').value.trim(),
      date: $id('mov-fecha').value || fechaLocal()
    };
    await this.guardarY(() => id !== undefined
      ? finance.actualizaMovimiento(id, datos)
      : finance.registraMovimiento(datos.accountId, datos.type, datos.amount, datos.description, datos.date, datos.categoria));
  }

  async formTransferencia(id) {
    const t = id !== undefined ? await fdb.obten('transactions', id) : null;
    const cuentas = await finance.cuentas();
    if (cuentas.length < 2) return alert('Necesitas al menos dos cuentas para transferir.');
    const desde = await this.opcionesCuentas(t ? t.fromAccountId : undefined);
    const tarjeta = cuentas.find(c => TIPOS_CUENTA[c.tipo].naturaleza === 'pasivo');
    const hacia = await this.opcionesCuentas(t ? t.toAccountId : (tarjeta ? tarjeta.id : undefined));
    this.abrirModal(`
      <h2>${t ? 'Editar transferencia' : 'Transferencia entre tus cuentas'}</h2>
      <p class="muted small" style="margin-bottom:1rem;">No cuenta como ingreso ni gasto. Úsala para pasar dinero a tu cuenta de ahorros, retirar efectivo o pagar la tarjeta de crédito (destino: la tarjeta).</p>
      <div class="form-group"><label for="tr-desde">Desde</label><select id="tr-desde">${desde}</select></div>
      <div class="form-group"><label for="tr-hacia">Hacia</label><select id="tr-hacia">${hacia}</select></div>
      <div class="form-group"><label for="tr-monto">Monto</label><input id="tr-monto" type="number" placeholder="0" value="${t ? t.amount : ''}"></div>
      <div class="form-group"><label for="tr-desc">Descripción</label><input id="tr-desc" type="text" placeholder="Ej: Pago tarjeta Visa" value="${esc(t ? t.description : '')}"></div>
      <div class="form-group"><label for="tr-fecha">Fecha</label><input id="tr-fecha" type="date" value="${t ? t.date : fechaLocal()}"></div>
      <button class="btn btn-primary" onclick="ui.guardarTransferencia(${t ? t.id : 'undefined'})">Guardar</button>
    `);
  }

  async guardarTransferencia(id) {
    const datos = {
      fromAccountId: Number($id('tr-desde').value),
      toAccountId: Number($id('tr-hacia').value),
      amount: valorNum('tr-monto'),
      description: $id('tr-desc').value.trim(),
      date: $id('tr-fecha').value || fechaLocal()
    };
    await this.guardarY(() => id !== undefined
      ? finance.actualizaMovimiento(id, datos)
      : finance.registraTransferencia(datos.fromAccountId, datos.toAccountId, datos.amount, datos.description, datos.date));
  }

  formObligacion() {
    this.abrirModal(`
      <h2>Nueva obligación</h2>
      <p class="muted small" style="margin-bottom:1rem;">Un pago futuro que ya sabes que tienes (impuesto, matrícula, factura). Cuenta como dinero comprometido y entra en la proyección.</p>
      <div class="form-group"><label for="oblig-nombre">Nombre</label><input id="oblig-nombre" type="text" placeholder="Ej: Impuesto predial"></div>
      <div class="form-group"><label for="oblig-monto">Monto</label><input id="oblig-monto" type="number" placeholder="0"></div>
      <div class="form-group"><label for="oblig-cat">Categoría del gasto</label><select id="oblig-cat">${this.opcionesCategorias('expense', 'impuestos')}</select></div>
      <div class="form-group"><label for="oblig-fecha">Fecha de vencimiento</label><input id="oblig-fecha" type="date"></div>
      <div class="form-group"><label for="oblig-desc">Descripción</label><input id="oblig-desc" type="text"></div>
      <button class="btn btn-primary" onclick="ui.guardarObligacion()">Guardar</button>
    `);
  }

  async guardarObligacion() {
    await this.guardarY(() => finance.registraObligacion(
      $id('oblig-nombre').value.trim(), valorNum('oblig-monto'), $id('oblig-fecha').value, $id('oblig-desc').value, $id('oblig-cat').value));
  }

  async formPago(obligationId) {
    const o = await fdb.obten('obligations', obligationId);
    if (!o) return;
    const opciones = await this.opcionesCuentas(undefined);
    if (!opciones) return alert('Primero crea una cuenta desde la cual pagar.');
    this.abrirModal(`
      <h2>Pagar: ${esc(o.nombre)}</h2>
      <p style="margin-bottom:1rem;">Pendiente: ${dinero(o.amountPending)}</p>
      <div class="form-group"><label for="pago-cuenta">Pagar desde</label><select id="pago-cuenta">${opciones}</select></div>
      <div class="form-group"><label for="pago-monto">Monto</label><input id="pago-monto" type="number" value="${o.amountPending}"></div>
      <div class="form-group"><label for="pago-fecha">Fecha</label><input id="pago-fecha" type="date" value="${fechaLocal()}"></div>
      <button class="btn btn-primary" onclick="ui.guardarPago(${obligationId})">Registrar pago</button>
    `);
  }

  async guardarPago(obligationId) {
    await this.guardarY(() => finance.pagaObligacion(obligationId, valorNum('pago-monto'), Number($id('pago-cuenta').value), $id('pago-fecha').value || fechaLocal()));
  }

  async formMeta(id) {
    const m = id !== undefined ? await fdb.obten('goals', id) : null;
    this.abrirModal(`
      <h2>${m ? 'Editar meta' : 'Nueva meta de ahorro'}</h2>
      <div class="form-group"><label for="meta-nombre">Nombre</label><input id="meta-nombre" type="text" placeholder="Ej: Cuota inicial apartamento" value="${esc(m ? m.nombre : '')}"></div>
      <div class="form-group"><label for="meta-valor">Valor de la meta</label><input id="meta-valor" type="number" placeholder="0" value="${m ? m.meta : ''}"></div>
      <div class="form-group"><label for="meta-ahorrado">Ya ahorrado</label><input id="meta-ahorrado" type="number" placeholder="0" value="${m ? m.ahorrado || '' : ''}"></div>
      <div class="form-group"><label for="meta-fecha">Fecha objetivo</label><input id="meta-fecha" type="date" value="${m ? m.fechaObjetivo : ''}"></div>
      <button class="btn btn-primary" onclick="ui.guardarMeta(${m ? m.id : 'undefined'})">Guardar</button>
    `);
  }

  async guardarMeta(id) {
    await this.guardarY(() => finance.registraMeta($id('meta-nombre').value.trim(), valorNum('meta-valor'), $id('meta-fecha').value, valorNum('meta-ahorrado') || 0, id));
  }

  // ---------- Respaldo ----------

  mostrarBackup() {
    this.abrirModal(`
      <h2>Respaldo</h2>
      <p style="margin-bottom:1rem;">El archivo se descarga cifrado con AES-256-GCM. Para restaurarlo necesitarás la contraseña de esta cuenta. Descárgalo cada semana y guárdalo fuera del celular (correo, nube).</p>
      <button class="btn btn-primary" onclick="ui.descargarRespaldo()">Descargar respaldo</button>

      <h3 style="margin-top:2rem;margin-bottom:1rem;">Restaurar</h3>
      <p class="muted small" style="margin-bottom:1rem;">Los registros del archivo se añaden a los que ya tienes: restaura en una cuenta nueva o vacía para no duplicar.</p>
      <div class="form-group"><label for="restore-file">Archivo de respaldo</label><input id="restore-file" type="file" accept="application/json,.json"></div>
      <div class="form-group"><label for="restore-pass">Contraseña con la que se creó el respaldo</label><input id="restore-pass" type="password"></div>
      <button class="btn btn-secondary" onclick="ui.restaurar()">Restaurar</button>
      <div id="restore-msg" style="margin-top:1rem;"></div>
    `);
  }

  async descargarRespaldo() {
    try {
      await backup.descargarRespaldo();
      try { localStorage.setItem('ultimoRespaldo:' + auth.usuario, new Date().toISOString()); } catch (e) { /* sin almacenamiento */ }
      if ($id('modal').classList.contains('active')) this.cerrarModal();
      this.render();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  async restaurar() {
    try {
      const n = await backup.restaurarRespaldo($id('restore-file').files, $id('restore-pass').value);
      this.cerrarModal();
      await this.render();
      alert(`Respaldo restaurado: ${n.accounts} cuentas, ${n.transactions} movimientos, ${n.obligations} obligaciones, ${n.budgets} presupuestos, ${n.goals} metas`);
    } catch (e) {
      $id('restore-msg').innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
    }
  }
}

const ui = new UI();
