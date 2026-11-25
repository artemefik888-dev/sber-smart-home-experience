import { count, roomName, total } from "./model.mjs";

const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const reldoc = "http://schemas.openxmlformats.org/package/2006/relationships";
const encode = text => new TextEncoder().encode(text);
const xml = text => String(text).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "").replace(/[&<>"']/g, x => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[x]);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Store-only ZIP. OOXML archives do not require compression.
function archive(files) {
  const local = [];
  const central = [];
  let offset = 0;
  let centralBytes = 0;
  for (const [path, content] of Object.entries(files)) {
    const name = encode(path);
    const payload = encode(xmlHeader + content);
    const crc = crc32(payload);
    const header = new Uint8Array(30);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(12, 33, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, payload.length, true);
    view.setUint32(22, payload.length, true);
    view.setUint16(26, name.length, true);
    const entry = new Uint8Array(46);
    const e = new DataView(entry.buffer);
    e.setUint32(0, 0x02014b50, true);
    e.setUint16(4, 20, true);
    entry.set(header.subarray(4, 28), 6);
    e.setUint32(42, offset, true);
    local.push(header, name, payload);
    central.push(entry, name);
    offset += header.length + name.length + payload.length;
    centralBytes += entry.length + name.length;
  }
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, central.length / 2, true);
  e.setUint16(10, central.length / 2, true);
  e.setUint32(12, centralBytes, true);
  e.setUint32(16, offset, true);
  const result = new Uint8Array(offset + centralBytes + end.length);
  let position = 0;
  for (const chunk of [...local, ...central, end]) {
    result.set(chunk, position);
    position += chunk.length;
  }
  return result;
}

function cells(values, n, styles = {}) {
  return '<row r="' + n + '">' + values.map((value, i) => {
    const c = String.fromCharCode(65 + i) + n;
    const open = '<c r="' + c + '" s="' + (styles[i] ?? 0) + '"';
    if (typeof value === "number") return open + '><v>' + value + '</v></c>';
    if (value && typeof value === "object") return open + '><f>' + xml(value.formula) + '</f><v>' + value.value + '</v></c>';
    return open + ' t="inlineStr"><is><t xml:space="preserve">' + xml(value ?? "") + '</t></is></c>';
  }).join("") + '</row>';
}

export function specificationXlsx(rows, { title, selection, names = {} }) {
  const sheetRows = [
    cells(["Спецификация умного дома"], 1, { 0:3 }),
    cells(["Объект", title], 2),
    cells(["Комплектация", selection], 3),
    cells(["РРЦ с НДС, 4Q 2026"], 4),
    cells(["Итого, ₽", total(rows), "Устройств", count(rows)], 5, { 0:3, 1:2, 3:2 }),
    cells(["Помещение", "Устройство", "Артикул", "Цвет", "Кол-во", "РРЦ, ₽", "Сумма, ₽", "Размещение"], 7,
      Object.fromEntries(Array.from({ length:8 }, (_, i) => [i,1]))),
    ...rows.map((row, i) => {
      const n = i + 8;
      return cells([roomName(row.room,names), row.title, row.sku, row.color, row.qty, row.price,
        { formula:"E" + n + "*F" + n, value:row.qty * row.price }, row.location ?? ""], n, { 5:2, 6:2 });
    }),
    cells(["Итого", "", "", "", count(rows), "", rows.length
      ? { formula:"SUM(G8:G" + (7 + rows.length) + ")", value:total(rows) } : 0], 8 + rows.length, { 0:3, 6:2 }),
  ];
  const last = Math.max(7,7 + rows.length);
  const sheets = '<worksheet xmlns="'+main+'"><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + '<cols>' + [27,72,18,15,11,16,17,35].map((v,i) => '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+v+'" customWidth="1"/>').join("") + '</cols>'
    + '<sheetData>' + sheetRows.join("") + '</sheetData><autoFilter ref="A7:H'+last+'"/></worksheet>';
  const styles = '<styleSheet xmlns="'+main+'"><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font><font><b/><sz val="13"/><name val="Arial"/></font></fonts>'
    + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF145140"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/></cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  return archive({
    "[Content_Types].xml": '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    "_rels/.rels": '<Relationships xmlns="'+reldoc+'"><Relationship Id="rId1" Type="'+rel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": '<workbook xmlns="'+main+'" xmlns:r="'+rel+'"><sheets><sheet name="Спецификация" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships xmlns="'+reldoc+'"><Relationship Id="rId1" Type="'+rel+'/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="'+rel+'/styles" Target="styles.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": sheets,
    "xl/styles.xml": styles,
  });
}

export function downloadSpecification(rows, meta) {
  const file = specificationXlsx(rows, meta);
  const url = URL.createObjectURL(new Blob([file], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "sber-smart-home-specification.xlsx";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
