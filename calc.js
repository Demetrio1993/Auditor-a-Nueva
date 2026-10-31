/* calc.js - Cálculos de auditoría: balanza, ajustes, estados, análisis, razones, materialidad y textos */
'use strict';

/* Convención: todos los saldos internos van con signo (débito +, crédito -). */

function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var s = String(v == null ? '' : v).trim();
  if (!s) return 0;
  var neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/B\/\.?/gi, '').replace(/[^0-9.,\-]/g, '');
  if (s.charAt(0) === '-') { neg = !neg; s = s.slice(1); }
  s = s.replace(/-/g, '');
  var pc = s.lastIndexOf('.'), cm = s.lastIndexOf(',');
  if (pc >= 0 && cm >= 0) {
    if (cm > pc) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
  } else if (cm >= 0) {
    var partes = s.split(',');
    if (partes.length === 2 && partes[1].length <= 2) s = partes[0] + '.' + partes[1]; else s = s.replace(/,/g, '');
  }
  var x = parseFloat(s);
  if (!isFinite(x)) return 0;
  return neg ? -x : x;
}
function fmt(n, paren) {
  n = r2(n);
  var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n < 0) return paren ? '(' + s + ')' : '-' + s;
  return s;
}
function pct(n) { return (Math.round((Number(n) || 0) * 10) / 10).toFixed(1) + ' %'; }

/* ---------- Cuentas y balanza ---------- */
function acum(c) {
  var t = Number(c.si) || 0;
  for (var i = 0; i < 12; i++) t += Number(c.m && c.m[i]) || 0;
  return r2(t);
}
function movimiento(c) { return r2(acum(c) - (Number(c.si) || 0)); }

function ajustesAplicados(ajustes, estados) {
  var ok = estados || ['Aceptado'];
  var mapa = {};
  (ajustes || []).forEach(function (a) {
    if (ok.indexOf(a.estado) < 0) return;
    (a.lineas || []).forEach(function (l) {
      mapa[l.cod] = r2((mapa[l.cod] || 0) + (Number(l.debe) || 0) - (Number(l.haber) || 0));
    });
  });
  return mapa;
}

/* modo: 'prelim' (libros) | 'audit' (libros + ajustes aceptados) */
function saldoCuenta(c, mapa, modo) {
  var s = acum(c);
  if (modo === 'audit') s = r2(s + ((mapa && mapa[c.cod]) || 0));
  return s;
}

function porRubro(cuentas, mapa, modo) {
  var cierre = {}, ini = {}, ant = {};
  RUBROS.forEach(function (r) { cierre[r.id] = 0; ini[r.id] = 0; ant[r.id] = 0; });
  (cuentas || []).forEach(function (c) {
    if (!RUBRO_POR_ID[c.rubro]) return;
    cierre[c.rubro] = r2(cierre[c.rubro] + saldoCuenta(c, mapa, modo));
    ini[c.rubro] = r2(ini[c.rubro] + (Number(c.si) || 0));
    ant[c.rubro] = r2(ant[c.rubro] + (Number(c.pa) || 0));
  });
  return { cierre: cierre, ini: ini, ant: ant };
}

function sumaRubros(vals, ids) {
  var t = 0;
  ids.forEach(function (id) { t += vals[id] || 0; });
  return r2(t);
}
function idsDeSeccion(sec) {
  return RUBROS.filter(function (r) { return r.sec === sec; }).map(function (r) { return r.id; });
}

