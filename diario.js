/* diario.js - Bloque 2: analítica de datos del diario (importación y pruebas de alertas) */
'use strict';

/* Feriados nacionales 2026 según el calendario oficial publicado por La Estrella de Panamá (12 días).
   Editable por encargo: confirmar contra la Gaceta Oficial si el ejercicio es otro. */
var FERIADOS_2026 = ['2026-01-01', '2026-01-09', '2026-02-17', '2026-04-03', '2026-05-01', '2026-11-03', '2026-11-05', '2026-11-10', '2026-11-28', '2026-12-08', '2026-12-20', '2026-12-25'];

var PRUEBAS_DIARIO = [
  { id: 'T1', t: 'Asientos manuales fuera de horario', n: 'NIA 240', d: 'Asientos manuales registrados antes o después del horario laboral indicado. Requiere la columna Hora.' },
  { id: 'T2', t: 'Asientos en fines de semana y feriados', n: 'NIA 240', d: 'Asientos manuales con fecha en sábado, domingo o feriado nacional.' },
  { id: 'T3', t: 'Ajustes significativos cerca del cierre', n: 'NIA 240 y 330', d: 'Asientos grandes en los últimos días del ejercicio, sobre todo los que dicen ajuste, reclasificación, provisión o estimación.' },
  { id: 'T4', t: 'Facturas de proveedores duplicadas', n: 'NIA 330', d: 'Mismo proveedor y mismo número de documento en más de un asiento, mismo número con distinto proveedor, o mismo proveedor, monto y fecha con documentos distintos.' },
  { id: 'T5', t: 'Secuencia de facturación de ventas', n: 'NIA 330', d: 'Números de factura de ingresos faltantes dentro de una serie o repetidos en más de un asiento.' },
  { id: 'T6', t: 'Montos redondeados en gastos', n: 'NIA 240', d: 'Gastos con montos terminados en centenas exactas, por cuenta y por partida individual.' },
  { id: 'T7', t: 'Montos idénticos repetidos en gastos', n: 'NIA 240', d: 'La misma cuenta con el mismo monto en tres o más asientos distintos.' },
  { id: 'T8', t: 'Primer dígito de los gastos (Benford)', n: 'NIA 520', d: 'Compara la frecuencia del primer dígito de los gastos con la distribución esperada. Necesita al menos 50 líneas.' },
  { id: 'T9', t: 'Integridad de los asientos', n: 'NIA 500', d: 'Asientos descuadrados, sin fecha o fuera del período, con cuentas que no están en la balanza o sin descripción.' },
  { id: 'T10', t: 'Diario contra balanza', n: 'NIA 500', d: 'El movimiento de cada cuenta en el diario debe coincidir con el de la balanza preliminar (acumulado menos saldo inicial).' }
];

