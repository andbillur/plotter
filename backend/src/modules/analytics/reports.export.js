import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { biDashboard, costReport, wasteReport } from './analytics.service.js';

function sheetFromRows(workbook, name, headers, rows) {
  const ws = workbook.addWorksheet(name.slice(0, 31));
  ws.addRow(headers);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  for (const row of rows) {
    ws.addRow(row);
  }
  headers.forEach((_, i) => {
    ws.getColumn(i + 1).width = 16;
  });
  return ws;
}

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('uz-UZ');
  } catch {
    return String(d);
  }
}

function fmtNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0;
}

export async function buildExcelReport(days) {
  const [bi, costs, waste] = await Promise.all([
    biDashboard({ days }),
    costReport({}),
    wasteReport({}),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Plotter CRM';
  wb.created = new Date();

  const cb = bi.costBreakdown;
  sheetFromRows(
    wb,
    'Umumiy',
    ['Ko\'rsatkich', 'Qiymat'],
    [
      ['Davr (kun)', days],
      ['Chiqish jami (kg)', fmtNum(bi.productionDaily.reduce((s, r) => s + Number(r.output_kg), 0))],
      ['Tannarx jami (so\'m)', fmtNum(cb.grand_total)],
      ['Qog\'oz (so\'m)', fmtNum(cb.paper)],
      ['Kley (so\'m)', fmtNum(cb.clay)],
      ['Elektr (so\'m)', fmtNum(cb.electricity)],
      ['Ish haqi (so\'m)', fmtNum(cb.labor)],
      ['Boshqa (so\'m)', fmtNum(cb.other)],
    ]
  );

  sheetFromRows(
    wb,
    'Ishlab chiqarish',
    ['Sana', 'Sessiyalar', 'Chiqish kg', 'Kley kg', 'Qog\'oz kg'],
    bi.productionDaily.map((r) => [
      fmtDate(r.day),
      r.session_count,
      fmtNum(r.output_kg),
      fmtNum(r.clay_kg),
      fmtNum(r.paper_kg),
    ])
  );

  sheetFromRows(
    wb,
    'Tannarx trend',
    ['Sana', '1 kg narxi', 'Jami so\'m'],
    bi.costPerKgTrend.map((r) => [
      fmtDate(r.day),
      fmtNum(r.avg_cost_per_kg),
      fmtNum(r.total_cost),
    ])
  );

  sheetFromRows(
    wb,
    'Tannarx sessiyalar',
    ['Sessiya', 'Sana', 'Chiqish kg', '1 kg', 'Jami', 'Qog\'oz', 'Kley', 'Ish haqi'],
    costs.map((r) => [
      r.session_code,
      fmtDate(r.calculated_at || r.finished_at),
      fmtNum(r.output_weight_kg),
      fmtNum(r.cost_per_kg_output),
      fmtNum(r.grand_total_cost),
      fmtNum(r.paper_cost_total),
      fmtNum(r.clay_cost_total),
      fmtNum(r.labor_cost_total),
    ])
  );

  sheetFromRows(
    wb,
    'Kesish brak',
    ['Sana', 'Sessiyalar', 'Chiqish kg', 'Brak %', 'Ish haqi', 'Qadoqlash'],
    bi.wasteDaily.map((r) => [
      fmtDate(r.day),
      r.session_count,
      fmtNum(r.output_kg),
      fmtNum(r.avg_waste_pct),
      fmtNum(r.labor_cost),
      fmtNum(r.packaging_cost),
    ])
  );

  sheetFromRows(
    wb,
    'Brak sessiyalar',
    ['Kod', 'Sana', 'Kirish kg', 'Chiqish kg', 'Brak kg', 'Brak %'],
    waste.map((r) => [
      r.session_code,
      fmtDate(r.finished_at),
      fmtNum(r.input_weight_kg),
      fmtNum(r.total_output_kg),
      fmtNum(r.waste_kg),
      fmtNum(r.waste_percent),
    ])
  );

  sheetFromRows(
    wb,
    'Ombor',
    ['Eni sm', 'Rang', 'Dona', 'Jami kg', 'Qadoqlash'],
    bi.warehouseStock.map((r) => [
      fmtNum(r.width_cm),
      r.color || '',
      r.item_count,
      fmtNum(r.total_kg),
      fmtNum(r.packaging_cost_total),
    ])
  );

  sheetFromRows(
    wb,
    'Qadoqlash',
    ['Sana', 'Dona', 'So\'m', 'kg'],
    bi.packagingDaily.map((r) => [
      fmtDate(r.day),
      r.product_count,
      fmtNum(r.packaging_cost),
      fmtNum(r.total_kg),
    ])
  );

  sheetFromRows(
    wb,
    'Kley',
    ['Sana', 'Kirim kg', 'Sarf kg'],
    bi.clayTrend.map((r) => [fmtDate(r.day), fmtNum(r.received_kg), fmtNum(r.used_kg)])
  );

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildPdfReport(days) {
  const [bi, costs, waste] = await Promise.all([
    biDashboard({ days }),
    costReport({}),
    wasteReport({}),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const title = 'Plotter CRM — Analitika hisoboti';
    doc.fontSize(18).text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Davr: oxirgi ${days} kun | ${new Date().toLocaleString('uz-UZ')}`, {
      align: 'center',
    });
    doc.moveDown(1);

    const cb = bi.costBreakdown;
    doc.fontSize(12).text('Umumiy tannarx', { underline: true });
    doc.fontSize(10);
    doc.text(`Jami tannarx: ${fmtNum(cb.grand_total).toLocaleString('uz-UZ')} so'm`);
    doc.text(`Qog'oz: ${fmtNum(cb.paper).toLocaleString('uz-UZ')} | Kley: ${fmtNum(cb.clay).toLocaleString('uz-UZ')} | Ish haqi: ${fmtNum(cb.labor).toLocaleString('uz-UZ')}`);
    doc.moveDown(0.8);

    const addTable = (heading, headers, rows, maxRows = 25) => {
      doc.fontSize(12).text(heading, { underline: true });
      doc.fontSize(9);
      doc.text(headers.join(' | '));
      doc.text('-'.repeat(72));
      rows.slice(0, maxRows).forEach((row) => {
        doc.text(row.map((c) => String(c ?? '')).join(' | '));
      });
      if (rows.length > maxRows) {
        doc.text(`... yana ${rows.length - maxRows} qator`);
      }
      doc.moveDown(0.8);
    };

    addTable(
      'Ishlab chiqarish (kunlik)',
      ['Sana', 'Sess', 'Chiqish', 'Kley'],
      bi.productionDaily.map((r) => [
        fmtDate(r.day),
        r.session_count,
        fmtNum(r.output_kg),
        fmtNum(r.clay_kg),
      ])
    );

    addTable(
      'So\'nggi tannarx sessiyalari',
      ['Kod', '1kg', 'Jami'],
      costs.slice(0, 30).map((r) => [
        r.session_code,
        fmtNum(r.cost_per_kg_output),
        fmtNum(r.grand_total_cost),
      ])
    );

    addTable(
      'Kesish brak (eng yuqori)',
      ['Kod', 'Brak%', 'Brak kg'],
      [...waste]
        .sort((a, b) => Number(b.waste_percent) - Number(a.waste_percent))
        .slice(0, 15)
        .map((r) => [r.session_code, fmtNum(r.waste_percent), fmtNum(r.waste_kg)])
    );

    addTable(
      'Ombor (eni)',
      ['Eni', 'kg', 'Dona'],
      bi.warehouseStock.map((r) => [fmtNum(r.width_cm), fmtNum(r.total_kg), r.item_count])
    );

    doc.fontSize(8).text('Maxfiy — faqat ichki foydalanish.', { align: 'center' });
    doc.end();
  });
}