/* ---------- Estados financieros ---------- */
function estados(cuentas, ajustes, modo) {
  var mapa = ajustesAplicados(ajustes);
  var pr = porRubro(cuentas, mapa, modo);
  var v = pr.cierre, vi = pr.ini;

  var ing = r2(-v.ING), cos = r2(v.COS), gop = r2(v.GOP), gdep = r2(v.GDEP);
  var oin = r2(-v.OIN), gfi = r2(v.GFI), gisr = r2(v.GISR);
  var ub = r2(ing - cos), uo = r2(ub - gop - gdep), uai = r2(uo + oin - gfi), ni = r2(uai - gisr);

  var er = [
    { t: 'Ingresos por servicios', v: ing, k: 'fila' },
    { t: 'Costo de ventas o servicios', v: cos, k: 'fila' },
    { t: 'Utilidad bruta', v: ub, k: 'tot' },
    { t: 'Gastos de operación', v: gop, k: 'fila' },
    { t: 'Gasto de depreciación', v: gdep, k: 'fila' },
    { t: 'Utilidad de operación', v: uo, k: 'tot' },
    { t: 'Otros ingresos', v: oin, k: 'fila' },
    { t: 'Gastos financieros', v: gfi, k: 'fila' },
    { t: 'Utilidad antes del impuesto sobre la renta', v: uai, k: 'tot' },
    { t: 'Impuesto sobre la renta', v: gisr, k: 'fila' },
    { t: 'Utilidad neta del ejercicio', v: ni, k: 'gran' }
  ];

  /* Balance general */
  var bg = [], activos = 0, pasivos = 0, patBase = 0;
  function seccion(sec, signo) {
    var ids = idsDeSeccion(sec), total = 0, filas = [];
    ids.forEach(function (id) {
      var val = r2(signo * (v[id] || 0));
      if (Math.abs(val) >= 0.005) { filas.push({ t: RUBRO_POR_ID[id].nombre, v: val, k: 'fila', id: id }); total = r2(total + val); }
    });
    bg.push({ t: SECCIONES[sec].nombre, v: null, k: 'tit' });
    filas.forEach(function (f) { bg.push(f); });
    bg.push({ t: 'Total ' + SECCIONES[sec].nombre.toLowerCase(), v: total, k: 'tot' });
    return total;
  }
  var ac = seccion('AC', 1), anc = seccion('ANC', 1);
  activos = r2(ac + anc);
  bg.push({ t: 'TOTAL ACTIVOS', v: activos, k: 'gran' });
  var pc = seccion('PC', -1), pnc = seccion('PNC', -1);
  pasivos = r2(pc + pnc);
  bg.push({ t: 'Total pasivos', v: pasivos, k: 'tot' });
  /* Patrimonio */
  bg.push({ t: SECCIONES.PAT.nombre, v: null, k: 'tit' });
  ['CAP', 'URE', 'RET'].forEach(function (id) {
    var val = r2(-v[id]);
    if (Math.abs(val) >= 0.005) { bg.push({ t: RUBRO_POR_ID[id].nombre, v: val, k: 'fila', id: id }); patBase = r2(patBase + val); }
  });
  bg.push({ t: 'Utilidad neta del ejercicio', v: ni, k: 'fila' });
  var patrimonio = r2(patBase + ni);
  bg.push({ t: 'Total patrimonio', v: patrimonio, k: 'tot' });
  bg.push({ t: 'TOTAL PASIVOS Y PATRIMONIO', v: r2(pasivos + patrimonio), k: 'gran' });
  var difBG = r2(activos - pasivos - patrimonio);

  /* Cambios en el patrimonio: columnas Capital | Utilidades retenidas | Retiros | Resultado | Total */
  var ecp = [];
  var iCAP = r2(-vi.CAP), iURE = r2(-vi.URE), iRET = r2(-vi.RET);
  var mCAP = r2(-(v.CAP - vi.CAP)), mURE = r2(-(v.URE - vi.URE)), mRET = r2(-(v.RET - vi.RET));
  function fila(t, a, b, c, d, k) { return { t: t, c: [r2(a), r2(b), r2(c), r2(d), r2(a + b + c + d)], k: k || 'fila' }; }
  ecp.push(fila('Saldo al inicio del período', iCAP, iURE, iRET, 0, 'tot'));
  ecp.push(fila('Aportes del propietario', mCAP, 0, 0, 0));
  ecp.push(fila('Retiros del propietario', 0, 0, mRET, 0));
  ecp.push(fila('Otros movimientos en utilidades retenidas', 0, mURE, 0, 0));
  ecp.push(fila('Utilidad neta del ejercicio', 0, 0, 0, ni));
  ecp.push(fila('Saldo al final del período', iCAP + mCAP, iURE + mURE, iRET + mRET, ni, 'gran'));
  var ecpTotal = ecp[ecp.length - 1].c[4];
  var difECP = r2(ecpTotal - patrimonio);

  /* Flujo de efectivo, método indirecto */
  var delta = function (id) { return r2((v[id] || 0) - (vi[id] || 0)); };
  var fe = [], cfo = 0, cfi = 0, cff = 0;
  fe.push({ t: 'Actividades de operación', v: null, k: 'tit' });
  fe.push({ t: 'Utilidad neta del ejercicio', v: ni, k: 'fila' }); cfo = r2(cfo + ni);
  if (Math.abs(gdep) >= 0.005) { fe.push({ t: 'Más: depreciación (partida que no usa efectivo)', v: gdep, k: 'fila' }); cfo = r2(cfo + gdep); }
  RUBROS.filter(function (r) { return r.flujo === 'op'; }).forEach(function (r) {
    var d = delta(r.id);
    if (Math.abs(d) < 0.005) return;
    var activo = SECCIONES[r.sec].lado === 'A';
    var t = (activo ? '(Aumento) disminución en ' : 'Aumento (disminución) en ') + r.nombre.toLowerCase();
    fe.push({ t: t, v: r2(-d), k: 'fila' }); cfo = r2(cfo - d);
  });
  fe.push({ t: 'Efectivo neto de actividades de operación', v: cfo, k: 'tot' });
  fe.push({ t: 'Actividades de inversión', v: null, k: 'tit' });
  ['PPE', 'INT', 'OANC'].forEach(function (id) {
    var d = delta(id);
    if (Math.abs(d) < 0.005) return;
    fe.push({ t: (d > 0 ? 'Adquisición de ' : 'Disposición de ') + RUBRO_POR_ID[id].nombre.toLowerCase(), v: r2(-d), k: 'fila' }); cfi = r2(cfi - d);
  });
  var dDep = r2(delta('DEPA') + gdep);
  if (Math.abs(dDep) >= 0.005) { fe.push({ t: 'Bajas o ajustes de depreciación acumulada', v: r2(-dDep), k: 'fila' }); cfi = r2(cfi - dDep); }
  fe.push({ t: 'Efectivo neto de actividades de inversión', v: cfi, k: 'tot' });
  fe.push({ t: 'Actividades de financiamiento', v: null, k: 'tit' });
  ['PRC', 'PRL', 'CXPP', 'CAP', 'URE', 'RET'].forEach(function (id) {
    var d = delta(id);
    if (Math.abs(d) < 0.005) return;
    var t = RUBRO_POR_ID[id].nombre;
    if (id === 'CAP') t = 'Aportes del propietario';
    else if (id === 'RET') t = 'Retiros del propietario';
    else if (id === 'URE') t = 'Otros movimientos en utilidades retenidas';
    else t = (d < 0 ? 'Aumento en ' : 'Disminución en ') + t.toLowerCase();
    fe.push({ t: t, v: r2(-d), k: 'fila' }); cff = r2(cff - d);
  });
  fe.push({ t: 'Efectivo neto de actividades de financiamiento', v: cff, k: 'tot' });
  var neto = r2(cfo + cfi + cff);
  fe.push({ t: 'Aumento (disminución) neto del efectivo', v: neto, k: 'tot' });
  fe.push({ t: 'Efectivo al inicio del período', v: vi.EFE, k: 'fila' });
  fe.push({ t: 'Efectivo al final del período', v: r2(vi.EFE + neto), k: 'gran' });
  var difFE = r2(r2(vi.EFE + neto) - v.EFE);

  return {
    modo: modo, er: er, bg: bg, ecp: ecp, fe: fe,
    n: { ing: ing, cos: cos, ub: ub, gop: gop, gdep: gdep, uo: uo, oin: oin, gfi: gfi, uai: uai, gisr: gisr, ni: ni,
         ac: ac, anc: anc, activos: activos, pc: pc, pnc: pnc, pasivos: pasivos, patrimonio: patrimonio,
         cfo: cfo, cfi: cfi, cff: cff, neto: neto, efectivo: v.EFE, efectivoIni: vi.EFE },
    dif: { bg: difBG, ecp: difECP, fe: difFE },
    rub: pr
  };
}

