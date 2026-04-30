const PdfPrinter = require('pdfmake');

const vfsData = require('pdfmake/build/vfs_fonts');
const vfs = vfsData.pdfMake?.vfs ?? vfsData;

const fonts = {
  Roboto: {
    normal:      Buffer.from(vfs['Roboto-Regular.ttf'],      'base64'),
    bold:        Buffer.from(vfs['Roboto-Medium.ttf'],       'base64'),
    italics:     Buffer.from(vfs['Roboto-Italic.ttf'],       'base64'),
    bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
  },
};

const printer = new PdfPrinter(fonts);

const EVENT_LABELS = {
  none:          '',
  routine_check: 'Routine',
  meal:          'Meal',
  snack:         'Snack',
  high_bg:       'High BG',
  low_bg:        'Low BG',
};

function formatHour(h) {
  if (h === 0)  return '12 AM';
  if (h < 12)   return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function bgCell(value, min, max) {
  if (value == null) return { text: '—', style: 'tableCell', alignment: 'center' };
  const isHigh = value > max;
  const isLow  = value < min;
  return {
    text:      `${value}`,
    style:     'tableCell',
    alignment: 'center',
    color:     isHigh ? '#b91c1c' : isLow ? '#1d4ed8' : '#166534',
    bold:      isHigh || isLow,
  };
}

// ── Chart helpers ─────────────────────────────────────────────

function computeStats(days, min, max) {
  const bgs = [];
  for (const day of days)
    for (const e of day.entries)
      if (e.blood_glucose != null) bgs.push(e.blood_glucose);

  if (bgs.length === 0) return null;
  const avg     = Math.round(bgs.reduce((s, b) => s + b, 0) / bgs.length);
  const highs   = bgs.filter(b => b > max).length;
  const lows    = bgs.filter(b => b < min).length;
  const inRange = bgs.length - highs - lows;
  const pct     = Math.round(100 * inRange / bgs.length);
  return { count: bgs.length, avg, highs, lows, inRange, pct };
}

function buildStatsTable(stats) {
  return {
    table: {
      widths: ['*', '*', '*', '*', '*'],
      body: [[
        {
          stack: [
            { text: `${stats.count}`, fontSize: 20, bold: true, color: '#111827', alignment: 'center' },
            { text: 'Total Readings', fontSize: 7, color: '#6b7280', alignment: 'center' },
          ],
        },
        {
          stack: [
            { text: `${stats.avg}`, fontSize: 20, bold: true, color: '#111827', alignment: 'center' },
            { text: 'Avg BG (mg/dL)', fontSize: 7, color: '#6b7280', alignment: 'center' },
          ],
        },
        {
          stack: [
            { text: `${stats.pct}%`, fontSize: 20, bold: true, color: '#16a34a', alignment: 'center' },
            { text: 'Time in Range', fontSize: 7, color: '#6b7280', alignment: 'center' },
          ],
        },
        {
          stack: [
            { text: `${stats.highs}`, fontSize: 20, bold: true, color: '#dc2626', alignment: 'center' },
            { text: 'High Events', fontSize: 7, color: '#6b7280', alignment: 'center' },
          ],
        },
        {
          stack: [
            { text: `${stats.lows}`, fontSize: 20, bold: true, color: '#2563eb', alignment: 'center' },
            { text: 'Low Events', fontSize: 7, color: '#6b7280', alignment: 'center' },
          ],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#e5e7eb',
      vLineColor: () => '#e5e7eb',
      fillColor:  () => '#f9fafb',
      paddingLeft:   () => 10,
      paddingRight:  () => 10,
      paddingTop:    () => 10,
      paddingBottom: () => 10,
    },
    margin: [0, 0, 0, 16],
  };
}

function buildBgChartShapes(days, camper) {
  const bgMin = camper.target_bg_min ?? 70;
  const bgMax = camper.target_bg_max ?? 180;

  const readings = [];
  for (const day of days)
    for (const e of day.entries)
      if (e.blood_glucose != null)
        readings.push({ hourOffset: (day.dayNum - 1) * 24 + e.hour, bg: e.blood_glucose });

  if (readings.length === 0) return null;

  const chartW    = 700;
  const chartH    = 110;
  const totalHours = 7 * 24;

  const allBGs      = readings.map(r => r.bg);
  const displayMin  = Math.max(0,   Math.min(40,  Math.min(...allBGs) - 25));
  const displayMax  =               Math.max(350, Math.max(...allBGs) + 25);

  const xFor = h  => chartW * h / totalHours;
  const yFor = bg => chartH - chartH * (Math.max(displayMin, Math.min(displayMax, bg)) - displayMin) / (displayMax - displayMin);

  const shapes = [];

  // Background
  shapes.push({ type: 'rect', x: 0, y: 0, w: chartW, h: chartH, color: '#f8fafc' });

  // Target zone fill
  const tzTop = yFor(bgMax);
  const tzBot = yFor(bgMin);
  shapes.push({ type: 'rect', x: 0, y: tzTop, w: chartW, h: tzBot - tzTop, color: '#dcfce7' });

  // Target zone border lines
  shapes.push({ type: 'line', x1: 0, y1: tzTop, x2: chartW, y2: tzTop, lineColor: '#16a34a', lineWidth: 0.75, dash: { length: 4, space: 3 } });
  shapes.push({ type: 'line', x1: 0, y1: tzBot, x2: chartW, y2: tzBot, lineColor: '#1d4ed8', lineWidth: 0.75, dash: { length: 4, space: 3 } });

  // Day separator lines
  for (let d = 1; d < 7; d++)
    shapes.push({ type: 'line', x1: xFor(d * 24), y1: 0, x2: xFor(d * 24), y2: chartH, lineColor: '#d1d5db', lineWidth: 0.5 });

  // Connect readings with a grey line
  if (readings.length > 1)
    shapes.push({
      type: 'polyline',
      points:    readings.map(r => ({ x: xFor(r.hourOffset), y: yFor(r.bg) })),
      lineColor: '#94a3b8',
      lineWidth: 1,
      closePath: false,
    });

  // Coloured dots
  for (const r of readings) {
    const color = r.bg > bgMax ? '#dc2626' : r.bg < bgMin ? '#2563eb' : '#16a34a';
    shapes.push({ type: 'ellipse', x: xFor(r.hourOffset), y: yFor(r.bg), r1: 3.5, r2: 3.5, color });
  }

  return { shapes, chartW, chartH, displayMin: Math.round(displayMin), displayMax: Math.round(displayMax) };
}

// ── Doc definition ────────────────────────────────────────────

function buildDocDefinition({ cabinName, weekNum, camper, days, aiInsights }) {
  const camperName = `${camper.first_name} ${camper.last_name}`;
  const min = camper.target_bg_min ?? 70;
  const max = camper.target_bg_max ?? 180;

  const content = [];

  // ── Camper info card ──────────────────────────────────────
  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [[
        { text: [{ text: 'Camper\n', style: 'infoLabel' }, { text: camperName, style: 'infoValue' }], style: 'infoCell' },
        { text: [{ text: 'Cabin\n',  style: 'infoLabel' }, { text: cabinName,  style: 'infoValue' }], style: 'infoCell' },
        { text: [{ text: 'BG Target\n', style: 'infoLabel' }, { text: `${min}–${max} mg/dL`, style: 'infoValue' }], style: 'infoCell' },
        { text: [{ text: 'Diabetes Type\n', style: 'infoLabel' }, { text: camper.diabetes_type ?? '—', style: 'infoValue' }], style: 'infoCell' },
      ]],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#d1d5db',
      vLineColor: () => '#d1d5db',
      fillColor:  () => '#f0f9ff',
      paddingLeft:   () => 8,
      paddingRight:  () => 8,
      paddingTop:    () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 12],
  });

  if (camper.notes)
    content.push({ text: `Notes: ${camper.notes}`, style: 'notesText', margin: [0, 0, 0, 12] });

  // ── Day-by-day tables ─────────────────────────────────────
  for (const day of days) {
    content.push({ text: `Day ${day.dayNum}`, style: 'dayHeading' });

    const headerRow = [
      { text: 'Time',    style: 'tableHeader', alignment: 'center' },
      { text: 'Event',   style: 'tableHeader', alignment: 'center' },
      { text: 'BG',      style: 'tableHeader', alignment: 'center' },
      { text: 'Insulin', style: 'tableHeader', alignment: 'center' },
      { text: 'Carbs',   style: 'tableHeader', alignment: 'center' },
      { text: 'F/U BG',  style: 'tableHeader', alignment: 'center' },
      { text: 'Notes',   style: 'tableHeader' },
    ];

    const rows = [headerRow];
    for (const entry of day.entries) {
      rows.push([
        { text: formatHour(entry.hour),                                                      style: 'tableCell', alignment: 'center' },
        { text: EVENT_LABELS[entry.event_type] ?? '',                                        style: 'tableCell', alignment: 'center' },
        bgCell(entry.blood_glucose,     min, max),
        { text: entry.insulin_administered != null ? `${entry.insulin_administered}u` : '—', style: 'tableCell', alignment: 'center' },
        { text: entry.carbohydrates        != null ? `${entry.carbohydrates}g`         : '—', style: 'tableCell', alignment: 'center' },
        bgCell(entry.followup_bg,        min, max),
        { text: entry.notes ?? '',                                                            style: 'tableCell' },
      ]);
    }

    if (rows.length === 1)
      rows.push([{ text: 'No entries recorded for this day.', colSpan: 7, style: 'tableCellMuted', alignment: 'center' }, ...Array(6).fill({})]);

    content.push({
      table: {
        headerRows: 1,
        widths: [45, 60, 45, 50, 45, 50, '*'],
        body: rows,
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#e5e7eb',
        vLineColor: () => '#e5e7eb',
        fillColor:  (rowIndex) => rowIndex % 2 === 0 && rowIndex !== 0 ? '#f9fafb' : null,
        paddingLeft:   () => 6,
        paddingRight:  () => 6,
        paddingTop:    () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 0, 0, 12],
    });
  }

  // ── Trends page ───────────────────────────────────────────
  content.push({ text: '', pageBreak: 'before' });
  content.push({ text: `Weekly Trends — ${camperName} — Week ${weekNum}`, style: 'trendsHeading', margin: [0, 0, 0, 12] });

  const stats = computeStats(days, min, max);

  if (stats) {
    content.push(buildStatsTable(stats));

    const chart = buildBgChartShapes(days, camper);
    if (chart) {
      content.push({ text: 'Blood Glucose Trend', style: 'chartTitle', margin: [0, 0, 0, 4] });

      // Y-axis labels + chart side-by-side
      content.push({
        columns: [
          {
            width: 28,
            stack: [
              { text: `${chart.displayMax}`, fontSize: 6, color: '#9ca3af', alignment: 'right' },
              { text: `${max}`,              fontSize: 6, color: '#16a34a',  alignment: 'right', margin: [0, Math.max(0, chart.chartH * (chart.displayMax - max) / (chart.displayMax - chart.displayMin) - 14), 0, 0] },
            ],
          },
          { canvas: chart.shapes, width: chart.chartW },
        ],
        margin: [0, 0, 0, 4],
      });

      // X-axis day labels
      content.push({
        margin: [28, 0, 0, 8],
        columns: Array.from({ length: 7 }, (_, i) => ({
          text: `Day ${i + 1}`,
          fontSize: 6,
          color: '#6b7280',
          alignment: 'center',
        })),
      });

      // Legend
      content.push({
        columns: [
          { text: '● In Range', fontSize: 7, color: '#16a34a', width: 'auto' },
          { text: '    ● Above Target', fontSize: 7, color: '#dc2626', width: 'auto' },
          { text: '    ● Below Target', fontSize: 7, color: '#2563eb', width: 'auto' },
          { text: `    Target zone: ${min}–${max} mg/dL`, fontSize: 7, color: '#374151' },
        ],
        margin: [0, 0, 0, 20],
      });
    }
  } else {
    content.push({ text: 'No blood glucose readings recorded for this week.', style: 'tableCellMuted', margin: [0, 0, 0, 16] });
  }

  // ── AI narrative ──────────────────────────────────────────
  if (aiInsights) {
    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 730, y2: 0, lineColor: '#e5e7eb', lineWidth: 0.5 }],
      margin: [0, 0, 0, 12],
    });
    content.push({ text: 'AI Trend Analysis  (Gemini)', style: 'chartTitle', margin: [0, 0, 0, 6] });
    content.push({ text: aiInsights, style: 'aiText', margin: [0, 0, 0, 6] });
    content.push({
      text: 'This AI analysis is informational only. Clinical judgment must always be applied by qualified medical staff.',
      style: 'disclaimer',
    });
  }

  // ── Document definition ───────────────────────────────────
  return {
    pageSize:        'LETTER',
    pageOrientation: 'landscape',
    pageMargins:     [30, 50, 30, 40],
    defaultStyle:    { font: 'Roboto' },

    header: {
      columns: [
        { text: `Merrick Monitor — ${camperName} — Week ${weekNum}`, style: 'header',      margin: [30, 15, 0,  0] },
        { text: `Generated: ${new Date().toLocaleDateString()}`,      style: 'headerRight', margin: [0,  15, 30, 0] },
      ],
    },

    footer: (currentPage, pageCount) => ({
      text:   `Page ${currentPage} of ${pageCount} — Lions Camp Merrick Nanjemoy — CONFIDENTIAL`,
      style:  'footer',
      margin: [30, 0],
    }),

    content,

    styles: {
      header:         { fontSize: 12, bold: true,    color: '#1d4ed8' },
      headerRight:    { fontSize: 9,                 color: '#6b7280', alignment: 'right' },
      footer:         { fontSize: 8,                 color: '#9ca3af', alignment: 'center' },
      infoLabel:      { fontSize: 7,                 color: '#6b7280' },
      infoValue:      { fontSize: 9,  bold: true,    color: '#111827' },
      infoCell:       { fontSize: 9 },
      notesText:      { fontSize: 8,  italics: true,  color: '#374151' },
      dayHeading:     { fontSize: 11, bold: true,    color: '#374151', margin: [0, 8, 0, 4] },
      tableHeader:    { fontSize: 8,  bold: true,    fillColor: '#1d4ed8', color: '#ffffff' },
      tableCell:      { fontSize: 8,                 color: '#374151' },
      tableCellMuted: { fontSize: 7,  italics: true,  color: '#9ca3af' },
      trendsHeading:  { fontSize: 13, bold: true,    color: '#1d4ed8' },
      chartTitle:     { fontSize: 10, bold: true,    color: '#374151' },
      aiText:         { fontSize: 9,                 color: '#374151', lineHeight: 1.6 },
      disclaimer:     { fontSize: 7,  italics: true,  color: '#9ca3af' },
    },
  };
}

function generateWeeklyPdf(options) {
  return new Promise((resolve, reject) => {
    const docDefinition = buildDocDefinition(options);
    const doc    = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', err   => reject(err));
    doc.end();
  });
}

module.exports = { generateWeeklyPdf };
