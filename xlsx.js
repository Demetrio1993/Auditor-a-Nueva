/* xlsx.js - Generador mínimo de archivos .xlsx (sin librerías, funciona sin internet) */
'use strict';

/* hojas: [{ nombre, anchos:[...], filas:[[celda,...],...] }]
   celda: texto | número | null | { v: valor, f: 'FÓRMULA', s: 'b'|'n'|'bn'|'h'|'w'|'t' } */
var XLSX_ESTILOS = { b: 1, n: 2, bn: 3, h: 4, w: 5, t: 6 };

function xlsxEsc(s) {
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function xlsxCol(i) {
  var s = '';
  i++;
  while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}
function xlsxNombreHoja(n, usados) {
  var base = String(n || 'Hoja').replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 31) || 'Hoja';
  var nombre = base, k = 2;
  while (usados[nombre.toLowerCase()]) { nombre = base.slice(0, 28) + ' ' + k; k++; }
  usados[nombre.toLowerCase()] = 1;
  return nombre;
}
function xlsxHojaXml(h) {
  var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
  x += '<sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>';
  if (h.anchos && h.anchos.length) {
    x += '<cols>';
    h.anchos.forEach(function (w, i) { x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; });
    x += '</cols>';
  }
  x += '<sheetData>';
  (h.filas || []).forEach(function (fila, r) {
    x += '<row r="' + (r + 1) + '">';
    (fila || []).forEach(function (c, i) {
      if (c === null || c === undefined || c === '') return;
      var ref = xlsxCol(i) + (r + 1), est = 0, val = c, f = null;
      if (typeof c === 'object') {
        val = c.v; f = c.f || null;
        est = XLSX_ESTILOS[c.s] || 0;
      }
      if (typeof val === 'number') {
        if (!est) est = 2;
        x += '<c r="' + ref + '" s="' + est + '">' + (f ? '<f>' + xlsxEsc(f) + '</f>' : '') + '<v>' + (isFinite(val) ? val : 0) + '</v></c>';
      } else if (f) {
        x += '<c r="' + ref + '" s="' + est + '"><f>' + xlsxEsc(f) + '</f></c>';
      } else {
        var t = String(val);
        if (!est && t.indexOf('\n') >= 0) est = 5;
        x += '<c r="' + ref + '" t="inlineStr" s="' + est + '"><is><t xml:space="preserve">' + xlsxEsc(t) + '</t></is></c>';
      }
    });
    x += '</row>';
  });
  x += '</sheetData><pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
  return x;
}
var XLSX_ESTILOS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1F3A5F"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="7">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment wrapText="1" vertical="center"/></xf>' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' +
  '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

var XLSX_CRC = (function () {
  var t = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function xlsxCrc32(bytes) {
  var c = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++) c = XLSX_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function xlsxUtf8(s) { return new TextEncoder().encode(s); }
function xlsxZip(archivos) {
  var partes = [], central = [], offset = 0;
  function u16(n) { return [n & 255, (n >>> 8) & 255]; }
  function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
  archivos.forEach(function (a) {
    var nombre = xlsxUtf8(a.n), datos = xlsxUtf8(a.d), crc = xlsxCrc32(datos);
    var cab = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x5A21), u32(crc), u32(datos.length), u32(datos.length), u16(nombre.length), u16(0));
    partes.push(new Uint8Array(cab), nombre, datos);
    var cen = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x5A21), u32(crc), u32(datos.length), u32(datos.length), u16(nombre.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset));
    central.push(new Uint8Array(cen), nombre);
    offset += cab.length + nombre.length + datos.length;
  });
  var tamCen = 0;
  central.forEach(function (p) { tamCen += p.length; });
  var fin = [].concat(u32(0x06054b50), u16(0), u16(0), u16(archivos.length), u16(archivos.length), u32(tamCen), u32(offset), u16(0));
  var todo = partes.concat(central, [new Uint8Array(fin)]);
  var total = 0;
  todo.forEach(function (p) { total += p.length; });
  var out = new Uint8Array(total), pos = 0;
  todo.forEach(function (p) { out.set(p, pos); pos += p.length; });
  return out;
}
function xlsxCrear(hojas) {
  var usados = {}, nombres = hojas.map(function (h) { return xlsxNombreHoja(h.nombre, usados); });
  var arch = [];
  var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
  hojas.forEach(function (_, i) { ct += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; });
  ct += '</Types>';
  arch.push({ n: '[Content_Types].xml', d: ct });
  arch.push({ n: '_rels/.rels', d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
  var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
  var rel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  hojas.forEach(function (_, i) {
    wb += '<sheet name="' + xlsxEsc(nombres[i]) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
    rel += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
  });
  wb += '</sheets></workbook>';
  rel += '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  arch.push({ n: 'xl/workbook.xml', d: wb });
  arch.push({ n: 'xl/_rels/workbook.xml.rels', d: rel });
  arch.push({ n: 'xl/styles.xml', d: XLSX_ESTILOS_XML });
  hojas.forEach(function (h, i) { arch.push({ n: 'xl/worksheets/sheet' + (i + 1) + '.xml', d: xlsxHojaXml(h) }); });
  return xlsxZip(arch);
}
if (typeof module !== 'undefined' && module.exports) { module.exports = { xlsxCrear: xlsxCrear }; }
/* FIN DEL ARCHIVO xlsx.js */
