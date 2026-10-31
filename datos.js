/* datos.js - Rubros, programa de pruebas y textos base de la app de auditoría */
'use strict';

/* Secciones de los estados financieros */
var SECCIONES = {
  AC:  { nombre: 'Activo corriente',        estado: 'BG', lado: 'A' },
  ANC: { nombre: 'Activo no corriente',     estado: 'BG', lado: 'A' },
  PC:  { nombre: 'Pasivo corriente',        estado: 'BG', lado: 'P' },
  PNC: { nombre: 'Pasivo no corriente',     estado: 'BG', lado: 'P' },
  PAT: { nombre: 'Patrimonio del propietario', estado: 'BG', lado: 'P' },
  ING: { nombre: 'Ingresos',                estado: 'ER' },
  COS: { nombre: 'Costo de ventas o servicios', estado: 'ER' },
  GOP: { nombre: 'Gastos de operación',     estado: 'ER' },
  GDP: { nombre: 'Depreciación',            estado: 'ER' },
  OIN: { nombre: 'Otros ingresos',          estado: 'ER' },
  GFI: { nombre: 'Gastos financieros',      estado: 'ER' },
  GIS: { nombre: 'Impuesto sobre la renta', estado: 'ER' }
};

/* Rubros: flujo = efectivo | op | inv | fin | dep (solo el gasto de depreciación) */
var RUBROS = [
  { id: 'EFE',  nombre: 'Efectivo y equivalentes',                 sec: 'AC',  flujo: 'efectivo' },
  { id: 'CXC',  nombre: 'Cuentas por cobrar clientes',             sec: 'AC',  flujo: 'op' },
  { id: 'OCC',  nombre: 'Otras cuentas por cobrar',                sec: 'AC',  flujo: 'op' },
  { id: 'INV',  nombre: 'Inventarios',                             sec: 'AC',  flujo: 'op' },
  { id: 'ANT',  nombre: 'Gastos pagados por anticipado',           sec: 'AC',  flujo: 'op' },
  { id: 'IMPA', nombre: 'Anticipos y créditos de impuestos',       sec: 'AC',  flujo: 'op' },
  { id: 'PPE',  nombre: 'Propiedad, planta y equipo (costo)',      sec: 'ANC', flujo: 'inv' },
  { id: 'DEPA', nombre: 'Depreciación acumulada',                  sec: 'ANC', flujo: 'inv' },
  { id: 'INT',  nombre: 'Activos intangibles',                     sec: 'ANC', flujo: 'inv' },
  { id: 'OANC', nombre: 'Otros activos no corrientes',             sec: 'ANC', flujo: 'inv' },
  { id: 'CXP',  nombre: 'Cuentas por pagar proveedores',           sec: 'PC',  flujo: 'op' },
  { id: 'ACR',  nombre: 'Gastos acumulados por pagar',             sec: 'PC',  flujo: 'op' },
  { id: 'LAB',  nombre: 'Obligaciones laborales y cargas sociales', sec: 'PC', flujo: 'op' },
  { id: 'IMPP', nombre: 'Impuestos por pagar',                     sec: 'PC',  flujo: 'op' },
  { id: 'PRC',  nombre: 'Préstamos a corto plazo',                 sec: 'PC',  flujo: 'fin' },
  { id: 'CXPP', nombre: 'Cuentas por pagar al propietario',        sec: 'PC',  flujo: 'fin' },
  { id: 'PRL',  nombre: 'Préstamos a largo plazo',                 sec: 'PNC', flujo: 'fin' },
  { id: 'CAP',  nombre: 'Capital del propietario',                 sec: 'PAT', flujo: 'fin' },
  { id: 'URE',  nombre: 'Utilidades retenidas',                    sec: 'PAT', flujo: 'fin' },
  { id: 'RET',  nombre: 'Retiros del propietario',                 sec: 'PAT', flujo: 'fin' },
  { id: 'ING',  nombre: 'Ingresos por servicios',                  sec: 'ING', flujo: 'er' },
  { id: 'COS',  nombre: 'Costo de ventas o servicios',             sec: 'COS', flujo: 'er' },
  { id: 'GOP',  nombre: 'Gastos de operación',                     sec: 'GOP', flujo: 'er' },
  { id: 'GDEP', nombre: 'Gasto de depreciación',                   sec: 'GDP', flujo: 'dep' },
  { id: 'OIN',  nombre: 'Otros ingresos',                          sec: 'OIN', flujo: 'er' },
  { id: 'GFI',  nombre: 'Gastos financieros',                      sec: 'GFI', flujo: 'er' },
  { id: 'GISR', nombre: 'Gasto de impuesto sobre la renta',        sec: 'GIS', flujo: 'er' }
];

