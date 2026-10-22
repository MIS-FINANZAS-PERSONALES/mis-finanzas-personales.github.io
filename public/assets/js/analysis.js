// Análisis financiero con reglas generales de finanzas personales.
// Es orientación educativa, no asesoría de inversión.
//
// Referencias usadas:
// - Regla 50/30/20: necesidades <= 50 %, deseos <= 30 %, ahorro >= 20 % del ingreso.
// - Fondo de emergencia: 3 a 6 meses de gastos esenciales (más si el ingreso es variable).
// - Endeudamiento: cuotas de deuda <= 30 % del ingreso; > 40 % es zona crítica.
// - Uso de tarjeta de crédito: < 30 % del cupo.

const UMBRALES = {
  ahorroMeta: 0.20,
  necesidadesMax: 0.50,
  deseosMax: 0.30,
  endeudamientoAlerta: 0.30,
  endeudamientoCritico: 0.40,
  utilizacionAlerta: 0.30,
  tasaAlta: 20 // % EA: deuda cara, conviene pagarla antes de ahorrar extra
};

// Tasa mensual equivalente a una tasa efectiva anual en %.
function tasaMensual(ea) {
  return Math.pow(1 + (ea || 0) / 100, 1 / 12) - 1;
}

class Analysis {
  // Promedio mensual de los últimos 3 meses completos con movimientos.
  // Sin historial, usa el mes en curso.
  async base() {
    const transactions = await fdb.lista('transactions');
    const actual = mesDe(fechaLocal());
    const meses = [];
    for (let i = 1; i <= 3; i++) {
      const r = await finance.resumenMes(sumaMeses(actual, -i), transactions);
      if (r.movimientos) meses.push(r);
    }
    const fuente = meses.length ? meses : [await finance.resumenMes(actual, transactions)];
    const n = fuente.length;
    const porCategoria = {};
    fuente.forEach(r => Object.entries(r.porCategoria).forEach(([c, v]) => { porCategoria[c] = (porCategoria[c] || 0) + v / n; }));
    return {
      periodo: meses.length ? `promedio de ${n} ${n === 1 ? 'mes' : 'meses'}` : 'mes en curso',
      ingresos: fuente.reduce((s, r) => s + r.ingresos, 0) / n,
      gastos: fuente.reduce((s, r) => s + r.gastos, 0) / n,
      necesidades: fuente.reduce((s, r) => s + r.porGrupo.necesidades, 0) / n,
      deseos: fuente.reduce((s, r) => s + r.porGrupo.deseos, 0) / n,
      porCategoria
    };
  }