/* ---------- Análisis horizontal y vertical ---------- */
function comparativo(cuentas, ajustes, modo, opc) {
  opc = opc || {};
  var umbralPct = opc.umbralPct == null ? 20 : opc.umbralPct;
  var umbralMonto = opc.umbralMonto || 0;
  var est = estados(cuentas, ajustes, modo);
  var pr = est.rub;
  var hayAntER = RUBROS.some(function (r) { return SECCIONES[r.sec].estado === 'ER' && Math.abs(pr.ant[r.id]) >= 0.005; });
  var baseBG = est.n.activos, baseER = est.n.ing;
  var filas = [];
  RUBROS.forEach(function (r) {
    var s = SECCIONES[r.sec], esBG = s.estado === 'BG';
    var signo = (esBG && s.lado === 'A') ? 1 : -1;
    if (!esBG && ['COS', 'GOP', 'GDP', 'GFI', 'GIS'].indexOf(r.sec) >= 0) signo = 1;
    var cur = r2(signo * pr.cierre[r.id]);
    var prev = esBG ? r2(signo * pr.ini[r.id]) : r2(signo * pr.ant[r.id]);
    var tienePrev = esBG || hayAntER;
    if (Math.abs(cur) < 0.005 && Math.abs(prev) < 0.005) return;
    var d = r2(cur - prev);
    var dp = Math.abs(prev) >= 0.005 ? (d / Math.abs(prev)) * 100 : null;
    var base = esBG ? baseBG : baseER;
    var vert = base ? (cur / base) * 100 : null;
    var flag = false;
    if (tienePrev && Math.abs(d) >= umbralMonto) {
      if (dp === null) flag = Math.abs(cur) >= Math.max(umbralMonto, 0.005);
      else flag = Math.abs(dp) >= umbralPct;
    }
    filas.push({ id: r.id, t: r.nombre, estado: s.estado, cur: cur, prev: prev, tienePrev: tienePrev, d: d, dp: dp, vert: vert, flag: flag });
  });
  return { filas: filas, hayAntER: hayAntER, est: est };
}

/* ---------- Razones financieras ---------- */
function razones(est) {
  var n = est.n, pr = est.rub;
  var prom = function (id) { return ((pr.cierre[id] || 0) + (pr.ini[id] || 0)) / 2; };
  var div = function (a, b) { return Math.abs(b) < 0.005 ? null : a / b; };
  var inv = prom('INV'), cxc = prom('CXC');
  var activoIni = 0, patIni = 0;
  RUBROS.forEach(function (r) {
    var s = SECCIONES[r.sec];
    if (s.estado === 'BG' && s.lado === 'A') activoIni += pr.ini[r.id] || 0;
    if (s.estado === 'BG' && r.sec === 'PAT') patIni += -(pr.ini[r.id] || 0);
  });
  var out = [];
  function add(grupo, nombre, valor, formato, texto) { out.push({ g: grupo, t: nombre, v: valor, f: formato, i: texto }); }
  var rc = div(n.ac, n.pc);
  add('Liquidez', 'Razón corriente', rc, 'x',
    rc === null ? 'No hay pasivo corriente.' : rc < 1 ? 'El activo corriente no alcanza a cubrir el pasivo corriente: revise la capacidad de pago y la hipótesis de empresa en funcionamiento.' :
    rc < 1.5 ? 'Cobertura ajustada del pasivo corriente.' : 'El activo corriente cubre el pasivo corriente con margen.');
  var pa = div(n.ac - (pr.cierre.INV || 0) - (pr.cierre.ANT || 0), n.pc);
  add('Liquidez', 'Prueba ácida', pa, 'x', pa === null ? '' : pa < 1 ? 'Sin contar inventarios ni anticipos, la cobertura es menor a 1.' : 'Cobertura suficiente sin depender de inventarios.');
  add('Liquidez', 'Capital de trabajo', r2(n.ac - n.pc), 'b', n.ac - n.pc < 0 ? 'Capital de trabajo negativo.' : 'Capital de trabajo positivo.');
  var e1 = div(n.pasivos, n.activos);
  add('Endeudamiento', 'Pasivo / Activo', e1, '%', e1 === null ? '' : e1 > 0.6 ? 'Más del 60 % de los activos se financia con deuda.' : 'Nivel de deuda moderado respecto de los activos.');
  var e2 = div(n.pasivos, n.patrimonio);
  add('Endeudamiento', 'Pasivo / Patrimonio', e2, 'x', e2 === null ? '' : e2 > 1.5 ? 'Apalancamiento alto frente al patrimonio.' : 'Apalancamiento dentro de un rango moderado.');
  var ri = div(n.cos, inv);
  add('Actividad', 'Rotación de inventarios', ri, 'x', ri === null ? 'Sin inventarios o sin costo de ventas.' : 'Equivale a ' + (365 / ri).toFixed(0) + ' días de inventario.');
  var rcx = div(n.ing, cxc);
  add('Actividad', 'Rotación de cuentas por cobrar', rcx, 'x', rcx === null ? 'Sin saldo promedio de clientes.' : 'Equivale a ' + (365 / rcx).toFixed(0) + ' días de cobro en promedio.');
  var mb = div(n.ub, n.ing), mo = div(n.uo, n.ing), mn = div(n.ni, n.ing);
  add('Rentabilidad', 'Margen bruto', mb === null ? null : mb, '%', '');
  add('Rentabilidad', 'Margen operativo', mo === null ? null : mo, '%', '');
  add('Rentabilidad', 'Margen neto', mn === null ? null : mn, '%', mn === null ? '' : mn < 0 ? 'El período cierra con pérdida.' : '');
  var roa = div(n.ni, (n.activos + activoIni) / 2), roe = div(n.ni, (n.patrimonio + patIni) / 2);
  add('Rentabilidad', 'Rendimiento sobre activos', roa, '%', '');
  add('Rentabilidad', 'Rendimiento sobre patrimonio', roe, '%', '');
  return out;
}
function fmtRazon(r) {
  if (r.v === null || r.v === undefined) return 'n/d';
  if (r.f === 'x') return r.v.toFixed(2) + ' veces';
  if (r.f === '%') return (r.v * 100).toFixed(1) + ' %';
  return fmt(r.v);
}

