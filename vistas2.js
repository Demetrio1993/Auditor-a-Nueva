/* vistas2.js - Módulos 4 (diario), 9 (cartas) y 11 (control), validación por módulo y exportación extra */
'use strict';

function hoyIso() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

/* Garantiza que un encargo antiguo tenga los campos nuevos */
function asegurarEmp(e) {
  if (!e.diario) e.diario = {};
  var D = e.diario;
  if (!D.filas) D.filas = [];
  if (D.horaIni == null) D.horaIni = 7;
  if (D.horaFin == null) D.horaFin = 19;
  if (D.diasCierre == null) D.diasCierre = 5;
  if (D.feriados == null) D.feriados = FERIADOS_2026.join(', ');
  if (!D.rev) D.rev = {};
  if (!e.cartas) e.cartas = {};
  if (!e.cartas.txt) e.cartas.txt = {};
  if (!e.cartas.obs) e.cartas.obs = [];
  if (!e.cartas.firmada) e.cartas.firmada = {};
  if (!e.versiones) e.versiones = [];
  if (!e.horas) e.horas = [];
  if (!e.plan) e.plan = {};
  if (!e.encargo.estado) e.encargo.estado = 'Planificación';
}

function totalHoras(e) { return r2((e.horas || []).reduce(function (t, h) { return t + (Number(h.horas) || 0); }, 0)); }

/* ---------- Validación con la numeración nueva de módulos ---------- */
function valApp(e) {
  asegurarEmp(e);
  var v = validaciones(e), n = {};
  n[1] = v[1]; n[2] = v[2];
  n[3] = v[3].concat([{ ok: !!(e.plan.justMat && String(e.plan.justMat).trim()), msg: 'Justificación de la materialidad escrita' }]);
  var an = e.diario.filas.length ? analizarDiario(e) : null;
  n[4] = [{ ok: e.diario.filas.length > 0 || !!e.diario.noAplica, msg: 'Diario cargado o marcado como no disponible' }];
  if (an) { var rs = resumenAlertas(e, an); n[4].push({ ok: rs.pendientes === 0, msg: 'Alertas revisadas' + (rs.pendientes ? ' (' + rs.pendientes + ' pendientes)' : '') }); }
  n[5] = v[4];
  if (e.encargo.itbms === 'Sí') { var pg = progresoRubro(e, 'ITBMS'); n[5] = n[5].concat([{ ok: pg.total > 0 && pg.proc === pg.total, msg: 'Pruebas de ITBMS (IT-1) ejecutadas' }]); }
  n[6] = v[5]; n[7] = v[6]; n[8] = v[7];
  var f = e.cartas.firmada;
  n[9] = [{ ok: !!f.comp, msg: 'Carta de compromiso firmada' }, { ok: !!f.repr, msg: 'Carta de representación firmada' }, { ok: !!f.reco, msg: 'Carta de recomendaciones entregada' }];
  n[10] = v[8];
  n[11] = [{ ok: e.versiones.length > 0, msg: 'Al menos una versión guardada de los papeles' }, { ok: totalHoras(e) > 0, msg: 'Horas del encargo registradas' }];
  n[12] = [];
  return n;
}

