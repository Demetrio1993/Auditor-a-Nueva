/* app.js - Interfaz de la app de auditoría (módulos 1 a 9) */
'use strict';

var CLAVE = 'auditoria.pa.v1';
var VERSION_APP = 'B2.0';
var PASOS = [
  { n: 1, t: 'Encargo' }, { n: 2, t: 'Balanza' }, { n: 3, t: 'Planificación' }, { n: 4, t: 'Diario' }, { n: 5, t: 'Pruebas' }, { n: 6, t: 'Ajustes' },
  { n: 7, t: 'Balanza auditada' }, { n: 8, t: 'Estados' }, { n: 9, t: 'Cartas' }, { n: 10, t: 'Dictamen' }, { n: 11, t: 'Control' }, { n: 12, t: 'Exportar' }
];
var ESTADO = cargar();
var UI = { tab: 'bg', modo: 'audit', draft: null, abiertos: {}, todos: false, impOpen: false };

/* ---------- Estado y almacenamiento ---------- */
function estadoVacio() { return { version: 1, auditor: { nombre: '', idoneidad: '' }, empresas: {}, actual: null, paso: 0 }; }
function cargar() {
  try {
    var t = localStorage.getItem(CLAVE);
    if (t) { var o = JSON.parse(t); if (o && o.empresas) return o; }
  } catch (e) { /* sin almacenamiento */ }
  return estadoVacio();
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(ESTADO)); return true; } catch (e) { aviso('No se pudo guardar en este navegador (¿sin espacio?)'); return false; }
}
function emp() { return ESTADO.empresas[ESTADO.actual]; }
function nuevoId() { return 'e' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36); }
function empresaNueva(nombre) {
  return {
    id: nuevoId(), creada: new Date().toISOString(),
    encargo: { nombre: nombre || '', propietario: '', actividad: '', anio: String(new Date().getFullYear()), fechaIni: '', fechaCierre: '', marco: MARCOS[0], itbms: 'No', ciudad: 'Panamá', fechaCarta: '', estado: 'Planificación', honorarios: '', horasPres: '', fechaEntrega: '' },
    plan: { base: 'ingresos', pctMat: '', pctEjec: 75, pctTriv: 5, umbralPct: 20, check: {}, riesgoGlobal: '' },
    cuentas: [], ajustes: [], programa: {}, dictamen: { check: {}, ciudad: 'Panamá', opinion: '' }, notas: {}
  };
}
function setPath(obj, path, val) {
  var p = path.split('.'), o = obj;
  for (var i = 0; i < p.length - 1; i++) {
    var k = p[i];
    if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(p[i + 1]) ? [] : {};
    o = o[k];
  }
  o[p[p.length - 1]] = val;
}
function getPath(obj, path) {
  var p = path.split('.'), o = obj;
  for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; }
  return o;
}

/* ---------- Utilidades de presentación ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function aviso(t) {
  var el = document.getElementById('aviso');
  if (!el) return;
  el.textContent = t; el.className = 'aviso ver';
  clearTimeout(aviso.h); aviso.h = setTimeout(function () { el.className = 'aviso'; }, 2600);
}
function campo(etq, k, val, o) {
  o = o || {};
  var tipo = o.tipo || 'text', extra = o.g ? ' data-r="g"' : '';
  var h = '<label class="campo"><span>' + esc(etq) + '</span>';
  if (tipo === 'area') h += '<textarea rows="' + (o.filas || 3) + '" data-k="' + k + '"' + extra + ' data-nr="1">' + esc(val) + '</textarea>';
  else if (tipo === 'sel') {
    h += '<select data-k="' + k + '"' + extra + (o.nr ? ' data-nr="1"' : '') + '>';
    o.op.forEach(function (x) { var v = typeof x === 'object' ? x.id : x, t = typeof x === 'object' ? x.nombre : x; h += '<option value="' + esc(v) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>'; });
    h += '</select>';
  } else if (tipo === 'n') h += '<input data-k="' + k + '"' + extra + ' data-t="n" inputmode="decimal" value="' + (val ? r2(val) : '') + '" placeholder="0.00"' + (o.nr ? ' data-nr="1"' : '') + '>';
  else h += '<input type="' + tipo + '" data-k="' + k + '"' + extra + ' value="' + esc(val) + '" data-nr="1"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>';
  return h + '</label>';
}
function listaVal(res, m) {
  var l = res[m] || [];
  if (!l.length) return '';
  return '<ul class="vals" id="val' + m + '">' + l.map(function (x) { return '<li class="' + (x.ok ? 'ok' : 'no') + '">' + (x.ok ? '✔ ' : '✘ ') + esc(x.msg) + '</li>'; }).join('') + '</ul>';
}
function tablaEstado(filas) {
  return '<table class="est">' + filas.map(function (f) {
    if (f.k === 'tit') return '<tr class="tit"><td colspan="2">' + esc(f.t) + '</td></tr>';
    return '<tr class="' + f.k + '"><td>' + esc(f.t) + '</td><td class="num">' + (f.v === null ? '' : fmt(f.v, true)) + '</td></tr>';
  }).join('') + '</table>';
}
function tablaECP(filas) {
  var h = '<div class="tabla-scroll"><table class="est ecp"><tr class="tit"><td></td><td class="num">Capital</td><td class="num">Utilidades retenidas</td><td class="num">Retiros</td><td class="num">Resultado del ejercicio</td><td class="num">Total</td></tr>';
  filas.forEach(function (f) {
    h += '<tr class="' + f.k + '"><td>' + esc(f.t) + '</td>' + f.c.map(function (v) { return '<td class="num">' + (Math.abs(v) < 0.005 ? '-' : fmt(v, true)) + '</td>'; }).join('') + '</tr>';
  });
  return h + '</table></div>';
}
function encabezadoEstado(titulo) {
  var e = emp().encargo;
  return '<div class="enc-est"><b>' + esc(e.nombre || 'Nombre del negocio') + '</b><br>' + esc(titulo) + '<br>Al ' + esc(fechaLarga(e.fechaCierre)) + '<br><small>Expresado en balboas (B/.)</small></div>';
}
var OPT_RUBROS = (function () {
  var h = '<option value="">- elegir -</option>', sec = '';
  RUBROS.forEach(function (r) {
    if (r.sec !== sec) { if (sec) h += '</optgroup>'; h += '<optgroup label="' + esc(SECCIONES[r.sec].nombre) + '">'; sec = r.sec; }
    h += '<option value="' + r.id + '">' + esc(r.nombre) + '</option>';
  });
  return h + '</optgroup>';
})();
function selRubro(val, attrs) { return '<select ' + attrs + '>' + OPT_RUBROS.replace('value="' + val + '"', 'value="' + val + '" selected') + '</select>'; }

/* ---------- Estructura general ---------- */
function render() {
  var cab = document.getElementById('cab'), nav = document.getElementById('pasos'), vista = document.getElementById('vista'), pie = document.getElementById('pie');
  var e = ESTADO.actual && emp();
  cab.innerHTML = '<button class="ico" data-act="inicio" aria-label="Inicio">☰</button><div class="tit-app"><b>Auditoría</b><small>' + (e ? esc(e.encargo.nombre || 'Sin nombre') : 'Panamá · NIA y NIIF') + '</small></div>';
  if (!e || ESTADO.paso === 0) {
    nav.innerHTML = ''; pie.innerHTML = '';
    vista.innerHTML = vInicio();
    return;
  }
  asegurarEmp(e);
  var res = valApp(e);
  nav.innerHTML = PASOS.map(function (p) {
    var st = p.n <= 11 ? estadoModulo(res, p.n) : 'na';
    return '<button class="paso' + (ESTADO.paso === p.n ? ' act' : '') + '" data-act="paso" data-n="' + p.n + '"><i class="pt ' + st + '"></i>' + p.n + '. ' + p.t + '</button>';
  }).join('');
  var vistas = { 1: vPaso1, 2: vPaso2, 3: vPaso3, 4: vDiario, 5: vPaso4, 6: vPaso5, 7: vPaso6, 8: vPaso7, 9: vCartas, 10: vPaso8, 11: vControl, 12: vPaso9 };
  vista.innerHTML = vistas[ESTADO.paso](e, res);
  pie.innerHTML = '<button class="btn sec" data-act="ant"' + (ESTADO.paso <= 1 ? ' disabled' : '') + '>← Anterior</button><button class="btn" data-act="sig"' + (ESTADO.paso >= 12 ? ' disabled' : '') + '>Siguiente →</button>';
  if (ESTADO.paso === 2) actualizarTotales();
}
function refrescar() {
  var y = window.scrollY, sc = [].map.call(document.querySelectorAll('.tabla-scroll'), function (x) { return x.scrollLeft; });
  render();
  [].forEach.call(document.querySelectorAll('.tabla-scroll'), function (x, i) { if (sc[i]) x.scrollLeft = sc[i]; });
  window.scrollTo(0, y);
}
function irPaso(n) { ESTADO.paso = n; UI.draft = null; guardar(); render(); window.scrollTo(0, 0); }

