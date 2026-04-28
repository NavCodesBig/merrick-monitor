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

function buildDocDefinition({ cabinName, weekNum, camper, days }) {
  const camperName = `${camper.first_name} ${camper.last_name}`;
  const min = camper.target_bg_min ?? 70;
  const max = camper.target_bg_max ?? 180;

  const content = [];

  // Camper info card at the top
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

  if (camper.notes) {
    content.push({ text: `Notes: ${camper.notes}`, style: 'notesText', margin: [0, 0, 0, 12] });
  }

  // Day-by-day tables
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
        { text: formatHour(entry.hour),                                              style: 'tableCell', alignment: 'center' },
        { text: EVENT_LABELS[entry.event_type] ?? '',                                style: 'tableCell', alignment: 'center' },
        bgCell(entry.blood_glucose, min, max),
        { text: entry.insulin_administered != null ? `${entry.insulin_administered}u` : '—', style: 'tableCell', alignment: 'center' },
        { text: entry.carbohydrates        != null ? `${entry.carbohydrates}g`         : '—', style: 'tableCell', alignment: 'center' },
        bgCell(entry.followup_bg, min, max),
        { text: entry.notes ?? '', style: 'tableCell' },
      ]);
    }

    if (rows.length === 1) {
      rows.push([
        { text: 'No entries recorded for this day.', colSpan: 7, style: 'tableCellMuted', alignment: 'center' },
        ...Array(6).fill({}),
      ]);
    }

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
      header:         { fontSize: 12, bold: true,   color: '#1d4ed8' },
      headerRight:    { fontSize: 9,                color: '#6b7280', alignment: 'right' },
      footer:         { fontSize: 8,                color: '#9ca3af', alignment: 'center' },
      infoLabel:      { fontSize: 7,                color: '#6b7280' },
      infoValue:      { fontSize: 9,  bold: true,   color: '#111827' },
      infoCell:       { fontSize: 9 },
      notesText:      { fontSize: 8,  italics: true, color: '#374151' },
      dayHeading:     { fontSize: 11, bold: true,   color: '#374151', margin: [0, 8, 0, 4] },
      tableHeader:    { fontSize: 8,  bold: true,   fillColor: '#1d4ed8', color: '#ffffff' },
      tableCell:      { fontSize: 8,                color: '#374151' },
      tableCellMuted: { fontSize: 7,  italics: true, color: '#9ca3af' },
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