/* ---------- Módulo 4: Diario ---------- */
function chipEstado(st) { return '<span class="chip c-' + st.replace(/\s/g, '').toLowerCase() + '">' + esc(st) + '</span>'; }
function htmlAlerta(e, a) {
  var rv = revisionDe(e, a.k), ab = UI.abiertos['A' + a.k] ? ' open' : '';
  return '<details class="rub al" data-alerta="' + esc(a.k) + '"' + ab + '><summary><span class="nv n-' + a.nivel.toLowerCase() + '">' + a.nivel + '</span><span class="nm">' + esc(a.titulo) + '</span>' + chipEstado(rv.estado) + '</summary><div class="cuerpo"><p>' + esc(a.det) + '</p>' + (a.monto ? '<p class="mut">Monto involucrado: B/. ' + fmt(a.monto) + '</p>' : '') +
    '<label class="campo"><span>Revisión</span><select data-rev="' + esc(a.k) + '">' + ['Pendiente', 'Sin problema', 'Hallazgo'].map(function (x) { return '<option' + (rv.estado === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
    '<label class="campo"><span>Nota o referencia del soporte revisado</span><input data-revn="' + esc(a.k) + '" data-nr="1" value="' + esc(rv.nota) + '"></label></div></details>';
}
function vDiario(e, res) {
  var D = e.diario, an = analizarDiario(e), rs = resumenAlertas(e, an), R = an.resumen;
  var h = '<section class="card"><h2>4. Analítica del diario</h2><p class="mut">Cruza los asientos del libro diario para encontrar patrones de riesgo (NIA 240, 330, 500 y 520). Cada alerta es una señal para revisar, no una conclusión: márquela como Sin problema o Hallazgo y anote el soporte que vio.</p>';
  if (R) {
    h += '<table class="kv"><tr><td>Líneas y asientos</td><td class="num">' + R.filas + ' · ' + R.asientos + '</td></tr><tr><td>Fechas</td><td class="num">' + esc(R.desde) + ' a ' + esc(R.hasta) + '</td></tr><tr><td>Total debe / haber</td><td class="num">' + fmt(R.debe) + ' / ' + fmt(R.haber) + '</td></tr><tr><td>Umbral de ejecución usado</td><td class="num">' + fmt(R.umbralEj) + '</td></tr><tr class="gran"><td>Alertas: alto / medio / bajo</td><td class="num">' + rs.porNivel.Alto + ' / ' + rs.porNivel.Medio + ' / ' + rs.porNivel.Bajo + '</td></tr><tr><td>Pendientes · sin problema · hallazgos</td><td class="num">' + rs.pendientes + ' · ' + rs.sinProblema + ' · ' + rs.hallazgos + '</td></tr></table>';
  } else h += '<p class="mut">Todavía no hay asientos cargados.</p>';
  h += '<div class="botones"><button class="btn" data-act="toggleImpDiario">Pegar o cargar asientos</button>' + (D.filas.length ? '<button class="btn sec" data-act="vaciarDiario">Vaciar diario</button>' : '') + '</div>';
  if (UI.impDiario) {
    h += '<div class="imp"><p class="mut">Copie del Excel las columnas del diario y péguelas aquí, con o sin la fila de encabezados. Con encabezados se reconocen: Fecha, Hora, Asiento, Cuenta, Descripción, Debe, Haber, Usuario, Origen, Documento y Tercero. Sin encabezados, el orden es: Fecha, Asiento, Cuenta, Descripción, Debe, Haber, Usuario, Hora, Origen, Documento, Tercero. La cuenta debe ser el mismo código de la balanza.</p>' +
      '<textarea id="txtDiario" rows="6" placeholder="2026-03-05&#9;A0001&#9;1.1.01.001&#9;Cobro&#9;100&#9;&#9;ana"></textarea>' +
      '<div class="botones"><button class="btn" data-act="impDiario" data-m="add">Agregar</button><button class="btn sec" data-act="impDiario" data-m="rep">Reemplazar todo</button></div>' +
      '<label class="campo"><span>O cargue un archivo CSV o de texto</span><input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" data-act="subirDiario"></label></div>';
  }
  h += '<label class="chk"><input type="checkbox" data-k="diario.noAplica"' + (D.noAplica ? ' checked' : '') + '><span>El cliente no tiene diario utilizable. Se documentará el procedimiento alterno en el papel de trabajo.</span></label></section>';
  h += '<section class="card"><h3>Parámetros</h3><div class="tres">' + campo('Hora de inicio', 'diario.horaIni', D.horaIni, { tipo: 'n' }) + campo('Hora de fin', 'diario.horaFin', D.horaFin, { tipo: 'n' }) + campo('Días de cierre', 'diario.diasCierre', D.diasCierre, { tipo: 'n' }) + '</div>' +
    campo('Feriados (fechas AAAA-MM-DD separadas por coma)', 'diario.feriados', D.feriados, { tipo: 'area', filas: 3 }) +
    '<p class="mut">Los feriados de 2026 son los 12 del calendario oficial publicado por La Estrella de Panamá. Si el ejercicio es otro año o el negocio trabaja en días locales especiales, ajústelos. Las horas se leen como 24 horas: 7 y 19 significan de 7:00 a 19:00.</p>' + listaVal(res, 4) + '</section>';
  an.avisos.forEach(function (x) { h += '<section class="card"><p class="mut">⚠ ' + esc(x) + '</p></section>'; });
  PRUEBAS_DIARIO.forEach(function (p) {
    var l = an.alertas.filter(function (a) { return a.p === p.id; }), pr = rs.porPrueba[p.id];
    h += '<section class="card"><h3>' + p.id + ' · ' + esc(p.t) + ' <span class="chip">' + l.length + '</span></h3><p class="mut">' + esc(p.d) + ' (' + p.n + ')</p>';
    if (p.id === 'T8' && an.benford) {
      h += '<p>Clasificación: <b>' + esc(an.benford.clase) + '</b> · desviación media ' + an.benford.mad.toFixed(4) + ' sobre ' + an.benford.n + ' líneas.</p><div class="tabla-scroll"><table class="grid an"><thead><tr><th>Dígito</th><th>Líneas</th><th>Observado</th><th>Esperado</th></tr></thead><tbody>' +
        an.benford.tabla.map(function (r) { return '<tr><td>' + r.d + '</td><td class="num">' + r.n + '</td><td class="num">' + (r.obs * 100).toFixed(1) + ' %</td><td class="num">' + (r.esp * 100).toFixed(1) + ' %</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    if (!R) h += '<p class="mut">Sin datos.</p>';
    else if (!l.length) h += '<p class="okt">Sin alertas.</p>';
    else {
      var ver = UI.verTodas && UI.verTodas[p.id], lim = ver ? l.length : 25;
      l.slice(0, lim).forEach(function (a) { h += htmlAlerta(e, a); });
      if (l.length > 25) h += '<div class="botones"><button class="btn sec" data-act="verTodas" data-p="' + p.id + '">' + (ver ? 'Mostrar menos' : 'Ver las ' + l.length + ' alertas') + '</button></div>';
      if (pr.pend) h += '<div class="botones"><button class="btn sec" data-act="marcarTodas" data-p="' + p.id + '">Marcar ' + pr.pend + ' pendientes como Sin problema</button></div>';
    }
    h += '</section>';
  });
  return h;
}

/* ---------- Módulo 9: Cartas ---------- */
function vCartas(e, res) {
  var id = UI.carta || 'comp', c = CARTAS.filter(function (x) { return x.id === id; })[0];
  var h = '<section class="card noprint"><h2>9. Cartas y comunicaciones</h2><p class="mut">Plantillas para el encargo. ' + esc(AVISO_PLANTILLA) + ' Lo que usted edite se guarda y reemplaza la plantilla; con Restablecer vuelve a generarse con los datos actuales.</p><div class="seg pestanas">' +
    CARTAS.map(function (x) { return '<button class="' + (id === x.id ? 'act' : '') + '" data-act="cartaTab" data-c="' + x.id + '">' + esc(x.t.replace('Carta de ', '')) + '</button>'; }).join('') + '</div>' + listaVal(res, 9) + '</section>';
  if (id === 'reco') {
    h += '<section class="card noprint"><h3>Observaciones de control interno</h3><p class="mut">Cada observación entra a la carta. Puede traer las que salen de las alertas marcadas como Hallazgo y de los ajustes aceptados.</p><div class="botones"><button class="btn" data-act="addObs">+ Observación</button><button class="btn sec" data-act="obsSug">Traer sugeridas</button></div>';
    e.cartas.obs.forEach(function (o, i) {
      h += '<details class="rub" ' + (UI.abiertos['O' + i] ? 'open' : '') + ' data-rub="O' + i + '"><summary><span class="ref">' + (i + 1) + '</span><span class="nm">' + esc(o.area || 'Sin área') + '</span><span class="sal">' + esc(o.riesgo || 'Medio') + '</span></summary><div class="cuerpo">' +
        campo('Área', 'cartas.obs.' + i + '.area', o.area) + campo('Observación', 'cartas.obs.' + i + '.obs', o.obs, { tipo: 'area', filas: 3 }) +
        campo('Riesgo', 'cartas.obs.' + i + '.riesgo', o.riesgo || 'Medio', { tipo: 'sel', op: ['Alto', 'Medio', 'Bajo'], nr: true }) +
        campo('Recomendación', 'cartas.obs.' + i + '.rec', o.rec, { tipo: 'area', filas: 3 }) + campo('Respuesta del propietario (opcional)', 'cartas.obs.' + i + '.resp', o.resp, { tipo: 'area', filas: 2 }) +
        '<button class="btn peligro" data-act="delObs" data-i="' + i + '">Eliminar</button></div></details>';
    });
    h += '</section>';
  }
  var txt = textoCarta(e, id), filas = Math.min(70, Math.max(10, txt.split('\n').length + 2));
  h += '<section class="card carta"><h3 class="noprint">' + esc(c.t) + ' (' + c.n + ')</h3><textarea rows="' + filas + '" data-cartatxt="' + id + '" data-nr="1">' + esc(txt) + '</textarea>' +
    '<div class="botones noprint"><button class="btn sec" data-act="imprimir">Imprimir o guardar PDF</button><button class="btn sec" data-act="resetCarta" data-c="' + id + '">Restablecer plantilla</button></div>' +
    '<label class="chk noprint"><input type="checkbox" data-k="cartas.firmada.' + id + '"' + (e.cartas.firmada[id] ? ' checked' : '') + '><span>' + (id === 'reco' ? 'Entregada al propietario' : 'Firmada y archivada') + '</span></label></section>';
  return h;
}

/* ---------- Módulo 11: Control del encargo ---------- */
function instantanea(e) { var o = {}; Object.keys(e).forEach(function (k) { if (k !== 'versiones' && k !== 'horas') o[k] = e[k]; }); return JSON.stringify(o); }
function resumenVersion(datos) {
  var s = JSON.parse(datos), est = estados(s.cuentas || [], s.ajustes || [], 'audit');
  var aj = s.ajustes || [], rev = (s.diario && s.diario.rev) || {};
  return { ni: est.n.ni, activos: est.n.activos, pasivos: est.n.pasivos, patrimonio: est.n.patrimonio, ajustes: aj.length, aceptados: aj.filter(function (a) { return a.estado === 'Aceptado'; }).length, cuentas: (s.cuentas || []).length, filas: ((s.diario && s.diario.filas) || []).length, hallazgos: Object.keys(rev).filter(function (k) { return rev[k].estado === 'Hallazgo'; }).length, opinion: (s.dictamen && s.dictamen.opinion) || '' };
}
function kbUsados() { try { return Math.round((localStorage.getItem(CLAVE) || '').length / 1024); } catch (x) { return 0; } }
function vControl(e, res) {
  var h = '<section class="card"><h2>11. Control del encargo</h2><p class="mut">Versiones de los papeles de trabajo y registro de horas. Guarde una versión antes de enviar un borrador al cliente y otra al emitir el informe.</p>' + listaVal(res, 11) + '</section>';
  h += '<section class="card"><h3>Versiones de los papeles</h3><label class="campo"><span>Etiqueta</span><input id="verEtq" placeholder="Ej.: Borrador enviado al cliente"></label><div class="botones"><button class="btn" data-act="guardarVersion">Guardar versión</button></div>' +
    '<p class="mut">Datos guardados en este teléfono: ' + kbUsados() + ' KB de unos 5,000 KB que permite el navegador. Se conservan hasta 6 versiones; descargue un respaldo si se acerca al límite.</p>';
  if (!e.versiones.length) h += '<p class="mut">Todavía no hay versiones.</p>';
  e.versiones.forEach(function (v) {
    var r = resumenVersion(v.datos);
    h += '<div class="vers"><b>' + esc(v.etq) + '</b><small>' + esc(v.fecha) + ' · utilidad auditada ' + fmt(r.ni) + ' · ' + r.ajustes + ' ajustes (' + r.aceptados + ' aceptados) · ' + r.filas + ' líneas de diario</small><div class="botones"><button class="btn sec" data-act="compV" data-id="' + v.id + '">' + (UI.compV === v.id ? 'Ocultar comparación' : 'Comparar con hoy') + '</button><button class="btn sec" data-act="restaurarV" data-id="' + v.id + '">Restaurar</button><button class="btn peligro" data-act="delV" data-id="' + v.id + '">Eliminar</button></div>';
    if (UI.compV === v.id) {
      var s = JSON.parse(v.datos), est = estados(e.cuentas, e.ajustes, 'audit'), hoyAj = e.ajustes, hoyRev = e.diario.rev, ha = Object.keys(hoyRev).filter(function (k) { return hoyRev[k].estado === 'Hallazgo'; }).length;
      var fila = function (t, a, b, esMon) { return '<tr><td>' + t + '</td><td class="num">' + (esMon ? fmt(a) : a) + '</td><td class="num">' + (esMon ? fmt(b) : b) + '</td><td class="num">' + (esMon ? fmt(b - a) : (b - a)) + '</td></tr>'; };
      h += '<div class="tabla-scroll"><table class="grid an"><thead><tr><th>Concepto</th><th>Versión</th><th>Hoy</th><th>Cambio</th></tr></thead><tbody>' + fila('Utilidad neta auditada', r.ni, est.n.ni, 1) + fila('Activos', r.activos, est.n.activos, 1) + fila('Pasivos', r.pasivos, est.n.pasivos, 1) + fila('Patrimonio', r.patrimonio, est.n.patrimonio, 1) + fila('Ajustes', r.ajustes, hoyAj.length) + fila('Ajustes aceptados', r.aceptados, hoyAj.filter(function (a) { return a.estado === 'Aceptado'; }).length) + fila('Cuentas en la balanza', r.cuentas, e.cuentas.length) + fila('Líneas del diario', r.filas, e.diario.filas.length) + fila('Hallazgos del diario', r.hallazgos, ha) + '</tbody></table></div>';
      var antes = {}; (s.ajustes || []).forEach(function (a) { antes[a.n + '|' + a.estado] = a; });
      var nuevos = hoyAj.filter(function (a) { return !antes[a.n + '|' + a.estado]; });
      if (nuevos.length) h += '<p class="mut">Ajustes nuevos o con decisión distinta: ' + nuevos.map(function (a) { return esc(a.n + ' (' + a.estado + ')'); }).join(', ') + '.</p>';
    }
    h += '</div>';
  });
  h += '</section>';
  /* Horas */
  var tot = totalHoras(e), pres = Number(e.encargo.horasPres) || 0, porFase = {};
  e.horas.forEach(function (x) { porFase[x.fase] = r2((porFase[x.fase] || 0) + (Number(x.horas) || 0)); });
  h += '<section class="card"><h3>Registro de horas</h3><div class="dos"><label class="campo"><span>Fecha</span><input type="date" id="hFecha" value="' + hoyIso() + '"></label><label class="campo"><span>Horas</span><input id="hHoras" inputmode="decimal" placeholder="0.0"></label></div>' +
    '<label class="campo"><span>Fase</span><select id="hFase">' + PASOS.map(function (p) { return '<option>' + esc(p.n + '. ' + p.t) + '</option>'; }).join('') + '<option>Otro</option></select></label>' +
    '<label class="campo"><span>Tarea</span><input id="hTarea" placeholder="Ej.: Confirmación bancaria"></label><label class="campo"><span>Persona</span><input id="hQuien" value="' + esc(ESTADO.auditor.nombre || '') + '"></label><div class="botones"><button class="btn" data-act="addHora">Registrar</button></div>' +
    '<table class="kv"><tr><td>Horas registradas</td><td class="num">' + fmt(tot) + '</td></tr><tr><td>Horas presupuestadas</td><td class="num">' + (pres ? fmt(pres) : 'sin definir') + '</td></tr>' + (pres ? '<tr class="gran"><td>Avance contra el presupuesto</td><td class="num">' + pct(tot / pres * 100) + '</td></tr>' : '') + '</table>';
  Object.keys(porFase).forEach(function (f) { h += '<p class="mut">' + esc(f) + ': ' + fmt(porFase[f]) + ' h</p>'; });
  if (e.horas.length) {
    h += '<div class="tabla-scroll"><table class="grid an"><thead><tr><th>Fecha</th><th>Fase</th><th>Tarea</th><th>Persona</th><th>Horas</th><th></th></tr></thead><tbody>' + e.horas.slice().reverse().map(function (x) { return '<tr><td>' + esc(x.fecha) + '</td><td>' + esc(x.fase) + '</td><td>' + esc(x.tarea) + '</td><td>' + esc(x.quien) + '</td><td class="num">' + fmt(x.horas) + '</td><td><button class="x" data-act="delHora" data-id="' + x.id + '" aria-label="Quitar">✕</button></td></tr>'; }).join('') + '</tbody></table></div>';
  }
  return h + '</section>';
}

/* ---------- Eventos de los módulos nuevos ---------- */
function clickExtra(t, a, e) {
  if (!e) return false;
  if (a === 'toggleImpDiario') { UI.impDiario = !UI.impDiario; refrescar(); return true; }
  if (a === 'impDiario') {
    var r = parseDiario(document.getElementById('txtDiario').value);
    if (!r.filas.length) { aviso('No se reconocieron asientos en el texto'); return true; }
    e.diario.filas = t.dataset.m === 'rep' ? r.filas : e.diario.filas.concat(r.filas);
    UI.impDiario = false; if (guardar()) { refrescar(); aviso(r.filas.length + ' líneas importadas' + (r.saltadas ? '; ' + r.saltadas + ' filas omitidas' : '')); }
    return true;
  }
  if (a === 'vaciarDiario') { if (confirm('¿Vaciar el diario y las revisiones de alertas?')) { e.diario.filas = []; e.diario.rev = {}; guardar(); refrescar(); } return true; }
  if (a === 'verTodas') { UI.verTodas = UI.verTodas || {}; UI.verTodas[t.dataset.p] = !UI.verTodas[t.dataset.p]; refrescar(); return true; }
  if (a === 'marcarTodas') {
    analizarDiario(e).alertas.forEach(function (al) { if (al.p === t.dataset.p && revisionDe(e, al.k).estado === 'Pendiente') { e.diario.rev[al.k] = { estado: 'Sin problema', nota: '' }; } });
    guardar(); refrescar(); return true;
  }
  if (a === 'cartaTab') { UI.carta = t.dataset.c; refrescar(); window.scrollTo(0, 0); return true; }
  if (a === 'addObs') { e.cartas.obs.push({ area: '', obs: '', riesgo: 'Medio', rec: '', resp: '' }); delete e.cartas.txt.reco; guardar(); refrescar(); return true; }
  if (a === 'delObs') { e.cartas.obs.splice(parseInt(t.dataset.i, 10), 1); delete e.cartas.txt.reco; guardar(); refrescar(); return true; }
  if (a === 'obsSug') { var s = observacionesSugeridas(e); if (!s.length) { aviso('No hay hallazgos ni ajustes aceptados para sugerir'); return true; } e.cartas.obs = e.cartas.obs.concat(s); delete e.cartas.txt.reco; guardar(); refrescar(); aviso(s.length + ' observaciones agregadas'); return true; }
  if (a === 'resetCarta') { delete e.cartas.txt[t.dataset.c]; guardar(); refrescar(); return true; }
  if (a === 'guardarVersion') {
    var et = document.getElementById('verEtq').value.trim() || 'Versión ' + (e.versiones.length + 1);
    var nv = { id: 'v' + Date.now().toString(36), fecha: new Date().toLocaleString('es-PA'), etq: et, datos: instantanea(e) };
    e.versiones.push(nv);
    var borradas = [];
    while (e.versiones.length > 6) borradas.push(e.versiones.shift());
    if (!guardar()) { e.versiones.pop(); borradas.reverse().forEach(function (b) { e.versiones.unshift(b); }); aviso('No cabe: elimine versiones o descargue un respaldo'); return true; }
    refrescar(); aviso('Versión guardada' + (borradas.length ? '; se eliminó la más antigua' : '')); return true;
  }
  if (a === 'compV') { UI.compV = UI.compV === t.dataset.id ? null : t.dataset.id; refrescar(); return true; }
  if (a === 'delV') { if (confirm('¿Eliminar esta versión?')) { e.versiones = e.versiones.filter(function (v) { return v.id !== t.dataset.id; }); guardar(); refrescar(); } return true; }
  if (a === 'restaurarV') {
    var v = e.versiones.filter(function (x) { return x.id === t.dataset.id; })[0];
    if (!v || !confirm('¿Restaurar la versión "' + v.etq + '"? Se guardará antes una copia del estado actual.')) return true;
    e.versiones.push({ id: 'v' + Date.now().toString(36), fecha: new Date().toLocaleString('es-PA'), etq: 'Antes de restaurar "' + v.etq + '"', datos: instantanea(e) });
    while (e.versiones.length > 6) { var k = e.versiones.findIndex(function (x) { return x.id !== v.id; }); e.versiones.splice(k, 1); }
    var snap = JSON.parse(v.datos); Object.keys(snap).forEach(function (kk) { e[kk] = snap[kk]; });
    asegurarEmp(e); guardar(); refrescar(); aviso('Versión restaurada'); return true;
  }
  if (a === 'addHora') {
    var hrs = num(document.getElementById('hHoras').value);
    if (!(hrs > 0)) { aviso('Escriba las horas'); return true; }
    e.horas.push({ id: 'h' + Date.now().toString(36), fecha: document.getElementById('hFecha').value, fase: document.getElementById('hFase').value, tarea: document.getElementById('hTarea').value.trim(), quien: document.getElementById('hQuien').value.trim(), horas: hrs });
    guardar(); refrescar(); return true;
  }
  if (a === 'delHora') { e.horas = e.horas.filter(function (x) { return x.id !== t.dataset.id; }); guardar(); refrescar(); return true; }
  return false;
}
function changeExtra(t) {
  var e = ESTADO.actual ? emp() : null;
  if (!e) return false;
  if (t.dataset.act === 'subirDiario') {
    var f = t.files[0]; if (!f) return true;
    var rd = new FileReader();
    rd.onload = function () {
      var r = parseDiario(String(rd.result));
      if (!r.filas.length) { aviso('No se reconocieron asientos en el archivo'); return; }
      e.diario.filas = e.diario.filas.concat(r.filas); UI.impDiario = false;
      if (guardar()) { refrescar(); aviso(r.filas.length + ' líneas importadas'); }
    };
    rd.readAsText(f); t.value = ''; return true;
  }
  if (t.dataset.rev) { e.diario.rev[t.dataset.rev] = { estado: t.value, nota: (e.diario.rev[t.dataset.rev] || {}).nota || '' }; guardar(); refrescar(); return true; }
  if (t.dataset.revn) { var cur = e.diario.rev[t.dataset.revn] || { estado: 'Pendiente' }; cur.nota = t.value; e.diario.rev[t.dataset.revn] = cur; guardar(); return true; }
  if (t.dataset.cartatxt) { e.cartas.txt[t.dataset.cartatxt] = t.value; guardar(); return true; }
  if (t.dataset.k && /^cartas\.obs\./.test(t.dataset.k)) { setPath(e, t.dataset.k, t.value); delete e.cartas.txt.reco; guardar(); return true; }
  return false;
}

/* ---------- Hojas extra del libro de Excel ---------- */
function hojasExtra(e) {
  var out = [], an = analizarDiario(e);
  var H = function (a) { return a.map(function (x) { return { v: x, s: 'h' }; }); };
  var al = [[{ v: 'Analítica del diario: alertas y revisión', s: 't' }], []];
  if (an.resumen) { al.push(['Líneas', an.resumen.filas]); al.push(['Asientos', an.resumen.asientos]); al.push(['Período del diario', an.resumen.desde + ' a ' + an.resumen.hasta]); al.push([]); }
  an.avisos.forEach(function (x) { al.push([{ v: 'Aviso: ' + x, s: 'w' }]); });
  al.push(H(['Prueba', 'Nivel', 'Alerta', 'Detalle', 'Monto', 'Revisión', 'Nota']));
  an.alertas.forEach(function (a) { var r = revisionDe(e, a.k); al.push([a.p, a.nivel, { v: a.titulo, s: 'w' }, { v: a.det, s: 'w' }, a.monto, r.estado, { v: r.nota, s: 'w' }]); });
  out.push({ nombre: 'Diario-Alertas', anchos: [8, 10, 40, 70, 14, 14, 36], filas: al });
  var ct = [[{ v: 'Cartas del encargo', s: 't' }], [{ v: AVISO_PLANTILLA, s: 'w' }], []];
  CARTAS.forEach(function (c) { ct.push([{ v: c.t + ' (' + c.n + ')', s: 'b' }]); textoCarta(e, c.id).split(/\n\n+/).forEach(function (p) { ct.push([{ v: p, s: 'w' }]); }); ct.push([]); });
  out.push({ nombre: 'Cartas', anchos: [120], filas: ct });
  var hr = [[{ v: 'Registro de horas', s: 't' }], [], H(['Fecha', 'Fase', 'Tarea', 'Persona', 'Horas'])];
  e.horas.forEach(function (x) { hr.push([x.fecha, x.fase, x.tarea, x.quien, x.horas]); });
  hr.push([{ v: 'Total', s: 'b' }, null, null, null, { v: totalHoras(e), f: 'SUM(E4:E' + (3 + e.horas.length) + ')', s: 'bn' }]);
  out.push({ nombre: 'Horas', anchos: [12, 28, 40, 24, 10], filas: hr });
  var vr = [[{ v: 'Versiones de los papeles de trabajo', s: 't' }], [], H(['Fecha', 'Etiqueta', 'Utilidad auditada', 'Ajustes', 'Aceptados', 'Líneas de diario'])];
  e.versiones.forEach(function (v) { var r = resumenVersion(v.datos); vr.push([v.fecha, v.etq, r.ni, r.ajustes, r.aceptados, r.filas]); });
  out.push({ nombre: 'Versiones', anchos: [22, 40, 18, 10, 10, 16], filas: vr });
  return out;
}
/* FIN DEL ARCHIVO vistas2.js */