/* ---------- Inicio ---------- */
function vInicio() {
  var ids = Object.keys(ESTADO.empresas);
  var h = '<section class="card"><h2>Mis encargos</h2>';
  if (!ids.length) h += '<p class="mut">Todavía no hay encargos. Cree uno nuevo o cargue el ejemplo para ver cómo funciona.</p>';
  ids.forEach(function (id) {
    var e = ESTADO.empresas[id]; asegurarEmp(e); var res = valApp(e);
    var pts = PASOS.slice(0, 11).map(function (p) { return '<i class="pt ' + estadoModulo(res, p.n) + '"></i>'; }).join('');
    h += '<button class="fila-emp" data-act="abrir" data-id="' + id + '"><b>' + esc(e.encargo.nombre || 'Sin nombre') + '</b><small>Ejercicio ' + esc(e.encargo.anio || '') + ' · ' + esc(e.encargo.estado) + ' · ' + e.cuentas.length + ' cuentas · ' + fmt(totalHoras(e)) + (e.encargo.horasPres ? ' de ' + fmt(e.encargo.horasPres) : '') + ' h' + (e.encargo.fechaEntrega ? ' · entrega ' + esc(e.encargo.fechaEntrega) : '') + '</small><span class="pts">' + pts + '</span></button>';
  });
  h += '<div class="botones"><button class="btn" data-act="nueva">+ Nuevo encargo</button><button class="btn sec" data-act="ejemplo">Cargar ejemplo</button></div></section>';
  h += '<section class="card"><h2>Datos del auditor</h2><p class="mut">Se usan en la firma del informe y la certificación.</p>' +
    campo('Nombre completo', 'auditor.nombre', ESTADO.auditor.nombre, { g: 1 }) + campo('N.º de idoneidad CPA', 'auditor.idoneidad', ESTADO.auditor.idoneidad, { g: 1 }) + '</section>';
  h += '<section class="card"><h2>Respaldo</h2><div class="botones"><button class="btn sec" data-act="respaldo">Descargar respaldo</button><label class="btn sec">Importar respaldo<input type="file" accept=".json,application/json" data-act="subirRespaldo" hidden></label></div>' +
    '<p class="mut">Los datos viven solo en este teléfono. Descargue un respaldo con frecuencia.</p></section>';
  h += '<section class="card"><h2>Instalar en el celular</h2><p class="mut">En Android (Chrome): menú ⋮ → Instalar aplicación. En iPhone (Safari): Compartir → Añadir a pantalla de inicio. Después de abrirla una vez con internet, funciona sin conexión.</p><p class="mut">Versión ' + VERSION_APP + '</p></section>';
  return h;
}

/* ---------- Paso 1: Encargo ---------- */
function vPaso1(e, res) {
  var c = e.encargo;
  return '<section class="card"><h2>1. Encargo y aceptación</h2><p class="mut">Datos del cliente y del ejercicio. Todo lo demás se arma a partir de aquí.</p>' +
    campo('Nombre del negocio o titular', 'encargo.nombre', c.nombre) +
    campo('Propietario', 'encargo.propietario', c.propietario) +
    campo('Actividad (servicios)', 'encargo.actividad', c.actividad) +
    '<div class="dos">' + campo('Ejercicio', 'encargo.anio', c.anio) + campo('Ciudad', 'encargo.ciudad', c.ciudad) + '</div>' +
    '<div class="dos">' + campo('Inicio del período', 'encargo.fechaIni', c.fechaIni, { tipo: 'date' }) + campo('Cierre del período', 'encargo.fechaCierre', c.fechaCierre, { tipo: 'date' }) + '</div>' +
    campo('Marco de información', 'encargo.marco', c.marco, { tipo: 'sel', op: MARCOS, nr: true }) +
    campo('Contribuyente del ITBMS (si es Sí, el programa agrega las pruebas IT-1)', 'encargo.itbms', c.itbms, { tipo: 'sel', op: ['No', 'Sí'] }) +
    '<p class="mut">' + (c.itbms === 'Sí' ? 'Activado: el módulo Pruebas incluye el papel IT-1 de ITBMS y las cartas lo mencionan. ' : 'Hoy el encargo se trata como no contribuyente del ITBMS. ') + 'La página de preguntas frecuentes de la DGI menciona ingresos anuales de más de B/. 36,000 o según la actividad económica para declarar el ITBMS; confirme con la DGI el umbral y si la actividad del cliente es gravada.</p>' +
    '<h4>Registro del encargo</h4><div class="dos">' + campo('Estado', 'encargo.estado', c.estado || 'Planificación', { tipo: 'sel', op: ['Planificación', 'Ejecución', 'Cierre', 'Informe emitido'], nr: true }) + campo('Fecha de entrega', 'encargo.fechaEntrega', c.fechaEntrega, { tipo: 'date' }) + '</div>' +
    '<div class="dos">' + campo('Honorarios pactados (B/.)', 'encargo.honorarios', c.honorarios, { tipo: 'n', nr: true }) + campo('Horas presupuestadas', 'encargo.horasPres', c.horasPres, { tipo: 'n', nr: true }) + '</div>' +
    campo('Fecha carta de compromiso', 'encargo.fechaCarta', c.fechaCarta, { tipo: 'date' }) +
    '<p class="mut">Plantilla anual: la balanza lleva saldo inicial y los 12 meses, sin atarse a un rango de fechas. Si el período es parcial (por ejemplo enero a mayo), deje en cero los meses sin movimiento.</p>' +
    listaVal(res, 1) + '</section>' +
    '<section class="card"><button class="btn peligro" data-act="borrarEmpresa">Eliminar este encargo</button></section>';
}

/* ---------- Paso 2: Balanza preliminar ---------- */
function vPaso2(e, res) {
  var h = '<section class="card"><h2>2. Balanza de comprobación preliminar</h2>' +
    '<p class="mut">Saldos según los libros del cliente, antes de auditar. Convención: <b>débito positivo, crédito negativo</b>. Cada mes lleva el movimiento neto del mes.</p>' +
    '<div class="botones"><button class="btn" data-act="addCuenta">+ Cuenta</button><button class="btn sec" data-act="toggleImp">Pegar desde Excel</button><button class="btn sec" data-act="vaciar">Vaciar</button></div>';
  if (UI.impOpen) {
    h += '<div class="imp"><p class="mut">Copie las celdas de Excel y péguelas aquí. Columnas: Código, Nombre, Rubro (opcional), Saldo inicial, Ene a Dic y Año anterior (opcional). Sin rubro, la app lo sugiere por el nombre.</p>' +
      '<textarea id="txtImp" rows="6" placeholder="1.1.01.001&#9;Banco&#9;EFE&#9;1000&#9;..."></textarea>' +
      '<div class="botones"><button class="btn" data-act="importar" data-m="add">Agregar</button><button class="btn sec" data-act="importar" data-m="rep">Reemplazar todo</button></div></div>';
  }
  h += '</section>';
  if (!e.cuentas.length) return h + '<section class="card"><p class="mut">No hay cuentas. Agregue cuentas o pegue la balanza.</p></section>';
  h += '<section class="card sin-pad"><div class="tabla-scroll"><table class="grid"><thead><tr><th>Código</th><th>Nombre</th><th>Rubro</th><th>Saldo inicial</th>' +
    MESES.map(function (m) { return '<th>' + m + '</th>'; }).join('') + '<th>Acumulado</th><th>Año anterior</th><th></th></tr></thead><tbody>';
  e.cuentas.forEach(function (c, i) {
    h += '<tr><td><input class="cod" data-k="cuentas.' + i + '.cod" data-nr="1" value="' + esc(c.cod) + '"></td><td><input class="nom" data-k="cuentas.' + i + '.nombre" data-nr="1" value="' + esc(c.nombre) + '"></td>' +
      '<td>' + selRubro(c.rubro || '', 'class="rub" data-k="cuentas.' + i + '.rubro" data-nr="1" data-cel="1"') + '</td>' +
      '<td><input class="cel" data-cel="1" data-nr="1" data-t="n" inputmode="decimal" data-k="cuentas.' + i + '.si" value="' + (c.si ? c.si : '') + '"></td>';
    for (var m = 0; m < 12; m++) h += '<td><input class="cel" data-cel="1" data-nr="1" data-t="n" inputmode="decimal" data-k="cuentas.' + i + '.m.' + m + '" value="' + (c.m && c.m[m] ? c.m[m] : '') + '"></td>';
    h += '<td class="num" id="ac-' + i + '">' + fmt(acum(c)) + '</td><td><input class="cel" data-cel="1" data-nr="1" data-t="n" inputmode="decimal" data-k="cuentas.' + i + '.pa" value="' + (c.pa ? c.pa : '') + '"></td><td><button class="x" data-act="delCuenta" data-i="' + i + '" aria-label="Quitar">✕</button></td></tr>';
  });
  h += '</tbody><tfoot><tr><td colspan="3">Suma (debe ser cero)</td><td class="num" id="tt-si"></td>';
  for (var j = 0; j < 12; j++) h += '<td class="num" id="tt-' + j + '"></td>';
  h += '<td class="num" id="tt-ac"></td><td class="num" id="tt-pa"></td><td></td></tr></tfoot></table></div></section>';
  h += '<section class="card">' + listaVal(res, 2) + '<p class="mut">El año anterior solo se necesita en las cuentas de resultados, para el análisis horizontal. En el balance se usa el saldo inicial.</p></section>';
  return h;
}
function actualizarTotales() {
  var e = emp(); if (!e) return;
  var s = function (f) { return r2(e.cuentas.reduce(function (t, c) { return t + (Number(f(c)) || 0); }, 0)); };
  var put = function (id, v, neutro) { var el = document.getElementById(id); if (el) { el.textContent = fmt(v); el.className = 'num' + (!neutro && Math.abs(v) >= 0.005 ? ' mal' : ''); } };
  put('tt-si', s(function (c) { return c.si; }));
  for (var j = 0; j < 12; j++) (function (jj) { put('tt-' + jj, s(function (c) { return c.m && c.m[jj]; })); })(j);
  put('tt-ac', s(acum));
  put('tt-pa', s(function (c) { return c.pa; }), true);
  e.cuentas.forEach(function (c, i) { var el = document.getElementById('ac-' + i); if (el) el.textContent = fmt(acum(c)); });
  var res = valApp(e), v = document.getElementById('val2');
  if (v) v.outerHTML = listaVal(res, 2);
}