/* ---------- Materialidad e ISR ---------- */
function materialidad(emp, est) {
  var p = emp.plan || {};
  var bases = { ingresos: est.n.ing, activos: est.n.activos, utilidad: Math.abs(est.n.uai) };
  var pcts = { ingresos: 1, activos: 2, utilidad: 5 };
  var base = p.base || 'ingresos';
  var pctMat = p.pctMat == null || p.pctMat === '' ? pcts[base] : Number(p.pctMat);
  var pctEjec = p.pctEjec == null || p.pctEjec === '' ? 75 : Number(p.pctEjec);
  var pctTriv = p.pctTriv == null || p.pctTriv === '' ? 5 : Number(p.pctTriv);
  var valor = Math.max(0, bases[base] || 0);
  var mat = r2(valor * pctMat / 100);
  return {
    base: base, valorBase: r2(valor), pctMat: pctMat, pctEjec: pctEjec, pctTriv: pctTriv,
    mat: mat, ejec: r2(mat * pctEjec / 100), triv: r2(mat * pctTriv / 100),
    bases: bases, pcts: pcts,
    ref: { ingresos: r2(Math.max(0, bases.ingresos) * pcts.ingresos / 100), activos: r2(Math.max(0, bases.activos) * pcts.activos / 100), utilidad: r2(bases.utilidad * pcts.utilidad / 100) }
  };
}
function isrPN(base) {
  base = Math.max(0, Number(base) || 0);
  if (base <= 11000) return 0;
  if (base <= 50000) return r2((base - 11000) * 0.15);
  return r2(5850 + (base - 50000) * 0.25);
}

/* ---------- Ajustes ---------- */
function ajusteCuadrado(a) {
  var d = 0, h = 0;
  (a.lineas || []).forEach(function (l) { d += Number(l.debe) || 0; h += Number(l.haber) || 0; });
  return { debe: r2(d), haber: r2(h), ok: Math.abs(d - h) < 0.005 && d > 0 };
}
/* Efecto de ajustes (por estado) sobre utilidad, activos y pasivos */
function efectoAjustes(cuentas, ajustes, estadosOk) {
  var rubroDe = {};
  (cuentas || []).forEach(function (c) { rubroDe[c.cod] = c.rubro; });
  var ut = 0, act = 0, pas = 0;
  (ajustes || []).forEach(function (a) {
    if (estadosOk.indexOf(a.estado) < 0) return;
    (a.lineas || []).forEach(function (l) {
      var net = (Number(l.debe) || 0) - (Number(l.haber) || 0);
      var r = RUBRO_POR_ID[rubroDe[l.cod]];
      if (!r) return;
      var s = SECCIONES[r.sec];
      if (s.estado === 'ER') ut -= net;
      else if (s.lado === 'A') act += net;
      else if (r.sec !== 'PAT') pas -= net;
    });
  });
  return { utilidad: r2(ut), activos: r2(act), pasivos: r2(pas) };
}
function diferenciasNoCorregidas(emp, mat) {
  var ef = efectoAjustes(emp.cuentas, emp.ajustes, ['No aceptado']);
  var mayor = Math.max(Math.abs(ef.utilidad), Math.abs(ef.activos), Math.abs(ef.pasivos));
  var nivel = mayor === 0 ? 'ninguna' : mayor > mat.mat && mat.mat > 0 ? 'material' : mayor > mat.ejec && mat.ejec > 0 ? 'cercana' : 'no material';
  return { efecto: ef, mayor: r2(mayor), nivel: nivel };
}

