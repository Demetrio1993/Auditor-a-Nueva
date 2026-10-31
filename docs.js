/* docs.js - Plantillas de cartas: compromiso (NIA 210), representación (NIA 580) y recomendaciones (NIA 265) */
'use strict';

var AVISO_PLANTILLA = 'Plantilla de trabajo. Revísela y ajústela antes de firmar; no sustituye el criterio del auditor ni la revisión legal.';

function mn(n) { return 'B/. ' + fmt(n); }
function dato(v, ph) { return v && String(v).trim() ? String(v).trim() : '[' + ph + ']'; }

function cabeceraCarta(e, extra) {
  var c = e.encargo, d = e.dictamen || {};
  return dato(c.ciudad, 'ciudad') + ', ' + (extra || fechaLarga(c.fechaCarta || d.fechaInforme)) + '\n\nSeñor(a) ' + dato(c.propietario, 'propietario') + '\nPropietario de ' + dato(c.nombre, 'nombre del negocio') + '\n' + dato(c.ciudad, 'ciudad') + '\n\n';
}

function cartaCompromiso(e) {
  var c = e.encargo, a = e.auditor || ESTADO.auditor || {};
  var nom = dato(c.nombre, 'nombre del negocio'), cierre = fechaLarga(c.fechaCierre), marco = c.marco || 'NIIF para las PYMES';
  var hon = c.honorarios ? mn(c.honorarios) : '[honorarios]';
  var t = cabeceraCarta(e, fechaLarga(c.fechaCarta));
  t += 'Estimado(a) señor(a) ' + dato(c.propietario, 'propietario') + ':\n\n';
  t += 'Asunto: Carta de compromiso para la auditoría de los estados financieros por el período terminado el ' + cierre + '\n\n';
  t += 'Esta carta confirma los términos en que acepto el encargo de auditar los estados financieros de ' + nom + ', que comprenden el balance general al ' + cierre + ', el estado de resultados, el estado de cambios en el patrimonio y el estado de flujos de efectivo por el período terminado en esa fecha, con las notas que incluyen un resumen de las políticas contables significativas.\n\n';
  t += '1. Objetivo y alcance. El objetivo de la auditoría es expresar una opinión sobre si los estados financieros presentan razonablemente, en todos los aspectos materiales, la situación financiera y el desempeño de ' + nom + ', de conformidad con ' + marco + '. La auditoría se realizará de conformidad con las Normas Internacionales de Auditoría (NIA).\n\n';
  t += '2. Responsabilidades del auditor. Planificaré y ejecutaré la auditoría para obtener una seguridad razonable de que los estados financieros están libres de incorrección material, debida a fraude o error. Por las limitaciones inherentes a una auditoría y al control interno, existe un riesgo inevitable de que algunas incorrecciones materiales no se detecten, aun cuando la auditoría se planifique y ejecute correctamente. Comunicaré por escrito las deficiencias significativas de control interno que identifique.\n\n';
  t += '3. Responsabilidades del propietario. Usted es responsable de la preparación y presentación razonable de los estados financieros de conformidad con ' + marco + '; del control interno necesario para prepararlos libres de incorrección material; de proporcionarme acceso a toda la información relevante, a los libros, registros, documentos de soporte y estados de cuenta bancarios; de permitirme las indagaciones necesarias con el personal, los asesores y las entidades financieras; y de entregarme una carta de representación al finalizar la auditoría.\n\n';
  t += '4. Marco de información y tributario. Los estados financieros se preparan sobre la base del devengado y en balboas (B/.). ' + (c.itbms === 'Sí' ? 'El negocio es contribuyente del ITBMS y las pruebas incluirán sus declaraciones y el crédito fiscal. ' : 'El negocio no es contribuyente del ITBMS. ') + 'La auditoría no incluye una revisión exhaustiva del cumplimiento de todas las obligaciones tributarias, laborales o de seguridad social, salvo en lo que afecte a los estados financieros.\n\n';
  t += '5. Informe. Emitiré un informe de auditoría con mi opinión, que podrá ser favorable, con salvedades, desfavorable o una abstención, según la evidencia obtenida. Si las circunstancias lo exigen, me reservo el derecho de modificar el informe o renunciar al encargo.\n\n';
  t += '6. Plazos. Iniciaré el trabajo una vez recibida la balanza de comprobación, los libros y los soportes solicitados' + (c.fechaEntrega ? ', y entregaré el informe a más tardar el ' + fechaLarga(c.fechaEntrega) : ', y entregaré el informe en la fecha que acordemos [fecha de entrega]') + ', siempre que la información se reciba a tiempo.\n\n';
  t += '7. Honorarios. Los honorarios por este encargo son de ' + hon + ' [condiciones de pago]. Los gastos en que incurra se facturarán por separado, previa aprobación suya.\n\n';
  t += '8. Confidencialidad. Mantendré la reserva de la información que conozca por este encargo, salvo que una ley o una autoridad competente exija revelarla.\n\n';
  t += 'Le ruego firmar y devolverme una copia de esta carta para confirmar que está de acuerdo con los términos del encargo.\n\nAtentamente,\n\n\n' + dato(a.nombre, 'nombre del auditor') + '\nContador Público Autorizado, Idoneidad N.º ' + dato(a.idoneidad, 'número') + '\n\n\nAceptado y de acuerdo:\n\n\n' + dato(c.propietario, 'propietario') + '\nPropietario de ' + nom + '\nFecha: ____________________\n';
  return t;
}