  async deudas() {
    const saldos = await finance.saldoRegistrado();
    return (await finance.cuentas())
      .filter(c => TIPOS_CUENTA[c.tipo].naturaleza === 'pasivo' && (saldos[c.id] || 0) < 0)
      .map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, saldo: -saldos[c.id], tasaEA: c.tasaEA || 0, cuotaMinima: c.cuotaMinima || 0, cupo: c.cupo || 0 }));
  }

  async indicadores() {
    const b = await this.base();
    const liquidez = await finance.dineroDisponibleHoy();
    const patrimonio = await finance.patrimonio();
    const deudas = await this.deudas();
    const cuentas = await finance.cuentas();
    const saldos = await finance.saldoRegistrado();

    const cuotas = deudas.reduce((s, d) => s + d.cuotaMinima, 0);
    const tarjetas = cuentas.filter(c => c.tipo === 'tarjeta');
    const cupoTotal = tarjetas.reduce((s, c) => s + (c.cupo || 0), 0);
    const deudaTarjetas = tarjetas.reduce((s, c) => s + Math.max(0, -(saldos[c.id] || 0)), 0);
    const esencial = b.necesidades || b.gastos;

    const mes = mesDe(fechaLocal());
    const resumenMes = await finance.resumenMes(mes);
    const presupuestos = await finance.presupuestos();
    const excedidas = Object.values(presupuestos)
      .map(p => ({ categoria: p.categoria, presupuesto: p.monto, gastado: resumenMes.porCategoria[p.categoria] || 0 }))
      .filter(p => p.gastado > p.presupuesto)
      .sort((a, b) => (b.gastado - b.presupuesto) - (a.gastado - a.presupuesto));

    const mesesEmergencia = await finance.mesesEmergencia();
    const metas = (await finance.metas()).map(m => this.estadoMeta(m));

    return {
      base: b,
      liquidez,
      patrimonio,
      deudas,
      totalDeuda: deudas.reduce((s, d) => s + d.saldo, 0),
      cuotas,
      tasaAhorro: b.ingresos > 0 ? (b.ingresos - b.gastos) / b.ingresos : null,
      pctNecesidades: b.ingresos > 0 ? b.necesidades / b.ingresos : null,
      pctDeseos: b.ingresos > 0 ? b.deseos / b.ingresos : null,
      gastoEsencial: esencial,
      mesesCobertura: esencial > 0 ? liquidez / esencial : null,
      mesesEmergencia,
      metaEmergencia: esencial * mesesEmergencia,
      endeudamiento: b.ingresos > 0 && deudas.length ? cuotas / b.ingresos : (deudas.length ? null : 0),
      utilizacion: cupoTotal > 0 ? deudaTarjetas / cupoTotal : null,
      deudaCara: deudas.filter(d => d.tasaEA >= UMBRALES.tasaAlta),
      tienePresupuesto: Object.keys(presupuestos).length > 0,
      excedidas,
      metas
    };
  }

  estadoMeta(m) {
    const hoy = new Date();
    const [y, mo, d] = m.fechaObjetivo.split('-').map(Number);
    const objetivo = new Date(y, mo - 1, d);
    const mesesRestantes = Math.max(0, (objetivo.getFullYear() - hoy.getFullYear()) * 12 + objetivo.getMonth() - hoy.getMonth());
    const falta = Math.max(0, m.meta - (m.ahorrado || 0));
    return {
      ...m,
      falta,
      progreso: Math.min(1, (m.ahorrado || 0) / m.meta),
      mesesRestantes,
      aporteMensual: falta === 0 ? 0 : (mesesRestantes > 0 ? falta / mesesRestantes : falta),
      vencida: falta > 0 && objetivo < hoy
    };
  }

  // Puntaje 0-100. Cada componente vale lo mismo; los que no tienen datos no cuentan.
  puntaje(ind) {
    // Sin ingresos registrados no hay base para evaluar nada.
    if (!(ind.base.ingresos > 0)) return null;
    const comp = [];
    const add = (nombre, puntos) => comp.push({ nombre, puntos });

    if (ind.tasaAhorro !== null) {
      const t = ind.tasaAhorro;
      add('Tasa de ahorro', t >= 0.20 ? 20 : t >= 0.10 ? 13 : t > 0 ? 6 : 0);
    }
    if (ind.mesesCobertura !== null) {
      const m = ind.mesesCobertura;
      add('Fondo de emergencia', m >= 6 ? 20 : m >= 3 ? 15 : m >= 1 ? 8 : 0);
    }
    if (ind.endeudamiento !== null) {
      const e = ind.endeudamiento;
      add('Endeudamiento', e <= 0.15 ? 20 : e <= 0.30 ? 14 : e <= 0.40 ? 6 : 0);
    }
    if (ind.utilizacion !== null) {
      const u = ind.utilizacion;
      add('Uso de tarjetas', u <= 0.10 ? 20 : u <= 0.30 ? 15 : u <= 0.50 ? 8 : 0);
    }
    if (ind.base.ingresos > 0) {
      add('Presupuesto', !ind.tienePresupuesto ? 5 : ind.excedidas.length === 0 ? 20 : ind.excedidas.length <= 2 ? 12 : 4);
    }

    if (!comp.length) return null;
    const total = Math.round(comp.reduce((s, c) => s + c.puntos, 0) / (comp.length * 20) * 100);
    const nivel = total >= 80 ? 'Sólida' : total >= 60 ? 'Estable' : total >= 40 ? 'En riesgo' : 'Crítica';
    return { total, nivel, componentes: comp };
  }

  // Recomendaciones en orden de prioridad (lo urgente primero).
  recomendaciones(ind) {
    const r = [];
    const b = ind.base;
    const $ = n => dinero(n);

    if (b.ingresos === 0 && b.gastos === 0) {
      r.push({ nivel: 'info', titulo: 'Registra tus movimientos', detalle: 'Con al menos un mes de ingresos y gastos podré calcular tu tasa de ahorro, tu fondo de emergencia y tu presupuesto.' });
      return r;
    }

    if (b.gastos > b.ingresos) {
      r.push({ nivel: 'critico', titulo: 'Gastas más de lo que ganas',
        detalle: `En el ${b.periodo} gastaste ${$(b.gastos)} con ingresos de ${$(b.ingresos)}: un déficit de ${$(b.gastos - b.ingresos)} al mes. Antes de cualquier otra meta, recorta deseos (${$(b.deseos)}/mes) hasta cerrar esa brecha.` });
    }

    if (ind.mesesCobertura !== null && ind.mesesCobertura < 1) {
      r.push({ nivel: 'critico', titulo: 'Arma un fondo de emergencia inicial',
        detalle: `Tu dinero disponible cubre ${ind.mesesCobertura.toFixed(1)} meses de gastos esenciales. Lleva primero a 1 mes (${$(ind.gastoEsencial)}) en una cuenta de ahorros aparte; así un imprevisto no termina en la tarjeta de crédito.` });
    }

    if (ind.endeudamiento !== null && ind.endeudamiento > UMBRALES.endeudamientoCritico) {
      r.push({ nivel: 'critico', titulo: 'Tu nivel de endeudamiento es crítico',
        detalle: `Las cuotas mínimas (${$(ind.cuotas)}) son el ${pct(ind.endeudamiento)} de tu ingreso. Por encima del 40 % es difícil sostenerse ante cualquier imprevisto. No tomes deuda nueva y considera hablar con tu banco sobre una reestructuración o compra de cartera a menor tasa.` });
    } else if (ind.endeudamiento !== null && ind.endeudamiento > UMBRALES.endeudamientoAlerta) {
      r.push({ nivel: 'alerta', titulo: 'Endeudamiento por encima del 30 %',
        detalle: `Tus cuotas son el ${pct(ind.endeudamiento)} de tu ingreso. Evita nuevas deudas hasta bajar del 30 %.` });
    }

    if (ind.deudaCara.length) {
      const d = [...ind.deudaCara].sort((a, b) => b.tasaEA - a.tasaEA)[0];
      r.push({ nivel: 'alerta', titulo: 'Paga primero la deuda más cara',
        detalle: `${d.nombre} cobra ${d.tasaEA} % EA. Pagar deuda de esa tasa equivale a obtener un rendimiento seguro de ${d.tasaEA} % al año, más de lo que suele dar el ahorro. Después del fondo de emergencia inicial, dirige cada peso extra a esa deuda (método avalancha, en la pestaña Deudas).` });
    }

    if (ind.utilizacion !== null && ind.utilizacion > UMBRALES.utilizacionAlerta) {
      r.push({ nivel: 'alerta', titulo: 'Usas mucho cupo de tus tarjetas',
        detalle: `Debes el ${pct(ind.utilizacion)} del cupo total. Por encima del 30 % afecta tu historial crediticio y suele indicar que la tarjeta financia gastos del mes. Intenta pagar el total facturado cada mes para no pagar intereses.` });
    }

    if (ind.mesesCobertura !== null && ind.mesesCobertura >= 1 && ind.mesesCobertura < 3) {
      r.push({ nivel: 'alerta', titulo: 'Completa tu fondo de emergencia',
        detalle: `Cubres ${ind.mesesCobertura.toFixed(1)} meses de gastos esenciales. La meta mínima es 3 meses (${$(ind.gastoEsencial * 3)}); tu objetivo configurado es ${ind.mesesEmergencia} meses (${$(ind.metaEmergencia)}).` });
    }

    if (ind.tasaAhorro !== null && ind.tasaAhorro >= 0 && ind.tasaAhorro < UMBRALES.ahorroMeta) {
      const faltante = b.ingresos * UMBRALES.ahorroMeta - (b.ingresos - b.gastos);
      r.push({ nivel: 'alerta', titulo: 'Sube tu tasa de ahorro al 20 %',
        detalle: `Ahorras el ${pct(ind.tasaAhorro)} de tu ingreso. Para llegar al 20 % necesitas liberar ${$(faltante)} al mes. Truco: programa una transferencia automática a tu cuenta de ahorros el mismo día que recibes el sueldo ("págate primero").` });
    }

    if (ind.pctNecesidades !== null && ind.pctNecesidades > UMBRALES.necesidadesMax) {
      r.push({ nivel: 'alerta', titulo: 'Tus gastos fijos pesan más del 50 %',
        detalle: `Las necesidades se llevan el ${pct(ind.pctNecesidades)} de tu ingreso. Revisa los rubros grandes (vivienda, transporte, créditos): un ajuste ahí rinde más que muchos recortes pequeños.` });
    }

    if (ind.pctDeseos !== null && ind.pctDeseos > UMBRALES.deseosMax) {
      const top = Object.entries(b.porCategoria)
        .filter(([c]) => categoria(c).grupo === 'deseos')
        .sort((a, c) => c[1] - a[1]).slice(0, 2)
        .map(([c, v]) => `${categoria(c).nombre} (${$(v)})`).join(' y ');
      r.push({ nivel: 'alerta', titulo: 'Los gastos no esenciales superan el 30 %',
        detalle: `Se llevan el ${pct(ind.pctDeseos)} de tu ingreso. Los mayores: ${top}.` });
    }

    if (!ind.tienePresupuesto) {
      r.push({ nivel: 'info', titulo: 'Define tu presupuesto mensual',
        detalle: 'En la pestaña Presupuesto puedes generar uno sugerido a partir de tus gastos reales, ajustado a la regla 50/30/20.' });
    } else if (ind.excedidas.length) {
      const lista = ind.excedidas.slice(0, 3).map(e => `${categoria(e.categoria).nombre} (+${$(e.gastado - e.presupuesto)})`).join(', ');
      r.push({ nivel: 'alerta', titulo: 'Categorías por encima del presupuesto este mes', detalle: lista });
    }

    ind.metas.filter(m => m.vencida).forEach(m => {
      r.push({ nivel: 'alerta', titulo: `Meta vencida: ${m.nombre}`, detalle: `Faltan ${$(m.falta)}. Ajusta la fecha o el aporte para que vuelva a ser alcanzable.` });
    });

    if (ind.mesesCobertura !== null && ind.mesesCobertura >= 3 && (ind.tasaAhorro || 0) >= UMBRALES.ahorroMeta && !ind.deudaCara.length) {
      r.push({ nivel: 'bien', titulo: 'Tus bases están en orden',
        detalle: 'Tienes fondo de emergencia, ahorras al menos el 20 % y no tienes deuda cara. El siguiente paso es definir metas de largo plazo (vivienda, retiro, educación) y, si vas a invertir, buscar asesoría con un profesional certificado.' });
    }

    return r;
  }

  // Simula el pago de las deudas mes a mes.
  // estrategia: 'avalancha' (mayor tasa primero) o 'bola' (menor saldo primero).
  // rollover: la cuota de una deuda pagada se suma a la siguiente.
  planDeudas(deudas, extra = 0, estrategia = 'avalancha', rollover = true) {
    const ds = deudas.map(d => ({ ...d, restante: d.saldo, r: tasaMensual(d.tasaEA), pagadaEn: null }));
    const presupuestoMensual = ds.reduce((s, d) => s + d.cuotaMinima, 0) + extra;
    let intereses = 0, mes = 0, pagado = 0;

    while (ds.some(d => d.restante > 0.5) && mes < 600) {
      mes++;
      let interesMes = 0;
      ds.forEach(d => {
        if (d.restante <= 0) return;
        const i = d.restante * d.r;
        d.restante += i;
        interesMes += i;
      });
      intereses += interesMes;

      let bolsa = rollover ? presupuestoMensual : extra;
      const activas = ds.filter(d => d.restante > 0);
      activas.forEach(d => {
        const p = Math.min(d.cuotaMinima, d.restante);
        d.restante -= p;
        bolsa -= rollover ? p : 0;
        pagado += p;
      });

      const orden = activas.filter(d => d.restante > 0)
        .sort(estrategia === 'avalancha' ? (a, b) => b.r - a.r || a.restante - b.restante : (a, b) => a.restante - b.restante);
      for (const d of orden) {
        if (bolsa <= 0) break;
        const p = Math.min(bolsa, d.restante);
        d.restante -= p;
        bolsa -= p;
        pagado += p;
      }

      ds.forEach(d => { if (d.restante <= 0.5 && d.pagadaEn === null) { d.restante = 0; d.pagadaEn = mes; } });

      // Si en el primer mes lo pagado no cubre ni los intereses, la deuda nunca baja.
      if (mes === 1 && pagado <= interesMes + 0.5) {
        return { imposible: true, intereses: 0, meses: null, orden: [] };
      }
    }

    if (mes >= 600) return { imposible: true, intereses: 0, meses: null, orden: [] };
    return {
      imposible: false,
      meses: mes,
      intereses,
      orden: ds.filter(d => d.pagadaEn !== null).sort((a, b) => a.pagadaEn - b.pagadaEn).map(d => ({ nombre: d.nombre, mes: d.pagadaEn }))
    };
  }

  // Presupuesto sugerido a partir de tu gasto promedio por categoría.
  // Las necesidades (arriendo, cuotas, servicios) no se bajan de un mes a otro:
  // se mantienen. Los deseos se recortan proporcionalmente hasta lo menor entre
  // el 30 % del ingreso y lo que deja libre un ahorro del 20 %.
  async sugerirPresupuesto() {
    const b = await this.base();
    const sugerido = {};
    const redondea = v => Math.round(v / 10000) * 10000;
    const cats = g => Object.entries(b.porCategoria).filter(([c]) => categoria(c).grupo === g);

    cats('necesidades').forEach(([c, v]) => { if (redondea(v) > 0) sugerido[c] = redondea(v); });

    const deseos = cats('deseos');
    const suma = deseos.reduce((s, [, v]) => s + v, 0);
    const tope = b.ingresos > 0
      ? Math.max(0, Math.min(b.ingresos * UMBRALES.deseosMax, b.ingresos * (1 - UMBRALES.ahorroMeta) - b.necesidades))
      : suma;
    const factor = suma > tope ? tope / suma : 1;
    deseos.forEach(([c, v]) => { if (redondea(v * factor) > 0) sugerido[c] = redondea(v * factor); });

    return { sugerido, base: b, recorteDeseos: suma - suma * factor };
  }

  // Ingresos y gastos de los últimos n meses (para el gráfico).
  async serieMensual(n = 6) {
    const transactions = await fdb.lista('transactions');
    const actual = mesDe(fechaLocal());
    const serie = [];
    for (let i = n - 1; i >= 0; i--) {
      const r = await finance.resumenMes(sumaMeses(actual, -i), transactions);
      serie.push({ mes: r.mes, ingresos: r.ingresos, gastos: r.gastos });
    }
    return serie;
  }
}

function pct(x) {
  return Math.round(x * 100) + ' %';
}

const analysis = new Analysis();
