// Fecha local en formato YYYY-MM-DD. toISOString() usa UTC y en Colombia
// (UTC-5) marca como "mañana" lo registrado después de las 7 p. m.
function fechaLocal(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function mesDe(fecha) {
  return fecha.slice(0, 7);
}

// 'YYYY-MM' desplazado n meses
function sumaMeses(mes, n) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Pasivos (tarjeta, préstamo) guardan el saldo en negativo: -deuda.
// Líquidas = dinero que puedes usar hoy.
const TIPOS_CUENTA = {
  corriente: { nombre: 'Cuenta corriente', naturaleza: 'activo', liquida: true },
  ahorros: { nombre: 'Cuenta de ahorros', naturaleza: 'activo', liquida: true },
  efectivo: { nombre: 'Efectivo', naturaleza: 'activo', liquida: true },
  inversion: { nombre: 'Inversión (CDT, fondo, acciones)', naturaleza: 'activo', liquida: false },
  tarjeta: { nombre: 'Tarjeta de crédito', naturaleza: 'pasivo', liquida: false },
  prestamo: { nombre: 'Crédito o préstamo', naturaleza: 'pasivo', liquida: false }
};

// Tipos de la versión 1
const TIPOS_LEGADO = { 'Corriente': 'corriente', 'Ahorros': 'ahorros', 'Efectivo': 'efectivo', 'Tarjeta de Crédito': 'tarjeta' };

function tipoCuenta(cuenta) {
  return TIPOS_CUENTA[cuenta.tipo] ? cuenta.tipo : (TIPOS_LEGADO[cuenta.tipo] || 'corriente');
}

// Grupos de la regla 50/30/20: necesidades, deseos; el ahorro es lo que sobra.
const CATEGORIAS_GASTO = [
  { id: 'vivienda', nombre: 'Vivienda (arriendo, hipoteca, administración)', grupo: 'necesidades' },
  { id: 'servicios', nombre: 'Servicios públicos e internet', grupo: 'necesidades' },
  { id: 'mercado', nombre: 'Mercado', grupo: 'necesidades' },
  { id: 'transporte', nombre: 'Transporte y vehículo', grupo: 'necesidades' },
  { id: 'salud', nombre: 'Salud y medicamentos', grupo: 'necesidades' },
  { id: 'educacion', nombre: 'Educación', grupo: 'necesidades' },
  { id: 'seguros', nombre: 'Seguros', grupo: 'necesidades' },
  { id: 'cuotas', nombre: 'Cuotas de créditos', grupo: 'necesidades' },
  { id: 'intereses', nombre: 'Intereses y cargos bancarios', grupo: 'necesidades' },
  { id: 'impuestos', nombre: 'Impuestos', grupo: 'necesidades' },
  { id: 'familia', nombre: 'Apoyo familiar', grupo: 'necesidades' },
  { id: 'restaurantes', nombre: 'Restaurantes y domicilios', grupo: 'deseos' },
  { id: 'entretenimiento', nombre: 'Entretenimiento', grupo: 'deseos' },
  { id: 'compras', nombre: 'Ropa y compras', grupo: 'deseos' },
  { id: 'suscripciones', nombre: 'Suscripciones', grupo: 'deseos' },
  { id: 'viajes', nombre: 'Viajes', grupo: 'deseos' },
  { id: 'cuidado', nombre: 'Cuidado personal', grupo: 'deseos' },
  { id: 'regalos', nombre: 'Regalos y celebraciones', grupo: 'deseos' },
  { id: 'otros', nombre: 'Otros gastos', grupo: 'deseos' }
];

const CATEGORIAS_INGRESO = [
  { id: 'salario', nombre: 'Salario' },
  { id: 'independiente', nombre: 'Honorarios o trabajo independiente' },
  { id: 'negocio', nombre: 'Negocio propio' },
  { id: 'arriendos', nombre: 'Arriendos recibidos' },
  { id: 'rendimientos', nombre: 'Rendimientos e intereses' },
  { id: 'primas', nombre: 'Primas y bonificaciones' },
  { id: 'otros_ingresos', nombre: 'Otros ingresos' }
];

function categoria(id) {
  return CATEGORIAS_GASTO.find(c => c.id === id) || CATEGORIAS_INGRESO.find(c => c.id === id)
    || { id: id || 'otros', nombre: 'Sin categoría', grupo: 'deseos' };
}

class Finance {
  async cuentas() {
    return (await fdb.lista('accounts')).map(c => ({ ...c, tipo: tipoCuenta(c) }));
  }

  // Saldo de cada cuenta con los movimientos confirmados hasta `fecha` (incluida).
  async saldosEn(fecha) {
    const accounts = await this.cuentas();
    const transactions = await fdb.lista('transactions');
    let saldos = {};

    accounts.forEach(a => {
      saldos[a.id] = a.balanceInitial || 0;
    });

    transactions.filter(t => t.status === 'confirmed' && t.date <= fecha).forEach(t => {
      if (t.type === 'income') saldos[t.accountId] = (saldos[t.accountId] || 0) + t.amount;
      if (t.type === 'expense') saldos[t.accountId] = (saldos[t.accountId] || 0) - t.amount;
      if (t.type === 'transfer') {
        saldos[t.fromAccountId] = (saldos[t.fromAccountId] || 0) - t.amount;
        saldos[t.toAccountId] = (saldos[t.toAccountId] || 0) + t.amount;
      }
    });

    return saldos;
  }

  // Saldo a hoy. Los movimientos de fecha futura entran en dineroProyectado().
  async saldoRegistrado() {
    return this.saldosEn(fechaLocal());
  }

  async sumaLiquida(saldos) {
    const accounts = await this.cuentas();
    return accounts.filter(a => TIPOS_CUENTA[a.tipo].liquida).reduce((s, a) => s + (saldos[a.id] || 0), 0);
  }

  // Solo cuentas líquidas: una tarjeta de crédito no es dinero disponible.
  async dineroDisponibleHoy() {
    return this.sumaLiquida(await this.saldoRegistrado());
  }

  // Activos - pasivos (los pasivos ya están en negativo).
  async patrimonio() {
    const saldos = await this.saldoRegistrado();
    const accounts = await this.cuentas();
    let activos = 0, pasivos = 0;
    accounts.forEach(a => {
      const s = saldos[a.id] || 0;
      if (TIPOS_CUENTA[a.tipo].naturaleza === 'pasivo') pasivos += Math.max(0, -s);
      else activos += s;
    });
    return { activos, pasivos, neto: activos - pasivos };
  }

  async obligacionesPendientes() {
    const obligations = await fdb.lista('obligations');
    return obligations.filter(o => o.status === 'pending' || o.status === 'partially_paid');
  }

  async dineroComprometido() {
    const obligations = await this.obligacionesPendientes();
    const transactions = await fdb.lista('transactions');
    const gastosPendientes = transactions.filter(t => t.type === 'expense' && t.status === 'pending');

    const obligSum = obligations.reduce((sum, o) => sum + (o.amountPending || 0), 0);
    const gastoSum = gastosPendientes.reduce((sum, g) => sum + g.amount, 0);

    return obligSum + gastoSum;
  }

  // Liquidez esperada en `daysAhead` días: saldos líquidos con los movimientos
  // futuros ya registrados, menos obligaciones pendientes que vencen antes.
  async dineroProyectado(daysAhead = 30) {
    const ahora = new Date();
    const futuro = fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + daysAhead));
    let proyectado = await this.sumaLiquida(await this.saldosEn(futuro));

    (await this.obligacionesPendientes())
      .filter(o => o.dueDate <= futuro)
      .forEach(o => {
        proyectado -= (o.amountPending || 0);
      });

    return proyectado;
  }

  // Ingresos, gastos por categoría y por grupo de un mes 'YYYY-MM'.
  // Las transferencias entre cuentas propias no son ingreso ni gasto.
  async resumenMes(mes, transactions = null) {
    transactions = transactions || await fdb.lista('transactions');
    const delMes = transactions.filter(t => t.status === 'confirmed' && mesDe(t.date) === mes);
    const r = { mes, ingresos: 0, gastos: 0, porCategoria: {}, porGrupo: { necesidades: 0, deseos: 0 }, movimientos: delMes.length };
    delMes.forEach(t => {
      if (t.type === 'income') r.ingresos += t.amount;
      if (t.type === 'expense') {
        r.gastos += t.amount;
        const c = categoria(t.categoria);
        r.porCategoria[c.id] = (r.porCategoria[c.id] || 0) + t.amount;
        r.porGrupo[c.grupo] = (r.porGrupo[c.grupo] || 0) + t.amount;
      }
    });
    return r;
  }

  // ---- Cuentas ----

  // datos: { nombre, tipo, saldo, tasaEA, cuotaMinima, cupo }.
  // Para pasivos, `saldo` es lo que debes (positivo).
  async registraCuenta(datos, tipoLegado, saldoLegado) {
    if (typeof datos === 'string') datos = { nombre: datos, tipo: TIPOS_LEGADO[tipoLegado] || tipoLegado, saldo: saldoLegado };
    const { nombre, tipo, saldo = 0, tasaEA = 0, cuotaMinima = 0, cupo = 0, id } = datos;
    if (!nombre) throw new Error('Ponle un nombre a la cuenta');
    if (!TIPOS_CUENTA[tipo]) throw new Error('Tipo de cuenta inválido');
    const pasivo = TIPOS_CUENTA[tipo].naturaleza === 'pasivo';
    if (pasivo && saldo < 0) throw new Error('Escribe la deuda como un valor positivo');
    const previa = id !== undefined ? await fdb.obten('accounts', id) : null;
    const cuenta = {
      ...(previa || {}),
      nombre,
      tipo,
      balanceInitial: pasivo ? -Math.abs(saldo) : saldo,
      tasaEA: pasivo ? tasaEA : 0,
      cuotaMinima: pasivo ? cuotaMinima : 0,
      cupo: tipo === 'tarjeta' ? cupo : 0,
      createdAt: previa ? previa.createdAt : new Date().toISOString(),
      status: 'active'
    };
    return fdb.guarda('accounts', cuenta);
  }

  async borraCuenta(id) {
    const usada = (await fdb.lista('transactions')).some(t => t.accountId === id || t.fromAccountId === id || t.toAccountId === id);
    if (usada) throw new Error('La cuenta tiene movimientos. Bórralos o muévelos primero.');
    return fdb.borra('accounts', id);
  }

  // ---- Movimientos ----

  async validaMovimiento(m) {
    if (!(m.amount > 0)) throw new Error('El monto debe ser mayor que 0');
    if (!m.date) throw new Error('Indica la fecha');
    if (m.type === 'transfer') {
      if (m.fromAccountId === m.toAccountId) throw new Error('Elige dos cuentas distintas');
      if (!(await fdb.obten('accounts', m.fromAccountId)) || !(await fdb.obten('accounts', m.toAccountId))) throw new Error('La cuenta no existe');
    } else if (!(await fdb.obten('accounts', m.accountId))) {
      throw new Error('La cuenta no existe');
    }
  }

  // date: 'YYYY-MM-DD' (por defecto, hoy en hora local)
  async registraMovimiento(accountId, type, amount, description, date = fechaLocal(), cat = null, extra = {}) {
    const movimiento = {
      accountId,
      type,
      amount,
      description,
      categoria: cat || (type === 'income' ? 'otros_ingresos' : 'otros'),
      date,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      ...extra
    };
    await this.validaMovimiento(movimiento);
    return fdb.guarda('transactions', movimiento);
  }

  // Entre cuentas propias. Pagar la tarjeta es una transferencia hacia la tarjeta.
  async registraTransferencia(fromAccountId, toAccountId, amount, description, date = fechaLocal()) {
    const movimiento = {
      type: 'transfer',
      fromAccountId,
      toAccountId,
      amount,
      description,
      date,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    await this.validaMovimiento(movimiento);
    return fdb.guarda('transactions', movimiento);
  }

  async actualizaMovimiento(id, cambios) {
    const previo = await fdb.obten('transactions', id);
    if (!previo) throw new Error('Movimiento no encontrado');
    if (previo.obligationId && cambios.amount !== undefined && cambios.amount !== previo.amount) {
      throw new Error('Este movimiento es el pago de una obligación: bórralo y registra el pago de nuevo.');
    }
    const movimiento = { ...previo, ...cambios, id };
    await this.validaMovimiento(movimiento);
    return fdb.guarda('transactions', movimiento);
  }

  // Si era el pago de una obligación, la obligación vuelve a quedar pendiente por ese monto.
  async borraMovimiento(id) {
    const mov = await fdb.obten('transactions', id);
    if (!mov) throw new Error('Movimiento no encontrado');
    if (mov.obligationId) {
      const o = await fdb.obten('obligations', mov.obligationId);
      if (o) {
        const amountPaid = Math.max(0, (o.amountPaid || 0) - mov.amount);
        const amountPending = o.amountTotal - amountPaid;
        await fdb.guarda('obligations', { ...o, amountPaid, amountPending, status: amountPaid === 0 ? 'pending' : 'partially_paid' });
      }
    }
    return fdb.borra('transactions', id);
  }

  // ---- Obligaciones ----

  async registraObligacion(nombre, amount, dueDate, description, cat = 'otros') {
    if (!nombre) throw new Error('Ponle un nombre a la obligación');
    if (!(amount > 0)) throw new Error('El monto debe ser mayor que 0');
    if (!dueDate) throw new Error('Indica la fecha de vencimiento');
    const obligacion = {
      nombre,
      amountTotal: amount,
      amountPaid: 0,
      amountPending: amount,
      dueDate,
      description,
      categoria: cat,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    return fdb.guarda('obligations', obligacion);
  }

  // Cada pago (total o parcial) es un gasto confirmado en la cuenta elegida
  // y actualiza la misma obligación (no crea otra).
  async pagaObligacion(obligationId, amount, accountId, date = fechaLocal()) {
    const obligacion = await fdb.obten('obligations', obligationId);
    if (!obligacion) throw new Error('Obligación no encontrada');
    if (!(amount > 0)) throw new Error('El monto debe ser mayor que 0');
    if (amount > obligacion.amountPending) throw new Error('El pago supera el saldo pendiente');

    await this.registraMovimiento(accountId, 'expense', amount, `Pago: ${obligacion.nombre}`, date,
      obligacion.categoria || 'otros', { obligationId });

    const nuevoMontoPagado = (obligacion.amountPaid || 0) + amount;
    const nuevoMontoPendiente = obligacion.amountTotal - nuevoMontoPagado;
    const nuevoEstado = nuevoMontoPendiente <= 0 ? 'fully_paid' : 'partially_paid';

    const obligacionActualizada = {
      ...obligacion,
      amountPaid: nuevoMontoPagado,
      amountPending: Math.max(0, nuevoMontoPendiente),
      status: nuevoEstado
    };

    return fdb.guarda('obligations', obligacionActualizada);
  }

  // ---- Presupuesto mensual por categoría ----

  async presupuestos() {
    const mapa = {};
    (await fdb.lista('budgets')).forEach(b => { mapa[b.categoria] = b; });
    return mapa;
  }

  // monto 0 elimina el presupuesto de esa categoría
  async guardaPresupuesto(cat, monto) {
    const previo = (await this.presupuestos())[cat];
    if (!(monto > 0)) return previo ? fdb.borra('budgets', previo.id) : null;
    return fdb.guarda('budgets', { ...(previo || {}), categoria: cat, monto });
  }

  // ---- Metas de ahorro ----

  async metas() {
    return (await fdb.lista('goals')).filter(g => g.tipo !== 'emergencia');
  }

  async registraMeta(nombre, meta, fechaObjetivo, ahorrado = 0, id) {
    if (!nombre) throw new Error('Ponle un nombre a la meta');
    if (!(meta > 0)) throw new Error('El valor de la meta debe ser mayor que 0');
    if (!fechaObjetivo) throw new Error('Indica la fecha objetivo');
    const previa = id !== undefined ? await fdb.obten('goals', id) : null;
    return fdb.guarda('goals', { ...(previa || {}), tipo: 'meta', nombre, meta, fechaObjetivo, ahorrado: ahorrado || 0 });
  }

  async abonaMeta(id, monto) {
    const meta = await fdb.obten('goals', id);
    if (!meta) throw new Error('Meta no encontrada');
    if (!monto) throw new Error('Escribe un monto');
    return fdb.guarda('goals', { ...meta, ahorrado: Math.max(0, (meta.ahorrado || 0) + monto) });
  }

  async borraMeta(id) {
    return fdb.borra('goals', id);
  }

  // Meses de gastos esenciales que debe cubrir el fondo de emergencia (3 a 12).
  async mesesEmergencia() {
    const conf = (await fdb.lista('goals')).find(g => g.tipo === 'emergencia');
    return conf ? conf.meses : 6;
  }

  async guardaMesesEmergencia(meses) {
    const conf = (await fdb.lista('goals')).find(g => g.tipo === 'emergencia');
    return fdb.guarda('goals', { ...(conf || {}), tipo: 'emergencia', meses });
  }
}

const finance = new Finance();