/* ---------- Programa ---------- */
function progresoRubro(emp, id) {
  var base = PROGRAMA[id];
  if (!base) return { proc: 0, total: 0, docs: 0, totalDocs: 0, pct: 0 };
  var p = (emp.programa && emp.programa[id]) || {};
  var proc = 0, docs = 0;
  base.procedimientos.forEach(function (_, i) { if (p.proc && p.proc[i] && p.proc[i].ok) proc++; });
  base.documentos.forEach(function (_, i) { if (p.doc && p.doc[i] && p.doc[i].ok) docs++; });
  var total = base.procedimientos.length, totalDocs = base.documentos.length;
  return { proc: proc, total: total, docs: docs, totalDocs: totalDocs, pct: Math.round(100 * (proc + docs) / (total + totalDocs)) };
}
function rubrosConSaldo(emp) {
  var pr = porRubro(emp.cuentas, ajustesAplicados(emp.ajustes), 'audit');
  var pl = porRubro(emp.cuentas, {}, 'prelim');
  return RUBROS.filter(function (r) {
    return Math.abs(pr.cierre[r.id]) >= 0.005 || Math.abs(pl.cierre[r.id]) >= 0.005 || Math.abs(pl.ini[r.id]) >= 0.005;
  });
}
function conclusionSugerida(emp, id) {
  var p = (emp.programa && emp.programa[id]) || {};
  if (p.conclusion) return p.conclusion;
  var pg = progresoRubro(emp, id);
  if (pg.proc < pg.total) return 'Pendiente';
  var tieneAj = (emp.ajustes || []).some(function (a) {
    return a.estado === 'Aceptado' && (a.lineas || []).some(function (l) { return (emp.cuentas || []).some(function (c) { return c.cod === l.cod && c.rubro === id; }); });
  });
  return tieneAj ? 'Razonable con ajustes' : 'Razonable';
}

/* ---------- Validaciones por módulo ---------- */
function validaciones(emp) {
  var res = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
  function chk(m, ok, msg) { res[m].push({ ok: !!ok, msg: msg }); }
  var e = emp.encargo || {};
  chk(1, e.nombre, 'Nombre del cliente');
  chk(1, e.anio, 'Ejercicio fiscal');
  chk(1, e.fechaCierre, 'Fecha de cierre del período');
  var cu = emp.cuentas || [];
  chk(2, cu.length > 0, 'Hay cuentas cargadas');
  var sumSi = r2(cu.reduce(function (t, c) { return t + (Number(c.si) || 0); }, 0));
  chk(2, Math.abs(sumSi) < 0.005, 'Saldos iniciales cuadran' + (Math.abs(sumSi) < 0.005 ? '' : ' (diferencia ' + fmt(sumSi) + ')'));
  var mesesMal = [];
  for (var i = 0; i < 12; i++) {
    var s = r2(cu.reduce(function (t, c) { return t + (Number(c.m && c.m[i]) || 0); }, 0));
    if (Math.abs(s) >= 0.005) mesesMal.push(MESES[i]);
  }
  chk(2, mesesMal.length === 0, 'Cada mes cuadra' + (mesesMal.length ? ' (descuadre en ' + mesesMal.join(', ') + ')' : ''));
  var sinRubro = cu.filter(function (c) { return !RUBRO_POR_ID[c.rubro]; }).length;
  chk(2, sinRubro === 0, 'Todas las cuentas tienen rubro' + (sinRubro ? ' (' + sinRubro + ' sin rubro)' : ''));
  var erIni = cu.filter(function (c) { var r = RUBRO_POR_ID[c.rubro]; return r && SECCIONES[r.sec].estado === 'ER' && Math.abs(c.si || 0) >= 0.005; }).length;
  chk(2, erIni === 0, 'Cuentas de resultados inician en cero' + (erIni ? ' (' + erIni + ' con saldo inicial)' : ''));

  var est0 = estados(cu, emp.ajustes, 'prelim');
  var mat = materialidad(emp, est0);
  chk(3, mat.mat > 0, 'Materialidad determinada' + (mat.mat > 0 ? ' (' + fmt(mat.mat) + ')' : ''));
  var plan = (emp.plan && emp.plan.check) || {};
  var hechos = CHECK_PLAN.filter(function (c) { return plan[c.id]; }).length;
  chk(3, hechos === CHECK_PLAN.length, 'Lista de planificación completa (' + hechos + ' de ' + CHECK_PLAN.length + ')');

  var rs = rubrosConSaldo(emp), compl = 0;
  rs.forEach(function (r) { var pg = progresoRubro(emp, r.id); if (pg.proc === pg.total) compl++; });
  chk(4, rs.length > 0 && compl === rs.length, 'Pruebas ejecutadas en ' + compl + ' de ' + rs.length + ' rubros con saldo');
  var sinConc = rs.filter(function (r) { return conclusionSugerida(emp, r.id) === 'Pendiente'; }).length;
  chk(4, sinConc === 0, 'Conclusión por rubro' + (sinConc ? ' (' + sinConc + ' pendientes)' : ''));

  var aj = emp.ajustes || [];
  var desc = aj.filter(function (a) { return !ajusteCuadrado(a).ok; }).length;
  chk(5, desc === 0, 'Todos los ajustes cuadran' + (desc ? ' (' + desc + ' descuadrados)' : ''));
  var pend = aj.filter(function (a) { return a.estado === 'Propuesto'; }).length;
  chk(5, pend === 0, 'Sin ajustes pendientes de decisión' + (pend ? ' (' + pend + ')' : ''));
  var cods = {};
  cu.forEach(function (c) { cods[c.cod] = 1; });
  var ext = 0;
  aj.forEach(function (a) { (a.lineas || []).forEach(function (l) { if (!cods[l.cod]) ext++; }); });
  chk(5, ext === 0, 'Cuentas de ajustes existen en la balanza' + (ext ? ' (' + ext + ' líneas sin cuenta)' : ''));

  var mapa = ajustesAplicados(aj);
  var sa = r2(cu.reduce(function (t, c) { return t + saldoCuenta(c, mapa, 'audit'); }, 0));
  chk(6, Math.abs(sa) < 0.005 && cu.length > 0, 'Balanza auditada cuadra');

  var est = estados(cu, aj, 'audit');
  chk(7, Math.abs(est.dif.bg) < 0.005, 'El balance cuadra' + (Math.abs(est.dif.bg) < 0.005 ? '' : ' (diferencia ' + fmt(est.dif.bg) + ')'));
  chk(7, Math.abs(est.dif.fe) < 0.005, 'El flujo de efectivo concilia con el efectivo del balance');
  chk(7, Math.abs(est.dif.ecp) < 0.005, 'El estado de patrimonio concilia con el balance');

  var cierre = (emp.dictamen && emp.dictamen.check) || {};
  var hc = CHECK_CIERRE.filter(function (c) { return cierre[c.id]; }).length;
  chk(8, hc === CHECK_CIERRE.length, 'Procedimientos finales completos (' + hc + ' de ' + CHECK_CIERRE.length + ')');
  chk(8, emp.dictamen && emp.dictamen.opinion, 'Tipo de opinión elegido');
  chk(8, emp.auditor && emp.auditor.nombre, 'Nombre del auditor en la firma');
  return res;
}
function estadoModulo(res, m) {
  var l = res[m] || [];
  if (!l.length) return 'na';
  var ok = l.filter(function (x) { return x.ok; }).length;
  return ok === l.length ? 'ok' : ok === 0 ? 'no' : 'parcial';
}