function listaNoCorregidas(e) {
  var l = (e.ajustes || []).filter(function (a) { return a.estado === 'No aceptado'; });
  if (!l.length) return '   Ninguna.';
  return l.map(function (a, i) {
    var q = ajusteCuadrado(a);
    return '   ' + (i + 1) + '. ' + a.n + ': ' + (a.descripcion || 'sin descripción') + ' (monto ' + mn(q.debe) + ').';
  }).join('\n');
}

function cartaRepresentacion(e) {
  var c = e.encargo, d = e.dictamen || {}, a = e.auditor || ESTADO.auditor || {};
  var nom = dato(c.nombre, 'nombre del negocio'), cierre = fechaLarga(c.fechaCierre), marco = c.marco || 'NIIF para las PYMES';
  var t = dato(c.ciudad, 'ciudad') + ', ' + fechaLarga(d.fechaInforme) + '\n\n' + dato(a.nombre, 'nombre del auditor') + '\nContador Público Autorizado\n\n';
  t += 'Asunto: Carta de representación sobre los estados financieros de ' + nom + ' al ' + cierre + '\n\n';
  t += 'Esta carta se entrega en relación con la auditoría de los estados financieros de ' + nom + ' por el período terminado el ' + cierre + ', con el fin de que usted exprese una opinión sobre si presentan razonablemente, en todos los aspectos materiales, su situación financiera, su desempeño y sus flujos de efectivo, de conformidad con ' + marco + '.\n\n';
  t += 'Confirmo, según mi mejor saber y entender y después de hacer las indagaciones necesarias, que:\n\n';
  t += 'Estados financieros\n';
  t += '1. He cumplido mi responsabilidad de preparar los estados financieros de conformidad con ' + marco + ', y de mantener el control interno necesario para prepararlos libres de incorrección material.\n';
  t += '2. Las estimaciones contables, incluidas las medidas a valor razonable, son razonables.\n';
  t += '3. Las transacciones con partes relacionadas, incluidos mis aportes y retiros como propietario, están registradas y reveladas adecuadamente.\n';
  t += '4. Los hechos ocurridos después de la fecha de los estados financieros que requerían ajuste o revelación han sido ajustados o revelados.\n\n';
  t += 'Información proporcionada\n';
  t += '5. Le he dado acceso a toda la información relevante, a los libros, registros y documentos de soporte, y a las personas de quienes consideró necesario obtener evidencia.\n';
  t += '6. Todas las transacciones están registradas en los libros y reflejadas en los estados financieros.\n';
  t += '7. Le he informado de los resultados de mi evaluación del riesgo de que los estados financieros contengan incorrecciones materiales por fraude, y de cualquier fraude o sospecha de fraude de que tengo conocimiento.\n';
  t += '8. Le he informado de todo incumplimiento o sospecha de incumplimiento de leyes y reglamentos cuyos efectos deban considerarse al preparar los estados financieros.\n';
  t += '9. Todas las cuentas bancarias, cuentas por cobrar y por pagar, y los compromisos y contingencias de los que tengo conocimiento han sido informados.\n\n';
  t += 'Impuestos y obligaciones\n';
  t += '10. Las declaraciones de impuestos del período fueron presentadas y los impuestos exigibles están pagados o registrados como pasivo' + (c.itbms === 'Sí' ? ', incluidas las declaraciones del ITBMS' : '') + '.\n';
  t += '11. Las obligaciones de seguridad social y demás cargas laborales están al día o registradas.\n\n';
  t += 'Continuidad\n';
  t += '12. No tengo conocimiento de hechos o condiciones que pongan en duda la capacidad del negocio para continuar como empresa en funcionamiento.\n\n';
  t += 'Diferencias no corregidas\n';
  t += '13. Los efectos de las incorrecciones no corregidas, que usted me ha comunicado, son inmateriales, individualmente y en conjunto, para los estados financieros en su conjunto. Esas diferencias son:\n' + listaNoCorregidas(e) + '\n\n';
  t += 'Atentamente,\n\n\n' + dato(c.propietario, 'propietario') + '\nPropietario de ' + nom + '\n';
  return t;
}

