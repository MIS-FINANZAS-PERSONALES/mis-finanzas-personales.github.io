// Gráficos en HTML/CSS (sin librerías). Cada marca lleva data-tip con su
// valor; un único tooltip flotante lo muestra al pasar el mouse o con foco.

function nombreMes(mes, corto = false) {
  const [y, m] = mes.split('-').map(Number);
  const t = new Date(y, m - 1, 1).toLocaleDateString('es-CO', corto ? { month: 'short' } : { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const charts = {
  initTooltip() {
    if (document.getElementById('tooltip')) return;
    const tip = document.createElement('div');
    tip.id = 'tooltip';
    tip.className = 'tooltip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);

    const mostrar = (el, x, y) => {
      tip.innerHTML = el.getAttribute('data-tip');
      tip.style.display = 'block';
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px';
      tip.style.top = Math.max(8, y - h - 12) + 'px';
    };
    const ocultar = () => { tip.style.display = 'none'; };

    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tip]');
      if (el) mostrar(el, e.clientX, e.clientY); else ocultar();
    });
    document.addEventListener('mousemove', e => {
      const el = e.target.closest('[data-tip]');
      if (el) mostrar(el, e.clientX, e.clientY);
    });
    document.addEventListener('focusin', e => {
      const el = e.target.closest('[data-tip]');
      if (!el) return ocultar();
      const r = el.getBoundingClientRect();
      mostrar(el, r.left + r.width / 2, r.top);
    });
    document.addEventListener('focusout', ocultar);
    document.addEventListener('scroll', ocultar, true);
  },

  // Ingresos vs gastos por mes: barras agrupadas, un solo eje.
  mensual(serie) {
    if (!serie.some(s => s.ingresos || s.gastos)) return '<p class="muted">Aún no hay ingresos ni gastos registrados.</p>';
    const max = Math.max(1, ...serie.flatMap(s => [s.ingresos, s.gastos]));
    const tope = escalaRedonda(max);
    const columnas = serie.map(s => {
      const tip = `<strong>${esc(nombreMes(s.mes))}</strong><br>Ingresos: ${dinero(s.ingresos)}<br>Gastos: ${dinero(s.gastos)}<br>Balance: ${dinero(s.ingresos - s.gastos)}`;
      return `
        <div class="vb-col" data-tip="${esc(tip)}" tabindex="0">
          <div class="vb-bars">
            <div class="vb-bar s1" style="height:${(s.ingresos / tope) * 100}%"></div>
            <div class="vb-bar s2" style="height:${(s.gastos / tope) * 100}%"></div>
          </div>
          <div class="vb-label">${esc(nombreMes(s.mes, true))}</div>
        </div>`;
    }).join('');
    const filas = serie.map(s => `<tr><td>${esc(nombreMes(s.mes))}</td><td class="num">${dinero(s.ingresos)}</td><td class="num">${dinero(s.gastos)}</td><td class="num">${dinero(s.ingresos - s.gastos)}</td></tr>`).join('');
    return `
      <div class="legend"><span><i class="sw s1"></i>Ingresos</span><span><i class="sw s2"></i>Gastos</span></div>
      <div class="vb">
        <div class="vb-axis"><span>${dineroCorto(tope)}</span><span>${dineroCorto(tope / 2)}</span><span>0</span></div>
        <div class="vb-plot">
          <div class="vb-grid"><i></i><i></i><i></i></div>
          ${columnas}
        </div>
      </div>
      <details class="tabla-datos"><summary>Ver tabla</summary>
        <table class="tabla"><thead><tr><th>Mes</th><th class="num">Ingresos</th><th class="num">Gastos</th><th class="num">Balance</th></tr></thead><tbody>${filas}</tbody></table>
      </details>`;
  },

  // Gasto por categoría con marca del presupuesto.
  // items: [{ nombre, gastado, presupuesto }]
  categorias(items) {
    if (!items.length) return '<p class="muted">Sin gastos registrados en este periodo.</p>';
    const max = Math.max(1, ...items.map(i => Math.max(i.gastado, i.presupuesto || 0)));
    return '<div class="hb">' + items.map(i => {
      const excedido = i.presupuesto > 0 && i.gastado > i.presupuesto;
      const tip = `<strong>${esc(i.nombre)}</strong><br>Gastado: ${dinero(i.gastado)}` +
        (i.presupuesto ? `<br>Presupuesto: ${dinero(i.presupuesto)}<br>${excedido ? 'Excedido por' : 'Disponible'}: ${dinero(Math.abs(i.presupuesto - i.gastado))}` : '<br>Sin presupuesto');
      return `
        <div class="hb-row" data-tip="${esc(tip)}" tabindex="0">
          <div class="hb-name">${esc(i.nombre)}</div>
          <div class="hb-track">
            <div class="hb-bar" style="width:${(i.gastado / max) * 100}%"></div>
            ${i.presupuesto ? `<div class="hb-mark" style="left:${(i.presupuesto / max) * 100}%"></div>` : ''}
          </div>
          <div class="hb-val">${dinero(i.gastado)}${excedido ? ' ' + estado('critico', 'Excedido') : ''}</div>
        </div>`;
    }).join('') + '</div>' +
      '<div class="legend"><span><i class="sw s1"></i>Gastado</span><span><i class="sw-mark"></i>Presupuesto</span></div>';
  },

  // Barra de progreso con marca de meta (0-1). tono: s1 | good | warning | critical
  progreso(valor, meta = null, tono = 's1') {
    const v = Math.max(0, Math.min(1, valor));
    return `<div class="pg"><div class="pg-bar ${tono}" style="width:${v * 100}%"></div>${meta !== null ? `<div class="pg-mark" style="left:${Math.min(1, meta) * 100}%"></div>` : ''}</div>`;
  }
};

function escalaRedonda(max) {
  const pot = Math.pow(10, Math.floor(Math.log10(max)));
  const pasos = [1, 2, 2.5, 5, 10];
  for (const p of pasos) if (p * pot >= max) return p * pot;
  return 10 * pot;
}

function dineroCorto(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3).toLocaleString('es-CO') + ' mil';
  return '$' + Math.round(n);
}