var RUBRO_POR_ID = {};
RUBROS.forEach(function (r) { RUBRO_POR_ID[r.id] = r; });

var MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/* Palabras clave para sugerir el rubro de una cuenta al importar */
var PISTAS_RUBRO = [
  ['EFE',  ['caja', 'banco', 'efectivo', 'cuenta corriente', 'cuenta de ahorro']],
  ['DEPA', ['depreciacion acumulada', 'depreciación acumulada', 'deprec. acum', 'dep. acum']],
  ['GDEP', ['gasto de depreciacion', 'gasto de depreciación', 'depreciacion del', 'depreciación del', 'amortizacion', 'amortización']],
  ['CXC',  ['cuentas por cobrar clientes', 'clientes', 'cuentas por cobrar comerciales']],
  ['OCC',  ['otras cuentas por cobrar', 'por cobrar', 'anticipo a empleados', 'prestamo a empleados']],
  ['INV',  ['inventario', 'mercancia', 'mercancía']],
  ['ANT',  ['pagado por anticipado', 'pagados por anticipado', 'seguro pagado', 'alquiler pagado']],
  ['IMPA', ['anticipo de impuesto', 'itbms por cobrar', 'credito fiscal', 'crédito fiscal', 'isr pagado', 'renta estimada']],
  ['PPE',  ['equipo', 'mobiliario', 'vehiculo', 'vehículo', 'edificio', 'terreno', 'maquinaria', 'propiedad']],
  ['INT',  ['intangible', 'software', 'licencia', 'marca']],
  ['CXP',  ['proveedores', 'cuentas por pagar comerciales', 'cuentas por pagar proveedores']],
  ['LAB',  ['seguro social', 'seguro educativo', 'decimo tercer', 'décimo tercer', 'vacaciones', 'prima de antiguedad', 'prima de antigüedad', 'prestaciones', 'salarios por pagar']],
  ['IMPP', ['isr por pagar', 'impuesto sobre la renta por pagar', 'itbms por pagar', 'impuestos por pagar']],
  ['ACR',  ['acumulad', 'por pagar']],
  ['PRC',  ['prestamo corto', 'préstamo corto', 'sobregiro', 'tarjeta de credito', 'tarjeta de crédito']],
  ['PRL',  ['prestamo largo', 'préstamo largo', 'hipoteca']],
  ['CXPP', ['propietario por pagar', 'cuenta con el propietario', 'cuenta del propietario']],
  ['RET',  ['retiro']],
  ['URE',  ['utilidades retenidas', 'utilidad retenida', 'resultados acumulados']],
  ['CAP',  ['capital', 'aporte']],
  ['COS',  ['costo de venta', 'costo de servicio', 'costo de ventas']],
  ['GISR', ['impuesto sobre la renta', 'gasto de isr']],
  ['GFI',  ['interes', 'interés', 'comision bancaria', 'comisión bancaria', 'gastos financieros']],
  ['OIN',  ['otros ingresos', 'ingreso financiero', 'ingresos financieros', 'ganancia']],
  ['ING',  ['ingreso', 'honorario', 'servicio prestado', 'ventas']],
  ['GOP',  ['gasto', 'salario', 'alquiler', 'honorarios profesionales', 'luz', 'agua', 'telefono', 'teléfono', 'internet', 'papeleria', 'papelería', 'combustible', 'mantenimiento', 'publicidad', 'viatico', 'viático']]
];