/* ---------- Opinión sugerida ---------- */
function opinionSugerida(emp) {
  var est = estados(emp.cuentas, emp.ajustes, 'audit');
  var mat = materialidad(emp, estados(emp.cuentas, emp.ajustes, 'prelim'));
  var dif = diferenciasNoCorregidas(emp, mat);
  var rs = rubrosConSaldo(emp);
  var conc = rs.map(function (r) { return conclusionSugerida(emp, r.id); });
  var motivos = [];
  if (dif.nivel === 'material') motivos.push('Las diferencias no corregidas (' + fmt(dif.mayor) + ') superan la materialidad (' + fmt(mat.mat) + ').');
  if (conc.indexOf('Con salvedad') >= 0) motivos.push('Hay rubros concluidos con salvedad.');
  if (conc.indexOf('Sin evidencia suficiente') >= 0) motivos.push('Hay rubros sin evidencia suficiente: evalúe si la limitación es generalizada para una abstención.');
  if (conc.indexOf('Incorrecto') >= 0) motivos.push('Hay rubros concluidos como incorrectos: evalúe si el efecto es generalizado para una opinión desfavorable.');
  var id = motivos.length ? 'salvedad' : 'favorable';
  return { id: id, motivos: motivos, est: est, mat: mat, dif: dif };
}

/* ---------- Textos: dictamen por cuenta, informe y certificación ---------- */
function fechaLarga(iso) {
  if (!iso) return '__ de ______ de ____';
  var p = String(iso).split('-');
  if (p.length < 3) return iso;
  var m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return parseInt(p[2], 10) + ' de ' + m[parseInt(p[1], 10) - 1] + ' de ' + p[0];
}
function textoCuenta(emp, rubro, prelim, ajuste, audit, conclusion) {
  var nom = RUBRO_POR_ID[rubro].nombre.toLowerCase();
  var ref = PROGRAMA[rubro] ? PROGRAMA[rubro].ref : '';
  var fecha = fechaLarga(emp.encargo && emp.encargo.fechaCierre);
  var base = 'Saldo según libros: B/. ' + fmt(prelim) + '; ajustes de auditoría: B/. ' + fmt(ajuste) + '; saldo auditado: B/. ' + fmt(audit) + ' al ' + fecha + '. ';
  var txt = {
    'Razonable': 'Con base en los procedimientos del papel de trabajo ' + ref + ', el saldo de ' + nom + ' se presenta razonablemente, en todos los aspectos materiales.',
    'Razonable con ajustes': 'Con base en los procedimientos del papel de trabajo ' + ref + ' y después de los ajustes de auditoría aceptados por el propietario, el saldo de ' + nom + ' se presenta razonablemente, en todos los aspectos materiales.',
    'Con salvedad': 'Excepto por la cuestión descrita en el hallazgo del papel de trabajo ' + ref + ', el saldo de ' + nom + ' se presenta razonablemente, en todos los aspectos materiales.',
    'Sin evidencia suficiente': 'No fue posible obtener evidencia de auditoría suficiente y adecuada sobre el saldo de ' + nom + ' (papel de trabajo ' + ref + '), por lo que no se expresa conclusión sobre este rubro.',
    'Incorrecto': 'El saldo de ' + nom + ' contiene incorrecciones materiales descritas en el papel de trabajo ' + ref + ' y no se presenta razonablemente.',
    'Pendiente': 'Las pruebas de este rubro (papel de trabajo ' + ref + ') están pendientes de concluir.'
  };
  return base + (txt[conclusion] || txt.Pendiente);
}