var RECOMENDACION_PRUEBA = {
  T1: ['Registro de asientos', 'Restringir el registro de asientos manuales al horario laboral, o exigir autorización y bitácora de los registrados fuera de él.'],
  T2: ['Registro de asientos', 'Autorizar de antemano el registro en fines de semana y feriados y dejar constancia del motivo.'],
  T3: ['Cierre contable', 'Exigir aprobación del propietario y soporte documental para los ajustes cercanos al cierre, y usar una lista de verificación de cierre.'],
  T4: ['Compras y pagos', 'Validar el RUC y el número de factura antes de registrar o pagar, y marcar las facturas pagadas para evitar duplicados.'],
  T5: ['Ventas y facturación', 'Controlar la numeración de las facturas emitidas, documentar las anuladas y conciliarlas cada mes con el reporte de facturación electrónica de la DGI.'],
  T6: ['Gastos', 'Exigir factura o soporte para cada gasto y evitar estimaciones redondeadas sin documento.'],
  T7: ['Gastos', 'Revisar los pagos repetidos del mismo monto y documentar los contratos recurrentes.'],
  T8: ['Gastos', 'Investigar las cuentas cuyo patrón de dígitos se aleja de lo esperado y aplicar muestreo dirigido.'],
  T9: ['Sistema contable', 'Corregir los descuadres y las descripciones faltantes y bloquear los períodos ya cerrados.'],
  T10: ['Sistema contable', 'Conciliar cada mes el diario con la balanza y documentar las diferencias.']
};

/* Observaciones sugeridas a partir de lo que el auditor marcó como hallazgo y de los ajustes aceptados */
function observacionesSugeridas(e) {
  var out = [], vistos = {};
  var res = analizarDiario(e);
  res.alertas.forEach(function (al) {
    if (revisionDe(e, al.k).estado !== 'Hallazgo' || vistos[al.p]) return;
    vistos[al.p] = 1;
    var r = RECOMENDACION_PRUEBA[al.p], pr = PRUEBAS_DIARIO.filter(function (x) { return x.id === al.p; })[0];
    out.push({ area: r[0], obs: pr.t + ': ' + al.titulo + (res.alertas.filter(function (z) { return z.p === al.p && revisionDe(e, z.k).estado === 'Hallazgo'; }).length > 1 ? ' y otros casos similares.' : '.'), riesgo: al.nivel, rec: r[1], resp: '' });
  });
  (e.ajustes || []).filter(function (a) { return a.estado === 'Aceptado'; }).forEach(function (a) {
    out.push({ area: a.rubro && RUBRO_POR_ID[a.rubro] ? RUBRO_POR_ID[a.rubro].nombre : 'Registros contables', obs: 'La auditoría propuso el ajuste ' + a.n + ': ' + (a.descripcion || 'sin descripción') + '.', riesgo: 'Medio', rec: 'Revisar el proceso que originó la diferencia y registrar las transacciones de este tipo en el mes en que ocurren.', resp: '' });
  });
  return out;
}

function cartaRecomendaciones(e) {
  var c = e.encargo, d = e.dictamen || {}, a = e.auditor || ESTADO.auditor || {};
  var nom = dato(c.nombre, 'nombre del negocio'), obs = (e.cartas && e.cartas.obs) || [];
  var t = cabeceraCarta(e, fechaLarga(d.fechaInforme));
  t += 'Estimado(a) señor(a) ' + dato(c.propietario, 'propietario') + ':\n\n';
  t += 'Asunto: Comunicación de deficiencias de control interno y recomendaciones, auditoría al ' + fechaLarga(c.fechaCierre) + '\n\n';
  t += 'Al auditar los estados financieros de ' + nom + ' consideré el control interno relevante para su preparación, con el fin de diseñar procedimientos de auditoría adecuados y no para opinar sobre su eficacia. Por eso, las observaciones siguientes se limitan a las que llegaron a mi conocimiento durante la auditoría y no son una lista completa de todas las deficiencias que pudieran existir.\n\n';
  if (!obs.length) t += '[Agregue las observaciones en el módulo Cartas]\n\n';
  obs.forEach(function (o, i) {
    t += (i + 1) + '. ' + dato(o.area, 'área') + ' (riesgo ' + (o.riesgo || 'Medio').toLowerCase() + ')\n   Observación: ' + dato(o.obs, 'observación') + '\n   Recomendación: ' + dato(o.rec, 'recomendación') + '\n' + (o.resp ? '   Respuesta del propietario: ' + o.resp + '\n' : '') + '\n';
  });
  t += 'Esta comunicación es solo para su uso y no debe entregarse a terceros sin mi autorización. Quedo a su disposición para comentar estas observaciones.\n\nAtentamente,\n\n\n' + dato(a.nombre, 'nombre del auditor') + '\nContador Público Autorizado, Idoneidad N.º ' + dato(a.idoneidad, 'número') + '\n';
  return t;
}

var CARTAS = [
  { id: 'comp', t: 'Carta de compromiso', n: 'NIA 210', f: cartaCompromiso },
  { id: 'repr', t: 'Carta de representación', n: 'NIA 580', f: cartaRepresentacion },
  { id: 'reco', t: 'Carta de recomendaciones', n: 'NIA 265', f: cartaRecomendaciones }
];
function textoCarta(e, id) {
  var ov = e.cartas && e.cartas.txt && e.cartas.txt[id];
  if (ov != null && ov !== '') return ov;
  return CARTAS.filter(function (c) { return c.id === id; })[0].f(e);
}
/* FIN DEL ARCHIVO docs.js */