/* Programa de pruebas por rubro: objetivo, procedimientos, documentos e instrucciones */
var PROGRAMA = {
  EFE: {
    ref: 'A-1',
    objetivo: 'Comprobar que el efectivo y los depósitos existen, están completos, pertenecen al negocio y están bien medidos al cierre.',
    aserciones: 'Existencia, integridad, derechos, valuación',
    procedimientos: [
      'Obtener confirmación bancaria directa de todas las cuentas y préstamos, incluidas las que estén a nombre del propietario y se usen para el negocio',
      'Recalcular la conciliación bancaria de cada cuenta al cierre y seguir las partidas en tránsito hasta los estados de cuenta posteriores',
      'Hacer arqueo de caja sorpresivo, con acta firmada, y cotejarlo con el saldo en libros',
      'Probar el corte: cheques emitidos y depósitos de los últimos y primeros días',
      'Revisar transferencias o depósitos inusuales y confirmar que no mezclan gastos personales con los del negocio'
    ],
    documentos: ['Estados de cuenta del mes de cierre y del mes siguiente', 'Conciliaciones bancarias', 'Confirmación bancaria', 'Acta de arqueo de caja'],
    instrucciones: 'Anote saldo según banco, partidas conciliatorias y saldo en libros. Toda diferencia sin explicar mayor a la materialidad de ejecución se propone como ajuste.'
  },
  CXC: {
    ref: 'B-1',
    objetivo: 'Comprobar que los saldos de clientes existen, son cobrables y están bien cortados al cierre.',
    aserciones: 'Existencia, derechos, valuación, corte',
    procedimientos: [
      'Preparar la antigüedad de saldos y cotejarla con el mayor',
      'Confirmar por escrito los saldos de los clientes de mayor monto; donde no haya respuesta, aplicar procedimientos alternativos con cobros posteriores',
      'Revisar los cobros posteriores al cierre hasta la fecha de trabajo',
      'Evaluar la pérdida esperada o el deterioro de saldos vencidos',
      'Probar el corte de ingresos con las facturas y cobros de los últimos y primeros días'
    ],
    documentos: ['Antigüedad de saldos', 'Facturas fiscales emitidas', 'Estados de cuenta de clientes', 'Recibos y depósitos posteriores'],
    instrucciones: 'Registre saldo confirmado y diferencias por cliente. Los saldos sin respaldo ni cobro posterior se evalúan para provisión o salvedad.'
  },
  OCC: {
    ref: 'B-2',
    objetivo: 'Comprobar la naturaleza y recuperabilidad de otras cuentas por cobrar, incluidas las del propietario o de terceros.',
    aserciones: 'Existencia, valuación, presentación',
    procedimientos: [
      'Obtener el detalle por deudor y cotejarlo con el mayor',
      'Revisar el soporte de cada partida (contrato, recibo, autorización)',
      'Confirmar con el deudor o verificar cobros posteriores',
      'Determinar si el saldo debe clasificarse como corriente o no corriente'
    ],
    documentos: ['Detalle por deudor', 'Contratos o pagarés', 'Recibos de cobro'],
    instrucciones: 'Si el deudor es el propietario, evalúe si corresponde a un retiro y proponga la reclasificación.'
  },
  INV: {
    ref: 'C-1',
    objetivo: 'Comprobar existencia, propiedad y valuación del inventario al menor entre costo y valor neto realizable.',
    aserciones: 'Existencia, integridad, valuación',
    procedimientos: [
      'Observar el conteo físico al cierre o hacer un conteo de prueba y conciliarlo con el kardex',
      'Probar el costeo con facturas de compra y el método de costo usado',
      'Comparar el costo con el valor neto realizable de las partidas de lenta rotación',
      'Probar el corte de compras y ventas alrededor del cierre'
    ],
    documentos: ['Hojas de conteo', 'Kardex', 'Facturas de compra'],
    instrucciones: 'Si el negocio es de servicios y el saldo es mínimo, documente la razón y concluya sobre el monto.'
  },
  ANT: {
    ref: 'C-2',
    objetivo: 'Comprobar que los pagos anticipados están respaldados y se amortizan en el período que corresponde.',
    aserciones: 'Existencia, valuación, corte',
    procedimientos: [
      'Obtener el detalle y recalcular la amortización mensual',
      'Cotejar cada partida con la factura y el contrato o póliza',
      'Verificar que lo ya consumido no quede como activo'
    ],
    documentos: ['Facturas y pólizas', 'Cuadro de amortización'],
    instrucciones: 'La parte consumida y no amortizada se propone como ajuste contra gasto.'
  },
  IMPA: {
    ref: 'C-3',
    objetivo: 'Comprobar los pagos anticipados de impuestos y créditos fiscales que el negocio dice tener a su favor.',
    aserciones: 'Existencia, valuación',
    procedimientos: [
      'Cotejar cada pago con recibos de la DGI o la entidad correspondiente',
      'Verificar que el crédito sea aplicable y no esté ya compensado en otra declaración',
      'Recalcular el saldo contra la declaración de renta'
    ],
    documentos: ['Recibos de pago de la DGI', 'Declaración de renta', 'Estados de cuenta del contribuyente'],
    instrucciones: 'Un crédito que no se pueda respaldar se evalúa para ajuste o salvedad.'
  },
  PPE: {
    ref: 'D-1',
    objetivo: 'Comprobar existencia, propiedad, altas, bajas y medición de la propiedad, planta y equipo.',
    aserciones: 'Existencia, derechos, valuación',
    procedimientos: [
      'Preparar el movimiento del período: saldo inicial, altas, bajas y saldo final',
      'Cotejar las altas con facturas fiscales y comprobar que se capitalizan correctamente',
      'Inspeccionar físicamente una selección de bienes',
      'Verificar la propiedad con factura, título, registro o tarjeta de circulación',
      'Revisar bajas, ventas y su efecto en resultados'
    ],
    documentos: ['Auxiliar de activos fijos', 'Facturas de compra', 'Escrituras o títulos', 'Fotos o acta de inspección'],
    instrucciones: 'Anote la vida útil y el método por categoría. Las compras que no cumplan para capitalizarse se reclasifican a gasto.'
  },
  DEPA: {
    ref: 'D-2',
    objetivo: 'Comprobar que la depreciación acumulada y el gasto del período están bien calculados.',
    aserciones: 'Valuación, exactitud',
    procedimientos: [
      'Recalcular la depreciación de cada bien con su costo, vida útil y fecha de uso',
      'Conciliar el gasto del período con el estado de resultados',
      'Revisar vidas útiles y valores residuales',
      'Verificar que las bajas retiren su depreciación acumulada'
    ],
    documentos: ['Cuadro de depreciación', 'Auxiliar de activos'],
    instrucciones: 'Diferencias de recálculo sobre la trivialidad se anotan y se proponen como ajuste.'
  },
  INT: {
    ref: 'D-3',
    objetivo: 'Comprobar que los intangibles cumplen las condiciones para reconocerse como activo y se amortizan.',
    aserciones: 'Existencia, derechos, valuación',
    procedimientos: [
      'Cotejar cada intangible con su contrato o licencia',
      'Recalcular la amortización acumulada y del período',
      'Evaluar si hay indicios de deterioro'
    ],
    documentos: ['Licencias y contratos', 'Cuadro de amortización'],
    instrucciones: 'Si el desembolso no cumple condiciones de reconocimiento, proponga el ajuste contra gasto.'
  },
  OANC: {
    ref: 'D-4',
    objetivo: 'Comprobar depósitos en garantía y otros activos de largo plazo.',
    aserciones: 'Existencia, valuación, clasificación',
    procedimientos: [
      'Cotejar cada depósito con el contrato que lo originó',
      'Confirmar con la contraparte los saldos de mayor monto',
      'Revisar la clasificación entre corriente y no corriente'
    ],
    documentos: ['Contratos de alquiler o servicio', 'Recibos del depósito', 'Confirmación de la contraparte'],
    instrucciones: 'Documente la fecha esperada de recuperación para la clasificación.'
  },
  CXP: {
    ref: 'E-1',
    objetivo: 'Comprobar que los saldos con proveedores están completos y bien medidos, y buscar pasivos no registrados.',
    aserciones: 'Integridad, obligaciones, valuación, corte',
    procedimientos: [
      'Obtener el detalle por proveedor y cotejarlo con el mayor',
      'Conciliar con estados de cuenta o confirmaciones de los proveedores principales',
      'Buscar pasivos no registrados con los pagos y facturas posteriores al cierre',
      'Probar el corte de compras y gastos'
    ],
    documentos: ['Detalle por proveedor', 'Estados de cuenta de proveedores', 'Facturas y pagos posteriores'],
    instrucciones: 'Cada factura del período que aparezca después del cierre y no esté registrada se propone como ajuste.'
  },
  ACR: {
    ref: 'E-2',
    objetivo: 'Comprobar que los gastos devengados y no pagados están registrados y bien calculados.',
    aserciones: 'Integridad, valuación, corte',
    procedimientos: [
      'Obtener el detalle de cada acumulación y su base de cálculo',
      'Recalcular los montos y cotejarlos con contratos o facturas posteriores',
      'Revisar si falta algún gasto devengado (servicios, honorarios, intereses)'
    ],
    documentos: ['Detalle de acumulaciones', 'Contratos', 'Facturas posteriores'],
    instrucciones: 'Anote cualquier gasto devengado que falte y su monto estimado.'
  },
  LAB: {
    ref: 'E-3',
    objetivo: 'Comprobar las obligaciones laborales y cargas sociales: Caja de Seguro Social, seguro educativo, décimo tercer mes, vacaciones y prestaciones.',
    aserciones: 'Integridad, obligaciones, valuación',
    procedimientos: [
      'Cotejar planillas y salarios con el mayor de gastos de personal',
      'Recalcular cuotas obrero-patronales y seguro educativo y verificar su pago',
      'Recalcular la provisión del décimo tercer mes (pagos de abril, agosto y diciembre) y de vacaciones',
      'Revisar prima de antigüedad e indemnización según el Código de Trabajo',
      'Si no hay empleados, confirmarlo con planillas de la CSS y documentar la conclusión'
    ],
    documentos: ['Planillas de la CSS', 'Recibos de pago de cuotas', 'Contratos de trabajo', 'Cálculo de provisiones'],
    instrucciones: 'Registre cada diferencia de recálculo. Las cargas sociales no pagadas al cierre deben estar como pasivo.'
  },
  IMPP: {
    ref: 'E-4',
    objetivo: 'Comprobar el impuesto por pagar y su cálculo, incluido el ISR de persona natural y los demás impuestos.',
    aserciones: 'Integridad, obligaciones, valuación',
    procedimientos: [
      'Conciliar la utilidad contable con la renta gravable',
      'Recalcular el ISR con la tabla de persona natural: sin impuesto hasta B/. 11,000; 15 % sobre el exceso hasta B/. 50,000; B/. 5,850 más 25 % sobre el exceso de B/. 50,000',
      'Cotejar declaraciones presentadas y recibos de pago',
      'Confirmar si el negocio es o no contribuyente del ITBMS según su actividad e ingresos (verificar el umbral vigente con la DGI)',
      'Recalcular el seguro educativo y otras cargas calculadas sobre el ingreso'
    ],
    documentos: ['Declaración de renta', 'Recibos de pago DGI', 'Paz y salvo de la DGI', 'Cálculo del impuesto'],
    instrucciones: 'Use el cálculo esperado de ISR del módulo 3. La diferencia contra el saldo en libros se evalúa para ajuste.'
  },
  PRC: {
    ref: 'F-1',
    objetivo: 'Comprobar préstamos y financiamientos de corto plazo y sus intereses.',
    aserciones: 'Existencia, integridad, valuación, presentación',
    procedimientos: [
      'Confirmar saldos, tasas y garantías con el acreedor',
      'Recalcular intereses devengados con la tabla de amortización',
      'Verificar la clasificación del vencimiento corriente',
      'Revisar condiciones o cláusulas incumplidas'
    ],
    documentos: ['Contrato de préstamo', 'Tabla de amortización', 'Confirmación del acreedor', 'Estados de cuenta'],
    instrucciones: 'Diferencias contra la confirmación se anotan y se proponen como ajuste.'
  },
  CXPP: {
    ref: 'F-2',
    objetivo: 'Comprobar las cuentas con el propietario y su naturaleza (préstamo o aporte).',
    aserciones: 'Existencia, presentación, partes relacionadas',
    procedimientos: [
      'Obtener el auxiliar de movimientos con el propietario',
      'Determinar la naturaleza de cada partida con documentos o declaración escrita del propietario',
      'Revelar las transacciones como partes relacionadas',
      'Confirmar el saldo por escrito con el propietario'
    ],
    documentos: ['Auxiliar de la cuenta', 'Confirmación escrita del propietario', 'Soportes de cada movimiento'],
    instrucciones: 'Reclasifique a capital o retiros lo que no sea un préstamo exigible.'
  },
  PRL: {
    ref: 'F-3',
    objetivo: 'Comprobar préstamos de largo plazo, su porción corriente y sus condiciones.',
    aserciones: 'Existencia, valuación, presentación',
    procedimientos: [
      'Confirmar saldo y condiciones con el acreedor',
      'Recalcular intereses y la porción corriente',
      'Revisar garantías y cláusulas, y revelarlas',
      'Verificar la clasificación entre corriente y no corriente'
    ],
    documentos: ['Contrato de préstamo', 'Tabla de amortización', 'Confirmación del acreedor'],
    instrucciones: 'Reclasifique la porción que vence en los siguientes 12 meses al pasivo corriente.'
  },
  CAP: {
    ref: 'G-1',
    objetivo: 'Comprobar el capital o aportes del propietario.',
    aserciones: 'Existencia, derechos, presentación',
    procedimientos: [
      'Conciliar el saldo con el cierre auditado o declarado del año anterior',
      'Cotejar los aportes del período con depósitos o transferencias',
      'Obtener declaración escrita del propietario sobre el capital'
    ],
    documentos: ['Estados financieros anteriores', 'Depósitos de aportes', 'Declaración del propietario'],
    instrucciones: 'Todo aporte sin documento queda como salvedad hasta tener el soporte.'
  },
  URE: {
    ref: 'G-2',
    objetivo: 'Comprobar que las utilidades retenidas inician igual al cierre del año anterior y que sus movimientos están justificados.',
    aserciones: 'Integridad, exactitud, presentación',
    procedimientos: [
      'Conciliar el saldo inicial con el cierre del año anterior y con la declaración de renta',
      'Revisar cualquier movimiento del período y su autorización',
      'Verificar que las correcciones de años anteriores se presenten según la norma'
    ],
    documentos: ['Balance de cierre anterior', 'Asientos de cierre', 'Declaración de renta anterior'],
    instrucciones: 'Un saldo inicial que no concilia con el año anterior se informa como salvedad en el dictamen.'
  },
  RET: {
    ref: 'G-3',
    objetivo: 'Comprobar los retiros del propietario y que no incluyan gastos del negocio ni se hayan llevado a gasto.',
    aserciones: 'Presentación, exactitud, clasificación',
    procedimientos: [
      'Obtener el detalle de retiros con fecha, monto y forma de pago',
      'Cotejar cada retiro con el estado de cuenta bancario',
      'Verificar que gastos personales no estén deducidos como gastos del negocio'
    ],
    documentos: ['Detalle de retiros', 'Estados de cuenta', 'Autorización del propietario'],
    instrucciones: 'Los gastos personales dentro de los gastos del negocio se reclasifican a retiros.'
  },
  ING: {
    ref: 'P-1',
    objetivo: 'Comprobar que los ingresos por servicios están completos, ocurrieron y se reconocen en el período correcto.',
    aserciones: 'Ocurrencia, integridad, corte, clasificación',
    procedimientos: [
      'Hacer análisis mensual de ingresos y explicar variaciones inusuales',
      'Cotejar los ingresos del mayor con las facturas fiscales electrónicas emitidas en el período',
      'Probar una selección de ingresos contra contratos, facturas y cobros',
      'Probar el corte en los últimos y primeros días del período',
      'Verificar la clasificación de ingresos exentos, no gravados o de fuente extranjera según la declaración de renta'
    ],
    documentos: ['Facturas fiscales electrónicas', 'Contratos de servicio', 'Estados de cuenta bancarios', 'Reporte de ventas de la DGI'],
    instrucciones: 'Los ingresos cobrados y no facturados, o facturados y no registrados, se anotan y se proponen como ajuste.'
  },
  COS: {
    ref: 'P-2',
    objetivo: 'Comprobar que el costo directo de los servicios corresponde al período y a los ingresos reconocidos.',
    aserciones: 'Ocurrencia, integridad, corte',
    procedimientos: [
      'Analizar el margen mensual contra el período anterior',
      'Probar una selección de costos con factura y contrato',
      'Probar el corte de costos'
    ],
    documentos: ['Facturas de proveedores', 'Contratos', 'Detalle del costo'],
    instrucciones: 'Si no existe costo directo, documente la naturaleza del negocio y concluya.'
  },
  GOP: {
    ref: 'P-3',
    objetivo: 'Comprobar que los gastos de operación ocurrieron, pertenecen al negocio, están soportados y pertenecen al período.',
    aserciones: 'Ocurrencia, integridad, corte, clasificación',
    procedimientos: [
      'Analizar los gastos por cuenta y por mes contra el período anterior',
      'Probar una selección con factura fiscal a nombre del negocio y verificar que sea gasto necesario para producir la renta',
      'Detectar gastos personales y de capital llevados a resultados',
      'Probar el corte de gastos'
    ],
    documentos: ['Facturas fiscales', 'Comprobantes de pago', 'Planillas', 'Contratos'],
    instrucciones: 'Anote los gastos sin soporte o no deducibles; afectan el cálculo del impuesto y se evalúan para ajuste.'
  },
  GDEP: {
    ref: 'P-4',
    objetivo: 'Comprobar que el gasto de depreciación y amortización del período está bien calculado.',
    aserciones: 'Exactitud, valuación',
    procedimientos: [
      'Conciliar el gasto con el cuadro de depreciación del módulo D',
      'Recalcular una selección de bienes'
    ],
    documentos: ['Cuadro de depreciación'],
    instrucciones: 'Debe coincidir con el movimiento de la depreciación acumulada; cualquier diferencia queda pendiente de explicar.'
  },
  OIN: {
    ref: 'P-5',
    objetivo: 'Comprobar otros ingresos y su clasificación.',
    aserciones: 'Ocurrencia, integridad, clasificación',
    procedimientos: [
      'Obtener el detalle y cotejarlo con documentos de respaldo',
      'Verificar la naturaleza y su tratamiento tributario'
    ],
    documentos: ['Detalle de otros ingresos', 'Documentos de respaldo'],
    instrucciones: 'Ingresos no relacionados con la actividad se presentan por separado.'
  },
  GFI: {
    ref: 'P-6',
    objetivo: 'Comprobar intereses y comisiones financieras.',
    aserciones: 'Exactitud, integridad, corte',
    procedimientos: [
      'Recalcular intereses con la tabla de amortización',
      'Cotejar comisiones con estados de cuenta bancarios',
      'Verificar el devengado al cierre'
    ],
    documentos: ['Tablas de amortización', 'Estados de cuenta bancarios'],
    instrucciones: 'Diferencias contra el recálculo se evalúan para ajuste.'
  },
  GISR: {
    ref: 'P-7',
    objetivo: 'Comprobar el gasto de impuesto sobre la renta del período y su conciliación con la declaración.',
    aserciones: 'Exactitud, presentación',
    procedimientos: [
      'Recalcular el impuesto con la utilidad auditada y la tabla de persona natural',
      'Conciliar con el pasivo por impuestos y con la declaración',
      'Revisar el efecto de los ajustes propuestos sobre el impuesto'
    ],
    documentos: ['Cálculo del impuesto', 'Declaración de renta'],
    instrucciones: 'Cada ajuste de resultados aceptado cambia la base del impuesto: recalcule antes de cerrar.'
  }
};