function textosInforme(emp, opinionId) {
  var e = emp.encargo || {}, a = emp.auditor || {}, d = emp.dictamen || {};
  var nom = e.nombre || '[Nombre del negocio]';
  var fecha = fechaLarga(e.fechaCierre);
  var marco = e.marco || 'NIIF para las PYMES';
  var s = [];
  var salv = d.salvedadTexto || '[Describa la cuestión que origina la salvedad, su efecto y los montos]';
  var detalleEst = 'el balance general al ' + fecha + ', el estado de resultados, el estado de cambios en el patrimonio y el estado de flujos de efectivo por el período terminado en esa fecha, así como las notas a los estados financieros, que incluyen un resumen de las políticas contables significativas';
  s.push({ h: 'Al propietario de ' + nom, p: '' });
  if (opinionId === 'favorable') {
    s.push({ h: 'Opinión', p: 'He auditado los estados financieros de ' + nom + ', que comprenden ' + detalleEst + '.\n\nEn mi opinión, los estados financieros adjuntos presentan razonablemente, en todos los aspectos materiales, la situación financiera de ' + nom + ' al ' + fecha + ', así como su desempeño financiero y sus flujos de efectivo por el período terminado en esa fecha, de conformidad con ' + marco + '.' });
    s.push({ h: 'Fundamento de la opinión', p: 'Llevé a cabo mi auditoría de conformidad con las Normas Internacionales de Auditoría (NIA). Mis responsabilidades de acuerdo con esas normas se describen más adelante en la sección Responsabilidades del auditor en relación con la auditoría de los estados financieros. Soy independiente de ' + nom + ' de conformidad con el Código de Ética para Contadores Públicos aplicable en la República de Panamá y he cumplido las demás responsabilidades de ética de acuerdo con ese código. Considero que la evidencia de auditoría obtenida proporciona una base suficiente y adecuada para mi opinión.' });
  } else if (opinionId === 'salvedad') {
    s.push({ h: 'Opinión con salvedades', p: 'He auditado los estados financieros de ' + nom + ', que comprenden ' + detalleEst + '.\n\nEn mi opinión, excepto por los efectos de la cuestión descrita en la sección Fundamento de la opinión con salvedades, los estados financieros adjuntos presentan razonablemente, en todos los aspectos materiales, la situación financiera de ' + nom + ' al ' + fecha + ', así como su desempeño financiero y sus flujos de efectivo por el período terminado en esa fecha, de conformidad con ' + marco + '.' });
    s.push({ h: 'Fundamento de la opinión con salvedades', p: salv + '\n\nLlevé a cabo mi auditoría de conformidad con las NIA. Mis responsabilidades se describen más adelante en la sección Responsabilidades del auditor. Soy independiente de ' + nom + ' de conformidad con el Código de Ética aplicable en la República de Panamá. Considero que la evidencia de auditoría obtenida proporciona una base suficiente y adecuada para mi opinión con salvedades.' });
  } else if (opinionId === 'desfavorable') {
    s.push({ h: 'Opinión desfavorable', p: 'He auditado los estados financieros de ' + nom + ', que comprenden ' + detalleEst + '.\n\nEn mi opinión, debido a la importancia de la cuestión descrita en la sección Fundamento de la opinión desfavorable, los estados financieros adjuntos no presentan razonablemente la situación financiera de ' + nom + ' al ' + fecha + ', ni su desempeño financiero ni sus flujos de efectivo por el período terminado en esa fecha, de conformidad con ' + marco + '.' });
    s.push({ h: 'Fundamento de la opinión desfavorable', p: salv + '\n\nLlevé a cabo mi auditoría de conformidad con las NIA y soy independiente de ' + nom + ' de conformidad con el Código de Ética aplicable en la República de Panamá. Considero que la evidencia de auditoría obtenida proporciona una base suficiente y adecuada para mi opinión desfavorable.' });
  } else {
    s.push({ h: 'Abstención de opinión', p: 'Fui contratado para auditar los estados financieros de ' + nom + ', que comprenden ' + detalleEst + '.\n\nNo expreso una opinión sobre los estados financieros adjuntos. Debido a la significatividad de la cuestión descrita en la sección Fundamento de la abstención de opinión, no he podido obtener evidencia de auditoría suficiente y adecuada que proporcione una base para una opinión de auditoría sobre estos estados financieros.' });
    s.push({ h: 'Fundamento de la abstención de opinión', p: salv });
  }
  if (d.enfasis) s.push({ h: 'Párrafo de énfasis', p: d.enfasis });
  s.push({ h: 'Responsabilidades del propietario en relación con los estados financieros', p: 'El propietario es responsable de la preparación y presentación razonable de los estados financieros de conformidad con ' + marco + ', y del control interno que considere necesario para permitir la preparación de estados financieros libres de incorrección material, debida a fraude o error.\n\nEn la preparación de los estados financieros, el propietario es responsable de evaluar la capacidad del negocio para continuar como empresa en funcionamiento, revelando, según corresponda, las cuestiones relacionadas con la empresa en funcionamiento.' });
  if (opinionId !== 'abstencion') {
    s.push({ h: 'Responsabilidades del auditor en relación con la auditoría de los estados financieros', p: 'Mis objetivos son obtener una seguridad razonable de que los estados financieros en su conjunto están libres de incorrección material, debida a fraude o error, y emitir un informe de auditoría que contiene mi opinión. Seguridad razonable es un alto grado de seguridad, pero no garantiza que una auditoría realizada de conformidad con las NIA siempre detecte una incorrección material cuando existe.\n\nComo parte de una auditoría de conformidad con las NIA, aplico mi juicio profesional y mantengo una actitud de escepticismo profesional durante toda la auditoría. También: identifico y evalúo los riesgos de incorrección material en los estados financieros; obtengo conocimiento del control interno relevante para la auditoría; evalúo lo adecuado de las políticas contables aplicadas y la razonabilidad de las estimaciones contables; concluyo sobre lo adecuado de la utilización por el propietario de la hipótesis de empresa en funcionamiento; y evalúo la presentación global, la estructura y el contenido de los estados financieros.' });
  }
  s.push({ h: 'Firma', p: (a.nombre || '[Nombre del auditor]') + '\nContador Público Autorizado, Idoneidad N.º ' + (a.idoneidad || '[número]') + '\n' + (d.ciudad || 'Panamá') + ', ' + fechaLarga(d.fechaInforme) });
  return s;
}