/* ---------- Paso 3: Planificación ---------- */
function vPaso3(e, res) {
  var est = estados(e.cuentas, e.ajustes, 'prelim');
  var mat = materialidad(e, est);
  var h = '<section class="card"><h2>3. Planificación y análisis preliminar</h2><p class="mut">Con la balanza cargada se determina la materialidad, se buscan variaciones inusuales y se evalúa el riesgo por rubro.</p></section>';
  /* Estados iniciales */
  h += '<section class="card"><h3>Estados financieros iniciales (no auditados)</h3><p class="mut">Utilidad neta preliminar: <b>B/. ' + fmt(est.n.ni) + '</b>; activos: B/. ' + fmt(est.n.activos) + '; pasivos: B/. ' + fmt(est.n.pasivos) + '; patrimonio: B/. ' + fmt(est.n.patrimonio) + '.</p>' +
    '<div class="botones"><button class="btn sec" data-act="verEst" data-modo="prelim">Ver estados preliminares</button><button class="btn sec" data-act="xlsx" data-m="prelim">Exportar a Excel</button></div></section>';
  /* Materialidad */
  h += '<section class="card"><h3>Materialidad (NIA 320)</h3>' +
    campo('Base de cálculo', 'plan.base', mat.base, { tipo: 'sel', op: [{ id: 'ingresos', nombre: 'Ingresos' }, { id: 'activos', nombre: 'Activos totales' }, { id: 'utilidad', nombre: 'Utilidad antes de impuesto' }] }) +
    '<div class="tres">' + campo('% materialidad', 'plan.pctMat', mat.pctMat, { tipo: 'n', nr: false }) + campo('% ejecución', 'plan.pctEjec', mat.pctEjec, { tipo: 'n' }) + campo('% trivial', 'plan.pctTriv', mat.pctTriv, { tipo: 'n' }) + '</div>' +
    '<table class="kv"><tr><td>Base (' + esc(mat.base) + ')</td><td class="num">' + fmt(mat.valorBase) + '</td></tr><tr class="gran"><td>Materialidad global</td><td class="num">' + fmt(mat.mat) + '</td></tr><tr><td>Materialidad de ejecución</td><td class="num">' + fmt(mat.ejec) + '</td></tr><tr><td>Umbral claramente trivial</td><td class="num">' + fmt(mat.triv) + '</td></tr></table>' +
    '<p class="mut">Referencia con porcentajes usuales: 1 % de ingresos = ' + fmt(mat.ref.ingresos) + '; 2 % de activos = ' + fmt(mat.ref.activos) + '; 5 % de la utilidad antes de impuesto = ' + fmt(mat.ref.utilidad) + '.</p>' +
    '<p class="mut">Verificación: la NIA 320 no fija porcentajes. Su material de aplicación (párrafos A3 y A7) dice que se aplica un porcentaje a una base elegida como punto de partida, que elegirlo exige juicio profesional, y da como ejemplos 5 % de la utilidad antes de impuesto para una entidad con fines de lucro y 1 % de los ingresos o gastos totales para una sin fines de lucro, aclarando que pueden usarse porcentajes mayores o menores. El 2 % de activos es una práctica común, no un texto de la norma. Para un negocio de servicios con fines de lucro, la utilidad antes de impuesto suele ser la base más natural; si es muy pequeña o variable, use ingresos con un porcentaje menor.</p>' +
    campo('Justificación de la base y el porcentaje elegidos', 'plan.justMat', e.plan.justMat, { tipo: 'area', filas: 3 }) + '</section>';
  /* Horizontal y vertical */
  var cp = comparativo(e.cuentas, e.ajustes, 'prelim', { umbralPct: e.plan.umbralPct, umbralMonto: mat.triv });
  h += '<section class="card"><h3>Análisis horizontal y vertical</h3>' + campo('Marcar variaciones desde (%)', 'plan.umbralPct', e.plan.umbralPct, { tipo: 'n' });
  if (!cp.hayAntER) h += '<p class="mut">Para comparar resultados falta cargar la columna Año anterior en la balanza. El balance se compara con el saldo inicial.</p>';
  ['BG', 'ER'].forEach(function (es) {
    var filas = cp.filas.filter(function (f) { return f.estado === es; });
    if (!filas.length) return;
    h += '<div class="tabla-scroll"><table class="grid an"><thead><tr><th>' + (es === 'BG' ? 'Balance' : 'Resultados') + '</th><th>Actual</th><th>Anterior</th><th>Var. B/.</th><th>Var. %</th><th>% vertical</th></tr></thead><tbody>';
    filas.forEach(function (f) {
      h += '<tr class="' + (f.flag ? 'flag' : '') + '"><td>' + esc(f.t) + (f.flag ? ' ⚑' : '') + '</td><td class="num">' + fmt(f.cur) + '</td><td class="num">' + (f.tienePrev ? fmt(f.prev) : 'n/d') + '</td><td class="num">' + (f.tienePrev ? fmt(f.d) : 'n/d') + '</td><td class="num">' + (f.dp === null ? (f.tienePrev ? 'nuevo' : 'n/d') : pct(f.dp)) + '</td><td class="num">' + (f.vert === null ? '' : pct(f.vert)) + '</td></tr>';
    });
    h += '</tbody></table></div>';
  });
  h += '<p class="mut">⚑ marca variaciones iguales o mayores al porcentaje indicado y al umbral trivial. El % vertical es sobre activos totales (balance) o sobre ingresos (resultados).</p></section>';
  /* Razones */
  var rz = razones(est);
  h += '<section class="card"><h3>Razones financieras</h3><div class="tabla-scroll"><table class="grid an"><thead><tr><th>Razón</th><th>Valor</th><th>Lectura</th></tr></thead><tbody>';
  var gr = '';
  rz.forEach(function (r) {
    if (r.g !== gr) { h += '<tr class="grp"><td colspan="3">' + esc(r.g) + '</td></tr>'; gr = r.g; }
    h += '<tr><td>' + esc(r.t) + '</td><td class="num">' + esc(fmtRazon(r)) + '</td><td class="lect">' + esc(r.i) + '</td></tr>';
  });
  h += '</tbody></table></div><p class="mut">Lecturas orientativas con umbrales generales; compárelas con el sector y con el período anterior.</p></section>';
  /* ISR esperado */
  var isr = isrPN(est.n.uai);
  h += '<section class="card"><h3>Impuesto sobre la renta esperado (persona natural)</h3><table class="kv"><tr><td>Utilidad antes de impuesto (libros)</td><td class="num">' + fmt(est.n.uai) + '</td></tr><tr><td>ISR según tabla (11,000 exento; 15 % hasta 50,000; 5,850 + 25 % sobre el exceso)</td><td class="num">' + fmt(isr) + '</td></tr><tr><td>ISR registrado en libros</td><td class="num">' + fmt(est.n.gisr) + '</td></tr><tr class="gran"><td>Diferencia</td><td class="num">' + fmt(isr - est.n.gisr) + '</td></tr></table>' +
    '<p class="mut">Es un cálculo de prueba sobre la utilidad contable. La renta gravable real depende de ingresos exentos, gastos no deducibles y otras partidas de la declaración. La tabla coincide con la publicada por la DGI para personas naturales (consulta del 31/10/2026).</p></section>';
  /* Riesgo por rubro */
  var rs = rubrosConSaldo(e);
  h += '<section class="card"><h3>Riesgo por rubro (NIA 315)</h3><div class="tabla-scroll"><table class="grid an"><thead><tr><th>Rubro</th><th>Saldo en libros</th><th>Riesgo</th></tr></thead><tbody>';
  var pre = porRubro(e.cuentas, {}, 'prelim');
  rs.forEach(function (r) {
    var p = e.programa[r.id] || {};
    h += '<tr><td>' + esc(PROGRAMA[r.id].ref + ' ' + r.nombre) + '</td><td class="num">' + fmt(pre.cierre[r.id]) + '</td><td><select data-k="programa.' + r.id + '.riesgo">' + ['Bajo', 'Medio', 'Alto'].map(function (x) { return '<option' + ((p.riesgo || 'Medio') === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td></tr>';
  });
  h += '</tbody></table></div>' + campo('Riesgos globales y comentarios (fraude, control interno, partes relacionadas)', 'plan.riesgoGlobal', e.plan.riesgoGlobal, { tipo: 'area', filas: 4 }) + '</section>';
  /* Lista */
  h += '<section class="card"><h3>Lista de planificación</h3>' + CHECK_PLAN.map(function (c) {
    return '<label class="chk"><input type="checkbox" data-k="plan.check.' + c.id + '"' + (e.plan.check[c.id] ? ' checked' : '') + '><span>' + esc(c.t) + '</span></label>';
  }).join('') + listaVal(res, 3) + '</section>';
  return h;
}

/* ---------- Paso 4: Programa de pruebas ---------- */
function vPaso4(e, res) {
  var pre = porRubro(e.cuentas, {}, 'prelim');
  var rs = (UI.todos ? RUBROS : rubrosConSaldo(e)).slice();
  if (e.encargo.itbms === 'Sí') { rs.unshift({ id: 'ITBMS', nombre: 'ITBMS (contribuyente)', sec: 'IMP' }); pre.cierre.ITBMS = r2((pre.cierre.IMPA || 0) + (pre.cierre.IMPP || 0)); }
  var h = '<section class="card"><h2>5. Programa de pruebas por cuenta</h2><p class="mut">Cada rubro con saldo trae objetivo, procedimientos, documentos e instrucciones. Marque lo ejecutado, anote el hallazgo y concluya. Si una cuenta tiene salvedad, concluya "Con salvedad" y descríbala.</p>' +
    '<label class="chk"><input type="checkbox" data-act="todos"' + (UI.todos ? ' checked' : '') + '><span>Mostrar también los rubros sin saldo</span></label>' + listaVal(res, 5) + '</section>';
  rs.forEach(function (r) {
    var base = PROGRAMA[r.id], p = e.programa[r.id] || {}, pg = progresoRubro(e, r.id), conc = conclusionSugerida(e, r.id);
    var abierto = UI.abiertos[r.id] ? ' open' : '';
    h += '<details class="rub" data-rub="' + r.id + '"' + abierto + '><summary><span class="ref">' + base.ref + '</span><span class="nm">' + esc(r.nombre) + '</span><span class="sal">' + fmt(pre.cierre[r.id]) + '</span><span class="bar"><i style="width:' + pg.pct + '%"></i></span><span class="chip c-' + conc.replace(/\s/g, '').toLowerCase() + '">' + esc(conc) + '</span></summary><div class="cuerpo">';
    h += '<p><b>Objetivo.</b> ' + esc(base.objetivo) + '</p><p class="mut">Aserciones: ' + esc(base.aserciones) + ' · Riesgo: <b>' + esc(p.riesgo || 'Medio') + '</b></p>';
    h += '<h4>Procedimientos</h4>';
    base.procedimientos.forEach(function (t, i) {
      var ok = p.proc && p.proc[i] && p.proc[i].ok;
      h += '<label class="chk"><input type="checkbox" data-k="programa.' + r.id + '.proc.' + i + '.ok"' + (ok ? ' checked' : '') + '><span>' + esc(t) + '</span></label><input class="nota" placeholder="Nota o referencia del papel de trabajo" data-nr="1" data-k="programa.' + r.id + '.proc.' + i + '.nota" value="' + esc((p.proc && p.proc[i] && p.proc[i].nota) || '') + '">';
    });
    h += '<h4>Documentos necesarios</h4>';
    base.documentos.forEach(function (t, i) {
      var ok = p.doc && p.doc[i] && p.doc[i].ok;
      h += '<label class="chk"><input type="checkbox" data-k="programa.' + r.id + '.doc.' + i + '.ok"' + (ok ? ' checked' : '') + '><span>' + esc(t) + '</span></label>';
    });
    h += '<h4>Instrucciones</h4><p>' + esc(base.instrucciones) + '</p>';
    var sp = p.saldoProbado, dif = (sp === undefined || sp === '' || sp === null) ? null : r2(sp - pre.cierre[r.id]);
    h += '<h4>Resultado de la prueba</h4>' + campo('Saldo según la prueba (confirmado o recalculado)', 'programa.' + r.id + '.saldoProbado', p.saldoProbado, { tipo: 'n' });
    if (dif !== null) h += '<p class="' + (Math.abs(dif) >= 0.005 ? 'mal' : 'okt') + '">Diferencia contra libros: B/. ' + fmt(dif) + '</p>' + (r.id === 'ITBMS' ? '' : '<button class="btn sec" data-act="propAjuste" data-r="' + r.id + '" data-v="' + dif + '">Proponer ajuste</button>');
    h += campo('Hallazgo', 'programa.' + r.id + '.hallazgo', p.hallazgo, { tipo: 'area', filas: 3 }) +
      campo('Conclusión', 'programa.' + r.id + '.conclusion', p.conclusion || '', { tipo: 'sel', op: [{ id: '', nombre: 'Automática (' + conc + ')' }].concat(CONCLUSIONES.map(function (x) { return { id: x, nombre: x }; })) }) +
      '<p class="mut">Avance: ' + pg.proc + ' de ' + pg.total + ' procedimientos y ' + pg.docs + ' de ' + pg.totalDocs + ' documentos.</p></div></details>';
  });
  return h;
}

/* ---------- Paso 5: Ajustes y salvedades ---------- */
function vPaso5(e, res) {
  if (UI.draft) return vEditorAjuste(e);
  var mat = materialidad(e, estados(e.cuentas, e.ajustes, 'prelim'));
  var dn = diferenciasNoCorregidas(e, mat);
  var h = '<section class="card"><h2>6. Ajustes del auditor y salvedades</h2><p class="mut">Cada ajuste es un asiento cuadrado. Solo los <b>Aceptados</b> entran en la balanza auditada. Los <b>No aceptados</b> quedan como diferencias no corregidas y pueden originar una salvedad.</p><div class="botones"><button class="btn" data-act="nuevoAjuste">+ Nuevo ajuste</button></div>' + listaVal(res, 6) + '</section>';
  if (!e.ajustes.length) h += '<section class="card"><p class="mut">Todavía no hay ajustes.</p></section>';
  e.ajustes.forEach(function (a) {
    var q = ajusteCuadrado(a);
    h += '<button class="fila-emp" data-act="editarAjuste" data-id="' + a.id + '"><b>' + esc(a.n) + ' · ' + esc(a.tipo) + '</b><small>' + esc(a.descripcion || 'Sin descripción') + '</small><span class="chip c-' + a.estado.replace(/\s/g, '').toLowerCase() + '">' + esc(a.estado) + '</span><span class="sal">' + fmt(q.debe) + (q.ok ? '' : ' ⚠ descuadrado') + '</span></button>';
  });
  var acc = efectoAjustes(e.cuentas, e.ajustes, ['Aceptado']);
  h += '<section class="card"><h3>Efecto de los ajustes</h3><table class="kv"><tr><td>Ajustes aceptados: efecto en la utilidad</td><td class="num">' + fmt(acc.utilidad) + '</td></tr><tr><td>Ajustes aceptados: efecto en activos</td><td class="num">' + fmt(acc.activos) + '</td></tr><tr><td>Diferencias no corregidas: efecto en la utilidad</td><td class="num">' + fmt(dn.efecto.utilidad) + '</td></tr><tr><td>Diferencias no corregidas: efecto en activos</td><td class="num">' + fmt(dn.efecto.activos) + '</td></tr><tr><td>Diferencias no corregidas: efecto en pasivos</td><td class="num">' + fmt(dn.efecto.pasivos) + '</td></tr><tr class="gran"><td>Mayor diferencia no corregida frente a la materialidad (' + fmt(mat.mat) + ')</td><td class="num">' + fmt(dn.mayor) + '</td></tr></table>';
  var msg = { ninguna: 'No hay diferencias no corregidas.', material: 'La diferencia no corregida supera la materialidad. Origina una opinión con salvedades o desfavorable según su efecto generalizado (NIA 450 y 705).', cercana: 'Está por encima de la materialidad de ejecución pero no de la global. Evalúe el efecto acumulado con otras diferencias.', 'no material': 'Está por debajo de la materialidad de ejecución. Se acumula en el resumen de diferencias.' };
  h += '<p class="' + (dn.nivel === 'material' ? 'mal' : 'mut') + '">' + esc(msg[dn.nivel]) + '</p></section>';
  return h;
}
function nuevoAjusteDraft() {
  var e = emp(), n = e.ajustes.length + 1;
  UI.draft = { id: 'a' + Date.now().toString(36), n: 'AJ-' + (n < 10 ? '0' : '') + n, fecha: e.encargo.fechaCierre || '', tipo: 'Ajuste', rubro: '', descripcion: '', estado: 'Propuesto', lineas: [{ cod: '', debe: 0, haber: 0 }, { cod: '', debe: 0, haber: 0 }], nuevo: true };
}
function opcionesCuentas(sel) {
  return '<option value="">- cuenta -</option>' + emp().cuentas.map(function (c) { return '<option value="' + esc(c.cod) + '"' + (c.cod === sel ? ' selected' : '') + '>' + esc(c.cod + ' ' + c.nombre) + '</option>'; }).join('');
}
function vEditorAjuste(e) {
  var d = UI.draft, q = ajusteCuadrado(d);
  var h = '<section class="card"><h2>' + (d.nuevo ? 'Nuevo ajuste' : 'Editar ajuste') + ' ' + esc(d.n) + '</h2>' +
    '<div class="dos"><label class="campo"><span>Tipo</span><select data-d="tipo">' + ['Ajuste', 'Reclasificación'].map(function (x) { return '<option' + (d.tipo === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label><label class="campo"><span>Fecha</span><input type="date" data-d="fecha" value="' + esc(d.fecha) + '"></label></div>' +
    '<label class="campo"><span>Rubro o papel de trabajo relacionado</span><select data-d="rubro">' + OPT_RUBROS.replace('value="' + d.rubro + '"', 'value="' + d.rubro + '" selected') + '</select></label>' +
    '<label class="campo"><span>Descripción y razón del ajuste</span><textarea rows="3" data-d="descripcion">' + esc(d.descripcion) + '</textarea></label>' +
    '<label class="campo"><span>Decisión</span><select data-d="estado">' + ['Propuesto', 'Aceptado', 'No aceptado'].map(function (x) { return '<option' + (d.estado === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
    '<h4>Líneas del asiento</h4>';
  d.lineas.forEach(function (l, i) {
    h += '<div class="linea"><select data-dl="' + i + '.cod">' + opcionesCuentas(l.cod) + '</select><input data-dl="' + i + '.debe" data-t="n" inputmode="decimal" placeholder="Debe" value="' + (l.debe ? l.debe : '') + '"><input data-dl="' + i + '.haber" data-t="n" inputmode="decimal" placeholder="Haber" value="' + (l.haber ? l.haber : '') + '"><button class="x" data-act="delLinea" data-i="' + i + '">✕</button></div>';
  });
  h += '<button class="btn sec" data-act="addLinea">+ Línea</button><p id="totAj" class="' + (q.ok ? 'okt' : 'mal') + '">Debe ' + fmt(q.debe) + ' · Haber ' + fmt(q.haber) + (q.ok ? ' · cuadra' : ' · no cuadra') + '</p>' +
    '<div class="botones"><button class="btn" data-act="guardarAjuste">Guardar</button><button class="btn sec" data-act="cancelarAjuste">Cancelar</button>' + (d.nuevo ? '' : '<button class="btn peligro" data-act="delAjuste">Eliminar</button>') + '</div></section>';
  return h;
}

/* ---------- Paso 6: Balanza auditada ---------- */
function vPaso6(e, res) {
  var mapa = ajustesAplicados(e.ajustes);
  var h = '<section class="card"><h2>7. Balanza auditada</h2><p class="mut">Saldo en libros más los ajustes aceptados.</p>' + listaVal(res, 7) + '</section>';
  if (!e.cuentas.length) return h;
  var t1 = 0, t2 = 0, t3 = 0;
  h += '<section class="card sin-pad"><div class="tabla-scroll"><table class="grid an"><thead><tr><th>Código</th><th>Cuenta</th><th>Rubro</th><th>Libros</th><th>Ajustes</th><th>Auditado</th></tr></thead><tbody>';
  e.cuentas.forEach(function (c) {
    var a = acum(c), j = mapa[c.cod] || 0, f = r2(a + j);
    t1 += a; t2 += j; t3 += f;
    h += '<tr' + (Math.abs(j) >= 0.005 ? ' class="flag"' : '') + '><td>' + esc(c.cod) + '</td><td>' + esc(c.nombre) + '</td><td>' + esc(c.rubro) + '</td><td class="num">' + fmt(a) + '</td><td class="num">' + fmt(j) + '</td><td class="num"><b>' + fmt(f) + '</b></td></tr>';
  });
  h += '</tbody><tfoot><tr><td colspan="3">Suma</td><td class="num">' + fmt(t1) + '</td><td class="num">' + fmt(t2) + '</td><td class="num">' + fmt(t3) + '</td></tr></tfoot></table></div></section>';
  return h;
}

/* ---------- Paso 7: Estados financieros y notas ---------- */
function notasAuto(e, est) {
  var c = e.encargo, n = est.n, mapa = ajustesAplicados(e.ajustes), notas = [];
  var rub = est.rub.cierre, ini = est.rub.ini;
  notas.push({ k: 'n1', t: '1. Información general', txt: (c.nombre || '[Nombre]') + ' es un negocio de persona natural con un solo propietario' + (c.propietario ? ' (' + c.propietario + ')' : '') + (c.actividad ? ', dedicado a ' + c.actividad : '') + '. Opera en ' + (c.ciudad || 'Panamá') + '. Los estados financieros corresponden al período terminado el ' + fechaLarga(c.fechaCierre) + '.' + (c.itbms === 'Sí' ? ' El negocio es contribuyente del ITBMS.' : ' El negocio no es contribuyente del ITBMS.') });
  notas.push({ k: 'n2', t: '2. Base de preparación', txt: 'Los estados financieros se prepararon de conformidad con ' + (c.marco || 'NIIF para las PYMES') + ', sobre la base del devengado. Se expresan en balboas (B/.), unidad monetaria de la República de Panamá, a la par con el dólar de los Estados Unidos de América.' });
  notas.push({ k: 'n3', t: '3. Políticas contables significativas', txt: 'Efectivo y equivalentes: incluye caja y depósitos bancarios a la vista.\nCuentas por cobrar: se presentan al valor de la factura menos la estimación por pérdidas esperadas, si la hay.\nPropiedad, planta y equipo: se mide al costo menos la depreciación acumulada, calculada por el método de línea recta durante la vida útil estimada. [Confirmar método y vidas útiles con el cliente]\nIngresos: los ingresos por servicios se reconocen cuando el servicio se presta.\nImpuesto sobre la renta: se determina con la tabla vigente para personas naturales.' });
  var det = [];
  RUBROS.forEach(function (r) {
    if (SECCIONES[r.sec].estado !== 'BG') return;
    var cu = e.cuentas.filter(function (x) { return x.rubro === r.id; });
    if (!cu.length || Math.abs(rub[r.id]) < 0.005) return;
    var lado = SECCIONES[r.sec].lado === 'A' ? 1 : -1;
    det.push([r.nombre, null]);
    cu.forEach(function (x) { det.push(['   ' + x.cod + ' ' + x.nombre, r2(lado * saldoCuenta(x, mapa, 'audit'))]); });
    det.push(['Total ' + r.nombre.toLowerCase(), r2(lado * rub[r.id])]);
  });
  notas.push({ k: 'n4', t: '4. Detalle de las cuentas del balance', txt: 'Saldos auditados al ' + fechaLarga(c.fechaCierre) + '.', tabla: det });
  var aportes = r2(-(rub.CAP - ini.CAP)), retiros = r2(-(rub.RET - ini.RET));
  notas.push({ k: 'n5', t: '5. Transacciones con el propietario (parte relacionada)', txt: 'Durante el período el propietario aportó B/. ' + fmt(aportes) + ' y retiró B/. ' + fmt(Math.abs(retiros)) + '. El saldo por pagar al propietario al cierre es de B/. ' + fmt(-rub.CXPP) + '. [Confirme la naturaleza de cada partida con el propietario]' });
  var isr = isrPN(n.uai);
  notas.push({ k: 'n6', t: '6. Impuesto sobre la renta', txt: 'La utilidad antes de impuesto es de B/. ' + fmt(n.uai) + '. Según la tabla de personas naturales (sin impuesto hasta B/. 11,000; 15 % sobre el exceso hasta B/. 50,000; B/. 5,850 más 25 % sobre el exceso de B/. 50,000), el cálculo sobre la utilidad contable es de B/. ' + fmt(isr) + '. El gasto registrado es de B/. ' + fmt(n.gisr) + '. La renta gravable de la declaración puede diferir por ingresos exentos y gastos no deducibles.' });
  notas.push({ k: 'n7', t: '7. Hechos posteriores', txt: '[Complete: hechos ocurridos entre el cierre y la fecha del informe, o indique que no se identificaron]' });
  notas.push({ k: 'n8', t: '8. Aprobación', txt: 'Los estados financieros fueron autorizados para su emisión por el propietario el [fecha].' });
  return notas;
}
function vPaso7(e, res) {
  var modo = UI.modo, est = estados(e.cuentas, e.ajustes, modo);
  var h = '<section class="card"><h2>8. Estados financieros' + (modo === 'prelim' ? ' preliminares' : ' auditados') + '</h2>' +
    '<div class="seg"><button class="' + (modo === 'prelim' ? 'act' : '') + '" data-act="modoEst" data-modo="prelim">No auditados</button><button class="' + (modo === 'audit' ? 'act' : '') + '" data-act="modoEst" data-modo="audit">Auditados</button></div>' +
    '<div class="seg pestanas">' + [['bg', 'Balance'], ['er', 'Resultados'], ['ecp', 'Patrimonio'], ['fe', 'Flujo'], ['nt', 'Notas']].map(function (t) { return '<button class="' + (UI.tab === t[0] ? 'act' : '') + '" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' + listaVal(res, 8) + '</section>';
  h += '<section class="card estado">';
  if (UI.tab === 'bg') h += encabezadoEstado('Balance general') + tablaEstado(est.bg);
  else if (UI.tab === 'er') h += encabezadoEstado('Estado de resultados') + tablaEstado(est.er);
  else if (UI.tab === 'ecp') h += encabezadoEstado('Estado de cambios en el patrimonio') + tablaECP(est.ecp);
  else if (UI.tab === 'fe') h += encabezadoEstado('Estado de flujos de efectivo (método indirecto)') + tablaEstado(est.fe);
  else {
    notasAuto(e, est).forEach(function (nt) {
      var txt = e.notas[nt.k] != null ? e.notas[nt.k] : nt.txt;
      h += '<h4>' + esc(nt.t) + '</h4><textarea rows="' + Math.min(10, Math.max(3, Math.ceil(txt.length / 42))) + '" data-k="notas.' + nt.k + '" data-nr="1">' + esc(txt) + '</textarea>';
      if (nt.tabla) h += '<table class="est">' + nt.tabla.map(function (f) { return '<tr' + (f[1] === null ? ' class="tit"' : '') + '><td>' + esc(f[0]) + '</td><td class="num">' + (f[1] === null ? '' : fmt(f[1], true)) + '</td></tr>'; }).join('') + '</table>';
    });
  }
  h += '</section><section class="card noprint"><button class="btn sec" data-act="imprimir">Imprimir o guardar PDF</button></section>';
  return h;
}

/* ---------- Paso 8: Cierre y dictamen ---------- */
function vPaso8(e, res) {
  var op = opinionSugerida(e), est = op.est, mapa = ajustesAplicados(e.ajustes);
  var pre = porRubro(e.cuentas, {}, 'prelim'), aud = porRubro(e.cuentas, mapa, 'audit');
  var d = e.dictamen;
  var h = '<section class="card"><h2>10. Cierre y dictamen</h2><p class="mut">Dictamen por cuenta, procedimientos finales, opinión, informe y certificación.</p>' + listaVal(res, 10) + '</section>';
  /* Dictamen por cuenta */
  h += '<section class="card"><h3>Dictamen por cuenta</h3>';
  rubrosConSaldo(e).forEach(function (r) {
    var sg = SECCIONES[r.sec].estado === 'BG' && SECCIONES[r.sec].lado === 'A' ? 1 : (SECCIONES[r.sec].estado === 'BG' ? -1 : (['ING', 'OIN'].indexOf(r.sec) >= 0 ? -1 : 1));
    var conc = conclusionSugerida(e, r.id), p = r2(sg * pre.cierre[r.id]), a = r2(sg * aud.cierre[r.id]);
    h += '<details class="rub"><summary><span class="ref">' + PROGRAMA[r.id].ref + '</span><span class="nm">' + esc(r.nombre) + '</span><span class="sal">' + fmt(a) + '</span><span class="chip c-' + conc.replace(/\s/g, '').toLowerCase() + '">' + esc(conc) + '</span></summary><div class="cuerpo"><p>' + esc(textoCuenta(e, r.id, p, r2(a - p), a, conc)) + '</p></div></details>';
  });
  h += '</section>';
  /* Opinión sugerida */
  h += '<section class="card"><h3>Evaluación de la opinión</h3><p>Opinión sugerida por los resultados: <b>' + esc(OPINIONES.filter(function (o) { return o.id === op.id; })[0].nombre) + '</b>.</p>' + (op.motivos.length ? '<ul class="vals">' + op.motivos.map(function (m) { return '<li class="no">' + esc(m) + '</li>'; }).join('') + '</ul>' : '<p class="mut">No hay diferencias materiales ni rubros con salvedad.</p>') + '</section>';
  /* Procedimientos finales */
  h += '<section class="card"><h3>Procedimientos finales</h3>' + CHECK_CIERRE.map(function (c) { return '<label class="chk"><input type="checkbox" data-k="dictamen.check.' + c.id + '"' + (d.check[c.id] ? ' checked' : '') + '><span>' + esc(c.t) + '</span></label>'; }).join('') + '</section>';
  /* Opinión y firma */
  h += '<section class="card"><h3>Opinión y firma</h3>' + campo('Tipo de opinión', 'dictamen.opinion', d.opinion, { tipo: 'sel', op: [{ id: '', nombre: '- elegir -' }].concat(OPINIONES) }) +
    campo('Fundamento de la salvedad, opinión desfavorable o abstención (cuestión, efecto y montos)', 'dictamen.salvedadTexto', d.salvedadTexto, { tipo: 'area', filas: 5 }) +
    campo('Párrafo de énfasis (opcional)', 'dictamen.enfasis', d.enfasis, { tipo: 'area', filas: 3 }) +
    '<div class="dos">' + campo('Ciudad', 'dictamen.ciudad', d.ciudad) + campo('Fecha del informe', 'dictamen.fechaInforme', d.fechaInforme, { tipo: 'date' }) + '</div>' +
    campo('Auditor (nombre)', 'auditor.nombre', ESTADO.auditor.nombre, { g: 1 }) + campo('Idoneidad CPA N.º', 'auditor.idoneidad', ESTADO.auditor.idoneidad, { g: 1 }) + '</section>';
  /* Informe */
  if (d.opinion) {
    h += '<section class="card informe"><h3>Informe del auditor independiente</h3>' + textosInforme(e, d.opinion).map(function (s) { return '<h4>' + esc(s.h) + '</h4>' + (s.p ? '<p>' + esc(s.p).replace(/\n/g, '<br>') + '</p>' : ''); }).join('') + '</section>';
  } else h += '<section class="card"><p class="mut">Elija el tipo de opinión para generar el informe.</p></section>';
  h += '<section class="card informe"><h3>Certificación</h3><p>' + esc(textoCertificacion(e)).replace(/\n/g, '<br>') + '</p><h3>Interpretación final</h3><p>' + esc(interpretacionFinal(e)) + '</p></section>';
  h += '<section class="card noprint"><button class="btn sec" data-act="imprimir">Imprimir o guardar PDF</button></section>';
  return h;
}

/* ---------- Paso 9: Exportar y respaldo ---------- */
function vPaso9(e) {
  return '<section class="card"><h2>12. Exportar y respaldo</h2><p class="mut">Los libros se generan en el teléfono. Los totales de las balanzas llevan fórmulas de Excel.</p>' +
    '<div class="botones col"><button class="btn" data-act="xlsx" data-m="todo">Libro de auditoría completo (Excel)</button><button class="btn sec" data-act="xlsx" data-m="prelim">Solo fase 1: estados no auditados y análisis</button><button class="btn sec" data-act="imprimir">Imprimir o guardar PDF de la pantalla actual</button></div></section>' +
    '<section class="card"><h3>Respaldo de datos</h3><div class="botones col"><button class="btn sec" data-act="respaldo">Descargar respaldo de todos los encargos</button><label class="btn sec">Importar respaldo<input type="file" accept=".json,application/json" data-act="subirRespaldo" hidden></label></div></section>' +
    '<section class="card"><h3>Próximos bloques</h3><ul class="vals"><li>Bloque 3: informe ejecutivo, matriz de riesgos, guía de muestras y control interno.</li><li>Bloque 4: conexión de solo lectura con la app contable y respaldos.</li></ul><p class="mut">Versión ' + VERSION_APP + '</p></section>';
}

/* ---------- Exportación a Excel ---------- */
function filasEst(filas) {
  return filas.map(function (f) {
    if (f.k === 'tit') return [{ v: f.t, s: 'b' }];
    return [{ v: f.t, s: (f.k === 'tot' || f.k === 'gran') ? 'b' : undefined }, f.v === null ? null : { v: f.v, s: (f.k === 'tot' || f.k === 'gran') ? 'bn' : 'n' }];
  });
}
function hojaEst(e, nombre, titulo, filas) {
  var c = e.encargo;
  return { nombre: nombre, anchos: [58, 18], filas: [[{ v: c.nombre || '', s: 't' }], [titulo], ['Al ' + fechaLarga(c.fechaCierre)], ['Expresado en balboas (B/.)'], []].concat(filasEst(filas)) };
}
function hojaECP(e, nombre, filas) {
  var c = e.encargo;
  var out = [[{ v: c.nombre || '', s: 't' }], ['Estado de cambios en el patrimonio'], ['Al ' + fechaLarga(c.fechaCierre)], [], [{ v: '', s: 'h' }, { v: 'Capital', s: 'h' }, { v: 'Utilidades retenidas', s: 'h' }, { v: 'Retiros', s: 'h' }, { v: 'Resultado del ejercicio', s: 'h' }, { v: 'Total', s: 'h' }]];
  filas.forEach(function (f) { out.push([{ v: f.t, s: f.k === 'fila' ? undefined : 'b' }].concat(f.c.map(function (v) { return { v: v, s: f.k === 'fila' ? 'n' : 'bn' }; }))); });
  return { nombre: nombre, anchos: [44, 16, 18, 16, 20, 16], filas: out };
}
function hojaTB(e, titulo, modo) {
  var mapa = ajustesAplicados(e.ajustes), n = e.cuentas.length, f = [[{ v: e.encargo.nombre || '', s: 't' }], [titulo + ' · convención: débito +, crédito -'], []];
  var enc = ['Código', 'Cuenta', 'Rubro'];
  if (modo === 'prelim') {
    enc = enc.concat(['Saldo inicial'], MESES, ['Acumulado', 'Año anterior']);
    f.push(enc.map(function (x) { return { v: x, s: 'h' }; }));
    e.cuentas.forEach(function (c, i) {
      var r = f.length + 1;
      var fila = [c.cod, c.nombre, c.rubro, c.si || 0];
      for (var m = 0; m < 12; m++) fila.push(c.m[m] || 0);
      fila.push({ v: acum(c), f: 'D' + r + '+SUM(E' + r + ':P' + r + ')' }); fila.push(c.pa || 0);
      f.push(fila);
    });
    var a = 5, z = 4 + n, tot = [{ v: 'Suma', s: 'b' }, null, null];
    for (var col = 3; col <= 17; col++) {
      var L = xlsxCol(col), val = col === 16 ? r2(e.cuentas.reduce(function (t, c) { return t + acum(c); }, 0)) : r2(e.cuentas.reduce(function (t, c) { return t + (col === 3 ? (c.si || 0) : col === 17 ? (c.pa || 0) : (c.m[col - 4] || 0)); }, 0));
      tot.push({ v: val, f: 'SUM(' + L + a + ':' + L + z + ')', s: 'bn' });
    }
    f.push(tot);
    return { nombre: 'TB-Preliminar', anchos: [14, 34, 8, 14].concat(MESES.map(function () { return 12; }), [14, 14]), filas: f };
  }
  enc = enc.concat(['Saldo en libros', 'Ajustes', 'Saldo auditado']);
  f.push(enc.map(function (x) { return { v: x, s: 'h' }; }));
  e.cuentas.forEach(function (c) {
    var r = f.length + 1, a = acum(c), j = mapa[c.cod] || 0;
    f.push([c.cod, c.nombre, c.rubro, a, j, { v: r2(a + j), f: 'D' + r + '+E' + r }]);
  });
  var tot = [{ v: 'Suma', s: 'b' }, null, null];
  var sa = r2(e.cuentas.reduce(function (t, c) { return t + acum(c); }, 0)), sj = r2(Object.keys(mapa).reduce(function (t, k) { return t + mapa[k]; }, 0));
  [['D', sa], ['E', sj], ['F', r2(sa + sj)]].forEach(function (p) { tot.push({ v: p[1], f: 'SUM(' + p[0] + '5:' + p[0] + (4 + n) + ')', s: 'bn' }); });
  f.push(tot);
  return { nombre: 'TB-Auditada', anchos: [14, 34, 8, 16, 14, 16], filas: f };
}
function libroExcel(e, modo) {
  var pre = estados(e.cuentas, e.ajustes, 'prelim'), aud = estados(e.cuentas, e.ajustes, 'audit');
  var mat = materialidad(e, pre), c = e.encargo, hojas = [];
  var res = valApp(e);
  var por = [[{ v: 'Auditoría externa', s: 't' }], [], ['Cliente', c.nombre], ['Propietario', c.propietario], ['Actividad', c.actividad], ['Ejercicio', c.anio], ['Cierre', fechaLarga(c.fechaCierre)], ['Marco', c.marco], ['Contribuyente ITBMS', c.itbms], ['Auditor', ESTADO.auditor.nombre], ['Idoneidad CPA', ESTADO.auditor.idoneidad], [], [{ v: 'Materialidad global', s: 'b' }, { v: mat.mat, s: 'n' }], ['Materialidad de ejecución', { v: mat.ejec, s: 'n' }], ['Umbral trivial', { v: mat.triv, s: 'n' }], [], [{ v: 'Estado de los módulos', s: 'b' }]];
  PASOS.slice(0, 11).forEach(function (p) { var l = res[p.n] || []; por.push([p.n + '. ' + p.t, l.filter(function (x) { return x.ok; }).length + ' de ' + l.length + ' controles cumplidos']); });
  hojas.push({ nombre: 'Portada', anchos: [30, 50], filas: por });
  hojas.push(hojaTB(e, 'Balanza de comprobación preliminar', 'prelim'));
  hojas.push(hojaEst(e, 'BG-NoAuditado', 'Balance general (no auditado)', pre.bg));
  hojas.push(hojaEst(e, 'ER-NoAuditado', 'Estado de resultados (no auditado)', pre.er));
  hojas.push(hojaECP(e, 'ECP-NoAuditado', pre.ecp));
  hojas.push(hojaEst(e, 'FE-NoAuditado', 'Flujo de efectivo, método indirecto (no auditado)', pre.fe));
  var cp = comparativo(e.cuentas, e.ajustes, 'prelim', { umbralPct: e.plan.umbralPct, umbralMonto: mat.triv });
  var an = [[{ v: 'Análisis horizontal y vertical (no auditado)', s: 't' }], [], ['Rubro', 'Actual', 'Anterior', 'Variación B/.', 'Variación %', '% vertical', 'Marca'].map(function (x) { return { v: x, s: 'h' }; })];
  cp.filas.forEach(function (f) { an.push([f.t, f.cur, f.tienePrev ? f.prev : 'n/d', f.tienePrev ? f.d : 'n/d', f.dp === null ? '' : r2(f.dp), f.vert === null ? '' : r2(f.vert), f.flag ? 'Revisar' : '']); });
  hojas.push({ nombre: 'Analisis-H-V', anchos: [40, 16, 16, 16, 14, 14, 10], filas: an });
  var rz = [[{ v: 'Razones financieras (no auditado)', s: 't' }], [], ['Grupo', 'Razón', 'Valor', 'Lectura'].map(function (x) { return { v: x, s: 'h' }; })];
  razones(pre).forEach(function (r) { rz.push([r.g, r.t, fmtRazon(r), r.i]); });
  hojas.push({ nombre: 'Razones', anchos: [16, 34, 18, 70], filas: rz });
  if (modo === 'todo') {
    var pg = [[{ v: 'Programa de auditoría por cuenta', s: 't' }], [], ['Ref.', 'Rubro', 'Saldo en libros', 'Riesgo', 'Objetivo', 'Procedimientos', 'Ejecutado', 'Documentos', 'Instrucciones', 'Hallazgo', 'Conclusión'].map(function (x) { return { v: x, s: 'h' }; })];
    var prr = porRubro(e.cuentas, {}, 'prelim');
    rubrosConSaldo(e).forEach(function (r) {
      var b = PROGRAMA[r.id], p = e.programa[r.id] || {}, g = progresoRubro(e, r.id);
      pg.push([b.ref, r.nombre, prr.cierre[r.id], p.riesgo || 'Medio', { v: b.objetivo, s: 'w' }, { v: b.procedimientos.map(function (t, i) { return (i + 1) + '. ' + t + ((p.proc && p.proc[i] && p.proc[i].ok) ? ' [hecho]' : ' [pendiente]') + ((p.proc && p.proc[i] && p.proc[i].nota) ? ' (' + p.proc[i].nota + ')' : ''); }).join('\n'), s: 'w' }, g.proc + ' de ' + g.total, { v: b.documentos.join('\n'), s: 'w' }, { v: b.instrucciones, s: 'w' }, { v: p.hallazgo || '', s: 'w' }, conclusionSugerida(e, r.id)]);
    });
    hojas.push({ nombre: 'Programa', anchos: [8, 30, 16, 10, 40, 80, 12, 40, 50, 40, 22], filas: pg });
    var aj = [[{ v: 'Ajustes del auditor y salvedades', s: 't' }], [], ['N.º', 'Tipo', 'Fecha', 'Estado', 'Descripción', 'Cuenta', 'Debe', 'Haber'].map(function (x) { return { v: x, s: 'h' }; })];
    e.ajustes.forEach(function (a) { (a.lineas || []).forEach(function (l, i) { aj.push([i === 0 ? a.n : '', i === 0 ? a.tipo : '', i === 0 ? a.fecha : '', i === 0 ? a.estado : '', i === 0 ? { v: a.descripcion, s: 'w' } : '', l.cod, l.debe || 0, l.haber || 0]); }); });
    hojas.push({ nombre: 'Ajustes', anchos: [8, 14, 12, 14, 50, 16, 14, 14], filas: aj });
    hojas.push(hojaTB(e, 'Balanza de comprobación auditada', 'audit'));
    hojas.push(hojaEst(e, 'BG-Auditado', 'Balance general (auditado)', aud.bg));
    hojas.push(hojaEst(e, 'ER-Auditado', 'Estado de resultados (auditado)', aud.er));
    hojas.push(hojaECP(e, 'ECP-Auditado', aud.ecp));
    hojas.push(hojaEst(e, 'FE-Auditado', 'Flujo de efectivo, método indirecto (auditado)', aud.fe));
    var mapa = ajustesAplicados(e.ajustes), pa = porRubro(e.cuentas, mapa, 'audit');
    var dc = [[{ v: 'Dictamen por cuenta', s: 't' }], [], ['Ref.', 'Rubro', 'Libros', 'Ajustes', 'Auditado', 'Conclusión', 'Dictamen'].map(function (x) { return { v: x, s: 'h' }; })];
    rubrosConSaldo(e).forEach(function (r) {
      var sg = SECCIONES[r.sec].estado === 'BG' && SECCIONES[r.sec].lado === 'A' ? 1 : (SECCIONES[r.sec].estado === 'BG' ? -1 : (['ING', 'OIN'].indexOf(r.sec) >= 0 ? -1 : 1));
      var p = r2(sg * prr_(e, r.id)), a = r2(sg * pa.cierre[r.id]), cc = conclusionSugerida(e, r.id);
      dc.push([PROGRAMA[r.id].ref, r.nombre, p, r2(a - p), a, cc, { v: textoCuenta(e, r.id, p, r2(a - p), a, cc), s: 'w' }]);
    });
    hojas.push({ nombre: 'Dictamen-por-cuenta', anchos: [8, 34, 14, 14, 14, 22, 90], filas: dc });
    var nt = [[{ v: 'Notas a los estados financieros', s: 't' }], []];
    notasAuto(e, aud).forEach(function (n) {
      nt.push([{ v: n.t, s: 'b' }]); nt.push([{ v: e.notas[n.k] != null ? e.notas[n.k] : n.txt, s: 'w' }]);
      if (n.tabla) n.tabla.forEach(function (f) { nt.push([f[0], f[1] === null ? null : f[1]]); });
      nt.push([]);
    });
    hojas.push({ nombre: 'Notas', anchos: [110, 18], filas: nt });
    var inf = [[{ v: 'Informe del auditor independiente', s: 't' }], []];
    if (e.dictamen.opinion) textosInforme(e, e.dictamen.opinion).forEach(function (s) { inf.push([{ v: s.h, s: 'b' }]); if (s.p) inf.push([{ v: s.p, s: 'w' }]); inf.push([]); });
    else inf.push(['Pendiente: elija el tipo de opinión en el módulo 8.']);
    inf.push([{ v: 'Certificación', s: 'b' }]); inf.push([{ v: textoCertificacion(e), s: 'w' }]); inf.push([]);
    inf.push([{ v: 'Interpretación final', s: 'b' }]); inf.push([{ v: interpretacionFinal(e), s: 'w' }]);
    hojas.push({ nombre: 'Informe', anchos: [120], filas: inf });
    hojasExtra(e).forEach(function (hh) { hojas.push(hh); });
  }
  return hojas;
}
function prr_(e, id) { return porRubro(e.cuentas, {}, 'prelim').cierre[id]; }

function descargar(nombre, datos, mime) {
  var blob = new Blob([datos], { type: mime });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function nombreArchivo(e, sufijo) {
  var b = (e.encargo.nombre || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return 'Auditoria_' + b + '_' + (e.encargo.anio || '') + '_' + sufijo;
}

/* ---------- Eventos ---------- */
function onClick(ev) {
  var t = ev.target.closest('[data-act]');
  if (!t) return;
  var a = t.dataset.act, e = ESTADO.actual ? emp() : null;
  if (t.tagName === 'INPUT' && t.type === 'file') return;
  if (clickExtra(t, a, e)) return;
  if (a === 'inicio') { ESTADO.paso = 0; guardar(); render(); }
  else if (a === 'abrir') { ESTADO.actual = t.dataset.id; ESTADO.paso = 1; guardar(); render(); window.scrollTo(0, 0); }
  else if (a === 'nueva') { var ne = empresaNueva(''); ESTADO.empresas[ne.id] = ne; ESTADO.actual = ne.id; ESTADO.paso = 1; guardar(); render(); }
  else if (a === 'ejemplo') {
    var ex = empresaNueva('Negocio de ejemplo (ficticio)');
    ex.encargo.propietario = 'Propietario Ejemplo'; ex.encargo.actividad = 'servicios profesionales'; ex.encargo.anio = '2026'; ex.encargo.fechaIni = '2026-01-01'; ex.encargo.fechaCierre = '2026-12-31';
    ex.cuentas = datosEjemplo(); ESTADO.empresas[ex.id] = ex; ESTADO.actual = ex.id; ESTADO.paso = 2; guardar(); render();
  }
  else if (a === 'paso') irPaso(parseInt(t.dataset.n, 10));
  else if (a === 'sig') irPaso(Math.min(12, ESTADO.paso + 1));
  else if (a === 'ant') irPaso(Math.max(1, ESTADO.paso - 1));
  else if (a === 'borrarEmpresa') { if (confirm('¿Eliminar este encargo y todos sus datos? Esta acción no se puede deshacer.')) { delete ESTADO.empresas[ESTADO.actual]; ESTADO.actual = null; ESTADO.paso = 0; guardar(); render(); } }
  else if (a === 'addCuenta') { e.cuentas.push({ cod: '', nombre: '', rubro: '', si: 0, m: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], pa: 0 }); guardar(); refrescar(); }
  else if (a === 'delCuenta') { e.cuentas.splice(parseInt(t.dataset.i, 10), 1); guardar(); refrescar(); }
  else if (a === 'vaciar') { if (confirm('¿Vaciar toda la balanza?')) { e.cuentas = []; guardar(); refrescar(); } }
  else if (a === 'toggleImp') { UI.impOpen = !UI.impOpen; refrescar(); }
  else if (a === 'importar') {
    var r = parseTabla(document.getElementById('txtImp').value);
    if (!r.cuentas.length) { aviso('No se reconocieron cuentas en el texto'); return; }
    e.cuentas = t.dataset.m === 'rep' ? r.cuentas : e.cuentas.concat(r.cuentas);
    UI.impOpen = false; guardar(); refrescar();
    var sin = r.cuentas.filter(function (c) { return !c.rubro; }).length;
    aviso(r.cuentas.length + ' cuentas importadas' + (sin ? '; ' + sin + ' sin rubro, elíjalo en la tabla' : ''));
  }
  else if (a === 'verEst') { UI.modo = t.dataset.modo; UI.tab = 'bg'; irPaso(8); }
  else if (a === 'modoEst') { UI.modo = t.dataset.modo; refrescar(); }
  else if (a === 'tab') { UI.tab = t.dataset.t; refrescar(); }
  else if (a === 'todos') { UI.todos = t.checked; refrescar(); }
  else if (a === 'nuevoAjuste') { nuevoAjusteDraft(); refrescar(); window.scrollTo(0, 0); }
  else if (a === 'propAjuste') {
    nuevoAjusteDraft(); UI.draft.rubro = t.dataset.r;
    UI.draft.descripcion = 'Diferencia de la prueba de ' + RUBRO_POR_ID[t.dataset.r].nombre.toLowerCase() + ': saldo probado contra libros (B/. ' + fmt(parseFloat(t.dataset.v)) + ').';
    ESTADO.paso = 6; guardar(); render(); window.scrollTo(0, 0);
  }
  else if (a === 'editarAjuste') { var f = e.ajustes.filter(function (x) { return x.id === t.dataset.id; })[0]; UI.draft = JSON.parse(JSON.stringify(f)); refrescar(); window.scrollTo(0, 0); }
  else if (a === 'addLinea') { UI.draft.lineas.push({ cod: '', debe: 0, haber: 0 }); refrescar(); }
  else if (a === 'delLinea') { UI.draft.lineas.splice(parseInt(t.dataset.i, 10), 1); refrescar(); }
  else if (a === 'cancelarAjuste') { UI.draft = null; refrescar(); }
  else if (a === 'guardarAjuste') {
    var d = UI.draft; d.lineas = d.lineas.filter(function (l) { return l.cod || l.debe || l.haber; });
    var q = ajusteCuadrado(d);
    if (!q.ok) { aviso('El asiento no cuadra: debe y haber deben ser iguales'); return; }
    if (d.lineas.some(function (l) { return !l.cod; })) { aviso('Toda línea con monto necesita cuenta'); return; }
    delete d.nuevo;
    var idx = -1; e.ajustes.forEach(function (x, i) { if (x.id === d.id) idx = i; });
    if (idx >= 0) e.ajustes[idx] = d; else e.ajustes.push(d);
    UI.draft = null; guardar(); refrescar(); aviso('Ajuste guardado');
  }
  else if (a === 'delAjuste') { if (confirm('¿Eliminar este ajuste?')) { e.ajustes = e.ajustes.filter(function (x) { return x.id !== UI.draft.id; }); UI.draft = null; guardar(); refrescar(); } }
  else if (a === 'imprimir') window.print();
  else if (a === 'xlsx') {
    try {
      var bytes = xlsxCrear(libroExcel(e, t.dataset.m));
      descargar(nombreArchivo(e, t.dataset.m === 'prelim' ? 'Fase1_NoAuditado.xlsx' : 'Libro_Completo.xlsx'), bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      aviso('Archivo generado');
    } catch (err) { aviso('No se pudo generar el Excel: ' + err.message); }
  }
  else if (a === 'respaldo') {
    descargar('Respaldo_Auditoria_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'auditoria-pa', version: 1, exportado: new Date().toISOString(), estado: ESTADO }), 'application/json');
  }
}
function onChange(ev) {
  var t = ev.target;
  if (changeExtra(t)) return;
  if (t.dataset.act === 'subirRespaldo') {
    var f = t.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var o = JSON.parse(rd.result), s = o.estado || o;
        if (!s.empresas) throw new Error('formato');
        var n = 0;
        Object.keys(s.empresas).forEach(function (id) {
          if (ESTADO.empresas[id] && !confirm('El encargo "' + (s.empresas[id].encargo.nombre || id) + '" ya existe. ¿Reemplazarlo con el del respaldo?')) return;
          ESTADO.empresas[id] = s.empresas[id]; n++;
        });
        if (s.auditor && !ESTADO.auditor.nombre) ESTADO.auditor = s.auditor;
        guardar(); render(); aviso(n + ' encargos importados');
      } catch (er) { aviso('El archivo no es un respaldo válido'); }
    };
    rd.readAsText(f); t.value = '';
    return;
  }
  if (t.dataset.act === 'todos') return;
  if (t.dataset.d) { UI.draft[t.dataset.d] = t.value; return; }
  if (t.dataset.dl) {
    var p = t.dataset.dl.split('.'), i = parseInt(p[0], 10);
    UI.draft.lineas[i][p[1]] = p[1] === 'cod' ? t.value : num(t.value);
    var q = ajusteCuadrado(UI.draft), el = document.getElementById('totAj');
    if (el) { el.className = q.ok ? 'okt' : 'mal'; el.textContent = 'Debe ' + fmt(q.debe) + ' · Haber ' + fmt(q.haber) + (q.ok ? ' · cuadra' : ' · no cuadra'); }
    return;
  }
  if (!t.dataset.k) return;
  var v = t.type === 'checkbox' ? t.checked : t.value;
  if (t.dataset.t === 'n') v = (t.value.trim() === '' && /saldoProbado$/.test(t.dataset.k)) ? '' : num(t.value);
  var raiz = t.dataset.r === 'g' ? ESTADO : emp();
  setPath(raiz, t.dataset.k, v);
  guardar();
  if (t.dataset.cel) actualizarTotales();
  else if (!t.dataset.nr) refrescar();
}
function onToggle(ev) {
  var d = ev.target;
  if (d.tagName === 'DETAILS' && d.dataset.rub) UI.abiertos[d.dataset.rub] = d.open;
  else if (d.tagName === 'DETAILS' && d.dataset.alerta) UI.abiertos['A' + d.dataset.alerta] = d.open;
}
function iniciar() {
  var v = document.getElementById('vista');
  document.body.addEventListener('click', onClick);
  document.body.addEventListener('change', onChange);
  v.addEventListener('toggle', onToggle, true);
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () { /* sin sw */ });
}
if (typeof document !== 'undefined' && document.getElementById && document.getElementById('vista')) { iniciar(); }
/* FIN DEL ARCHIVO app.js */