/* Pruebas de ITBMS: solo se muestran cuando el encargo está marcado como contribuyente del ITBMS */
PROGRAMA.ITBMS = {
  ref: 'IT-1',
  objetivo: 'Comprobar que el negocio, como contribuyente del ITBMS, factura, declara y paga el impuesto correctamente y que el crédito fiscal que usa está respaldado.',
  aserciones: 'Integridad, exactitud, derechos, corte',
  procedimientos: [
    'Confirmar que el negocio está inscrito como contribuyente del ITBMS y que las actividades facturadas son gravadas, exentas o no gravadas según la ley (verificar con la DGI)',
    'Conciliar las ventas gravadas, exentas y no gravadas de las declaraciones mensuales (Formulario 430) con el mayor de ingresos',
    'Recalcular el ITBMS facturado con la tasa que corresponda a cada venta (la tasa general es 7 %) y compararlo con el pasivo y con lo declarado',
    'Verificar el crédito fiscal: facturas de compra a nombre del negocio, con RUC y DV, ITBMS desglosado y relación con la actividad gravada',
    'Revisar que las declaraciones se presentaron y se pagaron a tiempo, y si hay recargos o saldos pendientes',
    'Revisar retenciones de ITBMS, si el negocio actúa como agente de retención, y su declaración'
  ],
  documentos: ['Declaraciones mensuales del ITBMS (Formulario 430)', 'Recibos de pago de la DGI', 'Libros o reportes de ventas y compras', 'Facturas de compra con ITBMS'],
  instrucciones: 'Concilie mes a mes. Una diferencia entre el ITBMS declarado y el que resulta de los ingresos del mayor se propone como ajuste o se informa como salvedad según su monto.'
};