function textoCertificacion(emp) {
  var e = emp.encargo || {}, a = emp.auditor || {}, d = emp.dictamen || {};
  var nom = e.nombre || '[Nombre del negocio]';
  return 'Yo, ' + (a.nombre || '[Nombre del auditor]') + ', Contador Público Autorizado con Idoneidad N.º ' + (a.idoneidad || '[número]') + ', certifico que los estados financieros adjuntos de ' + nom + ', correspondientes al período terminado el ' + fechaLarga(e.fechaCierre) + ', fueron auditados por mí de conformidad con las Normas Internacionales de Auditoría y que reflejan los saldos que resultan de los libros y registros del negocio, después de los ajustes de auditoría aceptados, en los términos de mi informe de esta misma fecha.\n\nSe expide la presente certificación a solicitud del interesado en ' + (d.ciudad || 'Panamá') + ', el ' + fechaLarga(d.fechaInforme) + '.';
}

function interpretacionFinal(emp) {
  var est = estados(emp.cuentas, emp.ajustes, 'audit');
  var pre = estados(emp.cuentas, emp.ajustes, 'prelim');
  var n = est.n, o = (emp.ajustes || []).filter(function (x) { return x.estado === 'Aceptado'; });
  var ns = (emp.ajustes || []).filter(function (x) { return x.estado === 'No aceptado'; });
  var rz = razones(est);
  var rc = rz.filter(function (r) { return r.t === 'Razón corriente'; })[0];
  var mn = rz.filter(function (r) { return r.t === 'Margen neto'; })[0];
  var t = 'El negocio reporta ingresos por B/. ' + fmt(n.ing) + ' y una utilidad neta auditada de B/. ' + fmt(n.ni) + (mn && mn.v !== null ? ' (margen neto de ' + (mn.v * 100).toFixed(1) + ' %)' : '') + '. ';
  t += 'Los ajustes de auditoría aceptados cambiaron la utilidad en B/. ' + fmt(n.ni - pre.n.ni) + ' (' + o.length + ' ajustes). ';
  if (ns.length) t += 'Quedan ' + ns.length + ' diferencias no corregidas que se evalúan en el informe. ';
  if (rc && rc.v !== null) t += 'La razón corriente es de ' + rc.v.toFixed(2) + ' veces. ';
  t += 'Activos totales por B/. ' + fmt(n.activos) + ', pasivos por B/. ' + fmt(n.pasivos) + ' y patrimonio por B/. ' + fmt(n.patrimonio) + '.';
  return t;
}

/* ---------- Importación de texto pegado (Excel, CSV) ---------- */
function sugerirRubro(cod, nombre) {
  var n = String(nombre || '').toLowerCase();
  for (var i = 0; i < PISTAS_RUBRO.length; i++) {
    var claves = PISTAS_RUBRO[i][1];
    for (var j = 0; j < claves.length; j++) { if (n.indexOf(claves[j]) >= 0) return PISTAS_RUBRO[i][0]; }
  }
  return '';
}
function parseTabla(texto) {
  var lineas = String(texto || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
  if (!lineas.length) return { cuentas: [], saltadas: 0 };
  var sep = lineas[0].indexOf('\t') >= 0 ? '\t' : (lineas[0].split(';').length > lineas[0].split(',').length ? ';' : ',');
  var filas = lineas.map(function (ln) { return ln.split(sep).map(function (x) { return x.trim().replace(/^"|"$/g, ''); }); });
  /* Con o sin columna de rubro: por encabezado o por texto en la tercera columna */
  var conRubro = filas.some(function (c, i) {
    if (c.length < 4) return false;
    if (i === 0 && /rubro/i.test(c[2])) return true;
    return /[A-Za-z]/.test(c[2]) && !/^(b\/\.?|\$)?\s*[\d.,()\-\s]+$/i.test(c[2]) && !/saldo/i.test(c[2]);
  });
  var o = conRubro ? 3 : 2;
  var cuentas = [], saltadas = 0;
  filas.forEach(function (c) {
    if (c.length < o + 1) { saltadas++; return; }
    var hayNumeros = c.slice(o).some(function (x) { return /\d/.test(x); });
    var esEncabezado = /saldo|ene|c[oó]digo|cuenta/i.test(c[o]) || /c[oó]digo/i.test(c[0]);
    if (!hayNumeros || esEncabezado || (!c[0] && !c[1])) { saltadas++; return; }
    var rubro = '';
    if (conRubro && RUBRO_POR_ID[(c[2] || '').toUpperCase()]) rubro = c[2].toUpperCase();
    if (!rubro) rubro = sugerirRubro(c[0], c[1]);
    var m = [];
    for (var i = 0; i < 12; i++) m.push(num(c[o + 1 + i]));
    cuentas.push({ cod: c[0], nombre: c[1], rubro: rubro, si: num(c[o]), m: m, pa: num(c[o + 13]) });
  });
  return { cuentas: cuentas, saltadas: saltadas };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { r2: r2, num: num, fmt: fmt, acum: acum, estados: estados, comparativo: comparativo, razones: razones, materialidad: materialidad, isrPN: isrPN, validaciones: validaciones, opinionSugerida: opinionSugerida, parseTabla: parseTabla, ajustesAplicados: ajustesAplicados, diferenciasNoCorregidas: diferenciasNoCorregidas, textosInforme: textosInforme, ajusteCuadrado: ajusteCuadrado };
}
/* FIN DEL ARCHIVO calc.js */