/* ---------- Lectura de fechas, horas y tablas ---------- */
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fechaValida(y, m, d) { return y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31; }
function parseFechaHora(v) {
  var s = String(v == null ? '' : v).trim();
  if (!s) return { f: '', h: '' };
  var m;
  if (/^\d+(\.\d+)?$/.test(s) && parseFloat(s) > 20000 && parseFloat(s) < 80000) {
    var ser = parseFloat(s), dias = Math.floor(ser), frac = ser - dias;
    var dt = new Date(Date.UTC(1899, 11, 30) + dias * 86400000);
    var min = Math.round(frac * 1440);
    return { f: dt.getUTCFullYear() + '-' + pad2(dt.getUTCMonth() + 1) + '-' + pad2(dt.getUTCDate()), h: frac > 0.0001 ? pad2(Math.floor(min / 60) % 24) + ':' + pad2(min % 60) : '' };
  }
  var hora = '';
  var mh = s.match(/[ T](\d{1,2}):(\d{2})(?::\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?$/i);
  if (mh) {
    var hh = parseInt(mh[1], 10);
    if (mh[3]) { var pm = /p/i.test(mh[3]); if (pm && hh < 12) hh += 12; if (!pm && hh === 12) hh = 0; }
    hora = pad2(hh) + ':' + mh[2];
    s = s.slice(0, mh.index).trim();
  }
  if ((m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/))) { if (fechaValida(+m[1], +m[2], +m[3])) return { f: m[1] + '-' + pad2(+m[2]) + '-' + pad2(+m[3]), h: hora }; }
  if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/))) {
    var y = +m[3]; if (y < 100) y += 2000;
    if (fechaValida(y, +m[2], +m[1])) return { f: y + '-' + pad2(+m[2]) + '-' + pad2(+m[1]), h: hora };
  }
  return { f: '', h: hora };
}
function parseHora(v) {
  var s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (/^0?\.\d+$|^0$|^1$/.test(s) && parseFloat(s) < 1) { var min = Math.round(parseFloat(s) * 1440); return pad2(Math.floor(min / 60) % 24) + ':' + pad2(min % 60); }
  var r = parseFechaHora('2000-01-01 ' + s);
  return r.h;
}
function diaSemana(iso) { return new Date(iso + 'T12:00:00Z').getUTCDay(); }
function minutos(hhmm) { var p = String(hhmm).split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
function normTxt(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

var COLS_DIARIO = [
  ['f', ['fecha', 'date']], ['hr', ['hora', 'time']], ['as', ['asiento', 'comprobante', 'poliza', 'numero de asiento', 'no asiento', 'n asiento']],
  ['cod', ['codigo de cuenta', 'cuenta', 'codigo', 'cod']], ['ds', ['descripcion', 'concepto', 'detalle', 'glosa', 'referencia']],
  ['de', ['debe', 'debito', 'debitos']], ['ha', ['haber', 'credito', 'creditos']], ['us', ['usuario', 'registrado por', 'creado por', 'user']],
  ['or', ['origen', 'fuente', 'modulo', 'tipo de asiento', 'source']], ['dc', ['documento', 'factura', 'n factura', 'no factura', 'num documento', 'numero de documento', 'doc']],
  ['te', ['tercero', 'proveedor', 'cliente', 'beneficiario', 'nombre del tercero']]
];
var ORDEN_FIJO = ['f', 'as', 'cod', 'ds', 'de', 'ha', 'us', 'hr', 'or', 'dc', 'te'];

function parseDiario(texto) {
  var lineas = String(texto || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
  if (!lineas.length) return { filas: [], saltadas: 0, mapa: [] };
  var sep = lineas[0].indexOf('\t') >= 0 ? '\t' : (lineas[0].split(';').length > lineas[0].split(',').length ? ';' : ',');
  var cel = lineas.map(function (l) { return l.split(sep).map(function (x) { return x.trim().replace(/^"|"$/g, ''); }); });
  /* Encabezado: se reconoce si la primera fila trae nombres de columnas conocidos */
  var mapa = [], usado = {}, reconocidas = 0;
  cel[0].forEach(function (h, i) {
    var n = normTxt(h), hallada = '';
    for (var k = 0; k < COLS_DIARIO.length && !hallada; k++) {
      if (usado[COLS_DIARIO[k][0]]) continue;
      var sin = COLS_DIARIO[k][1];
      for (var j = 0; j < sin.length; j++) { if (n === sin[j]) { hallada = COLS_DIARIO[k][0]; break; } }
    }
    if (!hallada && n) {
      for (var k2 = 0; k2 < COLS_DIARIO.length && !hallada; k2++) {
        if (usado[COLS_DIARIO[k2][0]]) continue;
        var sin2 = COLS_DIARIO[k2][1];
        for (var j2 = 0; j2 < sin2.length; j2++) { if (n.indexOf(sin2[j2]) === 0) { hallada = COLS_DIARIO[k2][0]; break; } }
      }
    }
    mapa[i] = hallada;
    if (hallada) { usado[hallada] = 1; reconocidas++; }
  });
  var conEncabezado = reconocidas >= 3;
  if (!conEncabezado) mapa = ORDEN_FIJO.slice(0, cel[0].length);
  var filas = [], saltadas = 0;
  cel.forEach(function (c, idx) {
    if (conEncabezado && idx === 0) return;
    var o = {};
    c.forEach(function (v, i) { if (mapa[i]) o[mapa[i]] = v; });
    var fh = parseFechaHora(o.f), hr = o.hr ? parseHora(o.hr) : '';
    var de = num(o.de), ha = num(o.ha);
    if (!o.cod || (!de && !ha)) { saltadas++; return; }
    filas.push({ f: fh.f, hr: hr || fh.h, as: String(o.as || '').trim(), cod: o.cod, ds: o.ds || '', de: r2(de), ha: r2(ha), us: o.us || '', or: o.or || '', dc: String(o.dc || '').trim(), te: o.te || '' });
  });
  return { filas: filas, saltadas: saltadas, mapa: mapa, conEncabezado: conEncabezado };
}

/* ---------- Análisis ---------- */
var RUBROS_GASTO = ['GOP', 'COS', 'GFI']; /* la depreciación se excluye: sus cifras redondas son normales */
var RUBROS_COMPRA = ['GOP', 'COS', 'GFI', 'PPE', 'INV', 'INT', 'ANT', 'OANC'];
var BENFORD = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

function listaFeriados(D) {
  var t = D && D.feriados != null ? D.feriados : FERIADOS_2026.join(', ');
  var out = {};
  String(t).split(/[\s,;]+/).forEach(function (x) { var r = parseFechaHora(x); if (r.f) out[r.f] = 1; });
  return out;
}
function rangos(nums) {
  var out = [], ini = null, prev = null;
  nums.forEach(function (n) {
    if (ini === null) { ini = prev = n; return; }
    if (n === prev + 1) { prev = n; return; }
    out.push(ini === prev ? String(ini) : ini + '-' + prev); ini = prev = n;
  });
  if (ini !== null) out.push(ini === prev ? String(ini) : ini + '-' + prev);
  return out;
}

function analizarDiario(e) {
  var D = e.diario || {}, filas = D.filas || [];
  var res = { alertas: [], avisos: [], resumen: null, benford: null };
  if (!filas.length) return res;
  var cfg = {
    horaIni: D.horaIni == null || D.horaIni === '' ? 7 : Number(D.horaIni),
    horaFin: D.horaFin == null || D.horaFin === '' ? 19 : Number(D.horaFin),
    diasCierre: D.diasCierre == null || D.diasCierre === '' ? 5 : Number(D.diasCierre)
  };
  var mat = materialidad(e, estados(e.cuentas, [], 'prelim'));
  var uEj = mat.ejec > 0 ? mat.ejec : 1000, uTr = mat.triv > 0 ? mat.triv : 50, uMat = mat.mat > 0 ? mat.mat : 2000;
  var cuentaPor = {};
  (e.cuentas || []).forEach(function (c) { cuentaPor[c.cod] = c; });
  var rubroDe = function (cod) { return cuentaPor[cod] ? cuentaPor[cod].rubro : ''; };
  var feriados = listaFeriados(D);
  var cierre = e.encargo.fechaCierre, ini = e.encargo.fechaIni;
  var esManual = function (f) { return !/autom|sistema|interfaz|import/i.test(f.or || ''); };
  var A = function (prueba, nivel, id, titulo, det, monto) { res.alertas.push({ k: prueba + '|' + id, p: prueba, nivel: nivel, titulo: titulo, det: det, monto: monto ? r2(monto) : 0 }); };

  /* Agrupar por asiento */
  var asientos = {}, orden = [];
  filas.forEach(function (f, i) {
    var id = f.as || ('S/N ' + (f.f || 'sin fecha') + ' ' + (f.ds || '').slice(0, 20));
    if (!asientos[id]) { asientos[id] = { id: id, f: f.f, hr: f.hr, us: f.us, ds: f.ds, filas: [], de: 0, ha: 0, manual: false }; orden.push(id); }
    var a = asientos[id];
    a.filas.push(f); a.de = r2(a.de + f.de); a.ha = r2(a.ha + f.ha);
    if (!a.f && f.f) a.f = f.f;
    if (!a.hr && f.hr) a.hr = f.hr;
    if (!a.us && f.us) a.us = f.us;
    if (!a.ds && f.ds) a.ds = f.ds;
    if (esManual(f)) a.manual = true;
  });
  var lista = orden.map(function (id) { var a = asientos[id]; a.monto = Math.max(a.de, a.ha); return a; });
  var fechas = lista.map(function (a) { return a.f; }).filter(Boolean).sort();
  res.resumen = { filas: filas.length, asientos: lista.length, desde: fechas[0] || '', hasta: fechas[fechas.length - 1] || '', debe: r2(filas.reduce(function (t, f) { return t + f.de; }, 0)), haber: r2(filas.reduce(function (t, f) { return t + f.ha; }, 0)), umbralEj: uEj, umbralTriv: uTr, umbralMat: uMat };
  var desc = function (a) { return 'Asiento ' + a.id + (a.f ? ' del ' + a.f : '') + (a.hr ? ' a las ' + a.hr : '') + (a.us ? ', usuario ' + a.us : '') + ': B/. ' + fmt(a.monto) + (a.ds ? '. ' + a.ds : '') + '.'; };

  /* T1 y T2 */
  var hayHora = lista.some(function (a) { return a.hr; });
  var hayOrigen = filas.some(function (f) { return f.or; });
  if (!hayOrigen) res.avisos.push('El diario no trae la columna Origen; se tratan todos los asientos como manuales.');
  if (!hayHora) res.avisos.push('El diario no trae la columna Hora: la prueba de horario (T1) no se pudo aplicar.');
  lista.forEach(function (a) {
    if (!a.manual) return;
    if (a.hr) {
      var m = minutos(a.hr);
      if (m < cfg.horaIni * 60 || m >= cfg.horaFin * 60) A('T1', a.monto >= uEj ? 'Alto' : 'Medio', a.id, 'Asiento ' + a.id + ' a las ' + a.hr, desc(a) + ' Horario laboral definido: ' + cfg.horaIni + ':00 a ' + cfg.horaFin + ':00.', a.monto);
    }
    if (a.f) {
      var dw = diaSemana(a.f), fer = feriados[a.f];
      if (dw === 0 || dw === 6 || fer) A('T2', a.monto >= uEj ? 'Alto' : 'Medio', a.id, 'Asiento ' + a.id + ' en ' + (fer ? 'feriado' : dw === 0 ? 'domingo' : 'sábado'), desc(a), a.monto);
    }
  });

  /* T3: ajustes grandes cerca del cierre */
  if (cierre) {
    var limite = new Date(cierre + 'T12:00:00Z'); limite.setUTCDate(limite.getUTCDate() - cfg.diasCierre + 1);
    var desdeIso = limite.getUTCFullYear() + '-' + pad2(limite.getUTCMonth() + 1) + '-' + pad2(limite.getUTCDate());
    lista.forEach(function (a) {
      if (!a.f || a.f < desdeIso || a.f > cierre || a.monto < uEj) return;
      var esAj = /ajust|reclas|provis|estimac|correcc|regulariz/i.test(a.ds || '');
      var nivel = (a.manual && a.monto >= uMat) || (esAj && a.monto >= uEj) ? 'Alto' : 'Medio';
      A('T3', nivel, a.id, 'Asiento ' + a.id + ' dentro de los últimos ' + cfg.diasCierre + ' días', desc(a) + (esAj ? ' La descripción indica ajuste o estimación.' : ''), a.monto);
    });
  } else res.avisos.push('Falta la fecha de cierre en el encargo: la prueba de cierre (T3) no se pudo aplicar.');

  /* T4: duplicados de proveedores */
  var porDoc = {}, porDocSolo = {}, porMonto = {};
  filas.forEach(function (f) {
    if (!f.dc || !(f.de > 0) || RUBROS_COMPRA.indexOf(rubroDe(f.cod)) < 0) return;
    var as = f.as || ('S/N ' + f.f), ter = normTxt(f.te), doc = normTxt(f.dc);
    var k1 = ter + '|' + doc; (porDoc[k1] = porDoc[k1] || { ter: f.te, dc: f.dc, as: {}, monto: 0 }); porDoc[k1].as[as] = 1; porDoc[k1].monto = Math.max(porDoc[k1].monto, f.de);
    (porDocSolo[doc] = porDocSolo[doc] || { dc: f.dc, ter: {}, as: {} }); porDocSolo[doc].ter[ter || '(sin proveedor)'] = f.te || '(sin proveedor)'; porDocSolo[doc].as[as] = 1;
    var k3 = ter + '|' + f.de + '|' + f.f; (porMonto[k3] = porMonto[k3] || { ter: f.te, monto: f.de, f: f.f, docs: {}, as: {} }); porMonto[k3].docs[doc] = f.dc; porMonto[k3].as[as] = 1;
  });
  Object.keys(porDoc).forEach(function (k) {
    var d = porDoc[k], as = Object.keys(d.as);
    if (as.length >= 2) A('T4', 'Alto', 'dup|' + k, 'Documento ' + d.dc + (d.ter ? ' de ' + d.ter : '') + ' en ' + as.length + ' asientos', 'El mismo proveedor y número de documento aparece en los asientos ' + as.join(', ') + '. Monto mayor: B/. ' + fmt(d.monto) + '. Verifique si se registró y se pagó dos veces.', d.monto * (as.length - 1));
  });
  Object.keys(porDocSolo).forEach(function (k) {
    var d = porDocSolo[k], ters = Object.keys(d.ter);
    if (ters.length >= 2 && Object.keys(d.as).length >= 2) A('T4', 'Medio', 'num|' + k, 'Documento ' + d.dc + ' con ' + ters.length + ' proveedores distintos', 'Proveedores: ' + ters.map(function (t) { return d.ter[t]; }).join('; ') + '. Puede ser coincidencia de numeración o un documento reutilizado.', 0);
  });
  Object.keys(porMonto).forEach(function (k) {
    var d = porMonto[k], docs = Object.keys(d.docs);
    if (docs.length >= 2 && Object.keys(d.as).length >= 2) A('T4', 'Medio', 'mon|' + k, 'Mismo proveedor, monto y fecha con ' + docs.length + ' documentos', (d.ter || '(sin proveedor)') + ', B/. ' + fmt(d.monto) + ' el ' + d.f + '. Documentos: ' + docs.map(function (x) { return d.docs[x]; }).join(', ') + '. Posible duplicado con otro número.', d.monto);
  });

  /* T5: secuencia de ventas */
  var series = {}, hayDocVenta = false;
  filas.forEach(function (f) {
    if (rubroDe(f.cod) !== 'ING' || !f.dc || !(f.ha > 0)) return;
    var m = f.dc.match(/^(.*?)(\d+)\s*$/); if (!m) return;
    hayDocVenta = true;
    var pre = m[1].replace(/\s+/g, '').toUpperCase(), n = parseInt(m[2], 10), as = f.as || ('S/N ' + f.f);
    var s = series[pre] = series[pre] || { nums: {}, f: {} };
    (s.nums[n] = s.nums[n] || {})[as] = 1;
  });
  if (!hayDocVenta) res.avisos.push('No hay números de documento en las líneas de ingresos: la prueba de secuencia (T5) no se pudo aplicar.');
  Object.keys(series).forEach(function (pre) {
    var s = series[pre], nums = Object.keys(s.nums).map(Number).sort(function (a, b) { return a - b; });
    var falt = [], dups = [];
    nums.forEach(function (n, i) { if (Object.keys(s.nums[n]).length >= 2) dups.push(n); if (i > 0 && n - nums[i - 1] > 1) for (var x = nums[i - 1] + 1; x < n && falt.length < 5000; x++) falt.push(x); });
    var etq = pre ? 'serie ' + pre : 'serie sin prefijo';
    if (falt.length) A('T5', falt.length > 500 ? 'Medio' : 'Alto', 'falt|' + pre, 'Faltan ' + falt.length + ' números en la ' + etq, 'Entre ' + nums[0] + ' y ' + nums[nums.length - 1] + ' faltan: ' + rangos(falt).slice(0, 40).join(', ') + (rangos(falt).length > 40 ? ' y más' : '') + '. Verifique si son anuladas, notas de crédito o ingresos no registrados, y concilie con el reporte de facturación electrónica de la DGI.', 0);
    if (dups.length) A('T5', 'Alto', 'dup|' + pre, 'Números repetidos en la ' + etq, 'Aparecen en más de un asiento: ' + rangos(dups).slice(0, 40).join(', ') + '.', 0);
  });

  /* T6 y T7: montos redondeados e idénticos en gastos */
  var gastos = [];
  filas.forEach(function (f) { if (RUBROS_GASTO.indexOf(rubroDe(f.cod)) >= 0 && f.de > 0) gastos.push(f); });
  var redondo = function (x) { return x >= 100 && Math.round(x * 100) % 10000 === 0; };
  var porCuenta = {};
  gastos.forEach(function (f) { var c = porCuenta[f.cod] = porCuenta[f.cod] || { n: 0, r: 0, tot: 0 }; c.n++; c.tot += f.de; if (redondo(f.de)) c.r++; });
  Object.keys(porCuenta).forEach(function (cod) {
    var c = porCuenta[cod];
    if (c.r >= 3 && c.n >= 5 && c.r / c.n >= 0.2) A('T6', c.r / c.n >= 0.5 ? 'Alto' : 'Medio', 'cta|' + cod, (cuentaPor[cod] ? cuentaPor[cod].nombre : cod) + ': ' + c.r + ' de ' + c.n + ' líneas redondas', 'El ' + (100 * c.r / c.n).toFixed(0) + ' % de las líneas termina en centenas exactas. Los gastos con factura rara vez dan cifras tan redondas.', 0);
  });
  gastos.forEach(function (f, i) {
    if (!redondo(f.de) || f.de < uEj) return;
    A('T6', 'Medio', 'lin|' + (f.as || i) + '|' + f.cod + '|' + f.de, 'Gasto redondo B/. ' + fmt(f.de) + ' en ' + (f.as ? 'asiento ' + f.as : 'una línea'), (f.f || 'Sin fecha') + ', cuenta ' + f.cod + (f.te ? ', ' + f.te : '') + (f.ds ? '. ' + f.ds : '') + '. Pida el comprobante que lo respalde.', f.de);
  });
  var ident = {};
  gastos.forEach(function (f) {
    if (f.de < uTr) return;
    var k = f.cod + '|' + f.de, o = ident[k] = ident[k] || { cod: f.cod, m: f.de, as: {}, fechas: [] };
    o.as[f.as || ('S/N ' + f.f + f.ds)] = 1; o.fechas.push(f.f);
  });
  Object.keys(ident).forEach(function (k) {
    var o = ident[k], n = Object.keys(o.as).length;
    if (n >= 3) A('T7', o.m >= uEj ? 'Medio' : 'Bajo', k, 'B/. ' + fmt(o.m) + ' repetido ' + n + ' veces en ' + (cuentaPor[o.cod] ? cuentaPor[o.cod].nombre : o.cod), 'Fechas: ' + o.fechas.filter(Boolean).slice(0, 12).join(', ') + '. Puede ser un pago recurrente legítimo (alquiler, cuota); confirme con el contrato.', o.m * n);
  });

  /* T8: Benford sobre gastos */
  var cuenta = [0, 0, 0, 0, 0, 0, 0, 0, 0], tot = 0;
  gastos.forEach(function (f) { if (f.de >= 10) { var d = parseInt(String(Math.floor(f.de)).charAt(0), 10); if (d >= 1) { cuenta[d - 1]++; tot++; } } });
  if (tot >= 50) {
    var mad = 0, tabla = [];
    for (var i = 0; i < 9; i++) { var ob = cuenta[i] / tot; mad += Math.abs(ob - BENFORD[i]); tabla.push({ d: i + 1, n: cuenta[i], obs: ob, esp: BENFORD[i] }); }
    mad /= 9;
    var clase = mad <= 0.006 ? 'Conforme' : mad <= 0.012 ? 'Aceptable' : mad <= 0.015 ? 'Marginal' : 'No conforme';
    res.benford = { n: tot, mad: mad, clase: clase, tabla: tabla };
    if (mad > 0.012) A('T8', mad > 0.015 ? 'Medio' : 'Bajo', 'ben', 'Primer dígito de los gastos: ' + clase.toLowerCase(), 'Desviación media absoluta de ' + mad.toFixed(4) + ' sobre ' + tot + ' líneas (umbrales de Nigrini: hasta 0.006 conforme, 0.012 aceptable, 0.015 marginal). Es una señal para dirigir el muestreo, no una conclusión.', 0);
  } else res.avisos.push('Hay solo ' + tot + ' líneas de gasto de B/. 10 o más; Benford (T8) necesita al menos 50.');

  /* T9: integridad */
  var sinCuenta = {}, sinDesc = 0, sinFecha = 0;
  lista.forEach(function (a) {
    if (Math.abs(a.de - a.ha) > 0.005) A('T9', 'Alto', 'desc|' + a.id, 'Asiento ' + a.id + ' descuadrado', 'Debe B/. ' + fmt(a.de) + ' y haber B/. ' + fmt(a.ha) + ': diferencia B/. ' + fmt(a.de - a.ha) + '.', Math.abs(a.de - a.ha));
    if (!a.f) { sinFecha++; }
    else if ((cierre && a.f > cierre) || (ini && a.f < ini)) A('T9', 'Medio', 'per|' + a.id, 'Asiento ' + a.id + ' fuera del período', desc(a) + ' El período va de ' + (ini || '...') + ' a ' + (cierre || '...') + '.', a.monto);
    if (!a.ds && a.monto >= uTr) sinDesc++;
  });
  if (sinFecha) A('T9', 'Medio', 'sinfecha', sinFecha + ' asientos sin fecha válida', 'Revise el formato de la columna Fecha (se aceptan AAAA-MM-DD, DD/MM/AAAA y fechas de Excel).', 0);
  if (sinDesc) A('T9', 'Bajo', 'sindesc', sinDesc + ' asientos sin descripción', 'Asientos de B/. ' + fmt(uTr) + ' o más sin concepto. Dificultan la revisión del soporte.', 0);
  filas.forEach(function (f) { if (!cuentaPor[f.cod]) sinCuenta[f.cod] = (sinCuenta[f.cod] || 0) + 1; });
  Object.keys(sinCuenta).forEach(function (cod) { A('T9', 'Medio', 'cta|' + cod, 'La cuenta ' + cod + ' no está en la balanza', sinCuenta[cod] + ' líneas del diario usan una cuenta que no existe en la balanza preliminar.', 0); });

  /* T10: diario contra balanza */
  var movDiario = {};
  filas.forEach(function (f) { movDiario[f.cod] = r2((movDiario[f.cod] || 0) + f.de - f.ha); });
  (e.cuentas || []).forEach(function (c) {
    var mb = movimiento(c), md = movDiario[c.cod] || 0, dif = r2(md - mb);
    if (Math.abs(dif) >= 0.005) A('T10', Math.abs(dif) >= uEj ? 'Alto' : 'Medio', c.cod, c.cod + ' ' + c.nombre + ': diferencia B/. ' + fmt(dif), 'Movimiento en el diario B/. ' + fmt(md) + ' contra B/. ' + fmt(mb) + ' en la balanza (acumulado menos saldo inicial). Si el diario es parcial, la diferencia es esperable.', Math.abs(dif));
  });

  var peso = { Alto: 0, Medio: 1, Bajo: 2 };
  res.alertas.sort(function (x, y) { return (peso[x.nivel] - peso[y.nivel]) || (y.monto - x.monto); });
  return res;
}

function revisionDe(e, k) { var r = (e.diario && e.diario.rev && e.diario.rev[k]) || {}; return { estado: r.estado || 'Pendiente', nota: r.nota || '' }; }
function resumenAlertas(e, res) {
  var o = { total: res.alertas.length, pendientes: 0, hallazgos: 0, sinProblema: 0, porNivel: { Alto: 0, Medio: 0, Bajo: 0 }, porPrueba: {} };
  PRUEBAS_DIARIO.forEach(function (p) { o.porPrueba[p.id] = { n: 0, pend: 0 }; });
  res.alertas.forEach(function (a) {
    var st = revisionDe(e, a.k).estado;
    o.porNivel[a.nivel]++; o.porPrueba[a.p].n++;
    if (st === 'Pendiente') { o.pendientes++; o.porPrueba[a.p].pend++; } else if (st === 'Hallazgo') o.hallazgos++; else o.sinProblema++;
  });
  return o;
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { parseDiario: parseDiario, analizarDiario: analizarDiario, parseFechaHora: parseFechaHora }; }
/* FIN DEL ARCHIVO diario.js */