/* Lista de verificación de planificación (módulo 3) */
var CHECK_PLAN = [
  { id: 'p1', t: 'Aceptación del encargo y evaluación de independencia y ética (NIA 210, Código de Ética)' },
  { id: 'p2', t: 'Carta de compromiso firmada con el propietario (NIA 210)' },
  { id: 'p3', t: 'Entendimiento del negocio, su entorno y control interno (NIA 315)' },
  { id: 'p4', t: 'Evaluación de riesgos de incorrección material, incluido el fraude (NIA 240 y 315)' },
  { id: 'p5', t: 'Determinación de la materialidad y su umbral de ejecución (NIA 320)' },
  { id: 'p6', t: 'Procedimientos analíticos preliminares con la balanza (NIA 520)' },
  { id: 'p7', t: 'Estrategia global y programa de auditoría aprobados (NIA 300)' },
  { id: 'p8', t: 'Identificación de partes relacionadas, en especial el propietario (NIA 550)' },
  { id: 'p9', t: 'Determinación de si el negocio es contribuyente del ITBMS y de sus obligaciones (declaraciones y crédito fiscal)' }
];

/* Procedimientos finales (módulo 8) */
var CHECK_CIERRE = [
  { id: 'c1', t: 'Hechos posteriores al cierre revisados hasta la fecha del informe (NIA 560)' },
  { id: 'c2', t: 'Carta de representación firmada por el propietario (NIA 580)' },
  { id: 'c3', t: 'Evaluación de la hipótesis de empresa en funcionamiento (NIA 570)' },
  { id: 'c4', t: 'Revisión analítica final de los estados financieros (NIA 520)' },
  { id: 'c5', t: 'Evaluación de las diferencias no corregidas contra la materialidad (NIA 450)' },
  { id: 'c6', t: 'Partes relacionadas y su revelación revisadas (NIA 550)' },
  { id: 'c7', t: 'Revisión de papeles de trabajo por el auditor responsable (NIA 220)' }
];

var CONCLUSIONES = ['Pendiente', 'Razonable', 'Razonable con ajustes', 'Con salvedad', 'Sin evidencia suficiente', 'Incorrecto'];

var OPINIONES = [
  { id: 'favorable', nombre: 'Opinión favorable (sin salvedades)' },
  { id: 'salvedad', nombre: 'Opinión con salvedades' },
  { id: 'desfavorable', nombre: 'Opinión desfavorable' },
  { id: 'abstencion', nombre: 'Abstención de opinión' }
];

var MARCOS = [
  'NIIF para las PYMES',
  'NIIF completas',
  'NIIF para las PYMES (negocio de persona natural)'
];

/* Datos de ejemplo para probar la app (empresa ficticia, cuadrada) */
function datosEjemplo() {
  var z = function () { return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; };
  var cta = function (cod, nombre, rubro, si, m) { return { cod: cod, nombre: nombre, rubro: rubro, si: si, m: m || z() }; };
  var ing = [3000, 3200, 3100, 2900, 3300, 3500, 3400, 3600, 3300, 3500, 3700, 3900].map(function (v) { return -v; });
  var gas = [1200, 1250, 1180, 1220, 1260, 1300, 1280, 1320, 1250, 1300, 1340, 1400];
  var dep = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
  var banco = ing.map(function (v, i) { return -v - gas[i]; });
  var depac = dep.map(function (v) { return -v; });
  var lab = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  var iva = z();
  void lab; void iva;
  return [
    cta('1.1.01.001', 'Banco - cuenta corriente', 'EFE', 8000, banco),
    cta('1.1.02.001', 'Clientes', 'CXC', 2500),
    cta('1.2.01.001', 'Equipo de oficina', 'PPE', 12000),
    cta('1.2.01.002', 'Depreciación acumulada equipo', 'DEPA', -2400, depac),
    cta('2.1.01.001', 'Proveedores', 'CXP', -1500),
    cta('2.1.03.001', 'Seguro educativo por pagar', 'LAB', -300),
    cta('3.1.01.001', 'Capital del propietario', 'CAP', -15000),
    cta('3.3.01.001', 'Utilidades retenidas', 'URE', -3300),
    cta('3.2.01.001', 'Retiros del propietario', 'RET', 0),
    cta('4.1.01.001', 'Ingresos por servicios profesionales', 'ING', 0, ing),
    cta('6.1.01.001', 'Gastos de operación', 'GOP', 0, gas),
    cta('6.1.09.001', 'Gasto de depreciación', 'GDEP', 0, dep)
  ];
}
/* FIN DEL ARCHIVO datos.js */
