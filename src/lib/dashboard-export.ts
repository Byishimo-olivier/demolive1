import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { dashboardApi } from './dashboard-api';
import { projectApi } from './project-api';

export type DashboardExportFormat = 'excel' | 'pdf';

interface ExportProject {
  _id?: string;
  id?: string;
  name: string;
  status?: string;
  progress?: number;
  budget?: number;
  team?: unknown[];
}

type Cell = string | number | null | undefined;
type Row = Cell[];

// One part of the report: a sheet in Excel, a titled block of tables in the PDF
interface ReportSection {
  title: string;
  sheet: string;
  widths: number[];
  tables: { head?: string[]; rows: Row[] }[];
}

interface DashboardReport {
  title: string;
  generated: Date;
  sections: ReportSection[];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "45.2" or "45.2%" from the API → 45.2
const num = (value: unknown) => {
  const n = parseFloat(String(value ?? '').replace('%', ''));
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
};

// Settle every request: one failing section must not stop the export
const settle = async <T>(promise: Promise<T>): Promise<T | null> => {
  try {
    return await promise;
  } catch {
    return null;
  }
};

const fileSafe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 60);

/** Load the dashboard data and arrange it as report sections (shared by Excel and PDF) */
async function buildReport(currency: string, project?: ExportProject | null): Promise<DashboardReport> {
  const projectId = project?._id || project?.id;
  const [summary, health, cashFlow, procurement, documents, performance, timeline, advanced, bidding, financials, profitLoss] =
    await Promise.all([
      settle(dashboardApi.getDashboardSummary()),
      settle(dashboardApi.getProjectsHealth()),
      settle(dashboardApi.getCashFlow()),
      settle(dashboardApi.getProcurementAnalytics()),
      settle(dashboardApi.getDocumentWorkflowAnalytics()),
      settle(dashboardApi.getPerformanceMatrix()),
      settle(dashboardApi.getTimelineTrends()),
      settle(dashboardApi.getAdvancedAnalytics()),
      settle(dashboardApi.getBiddingAnalytics()),
      projectId ? settle(projectApi.getProjectFinancials(projectId).then((r) => r.data)) : Promise.resolve(null),
      settle(dashboardApi.getProfitLoss(projectId)),
    ]);

  if (!summary && !health && !financials) {
    throw new Error('Could not load the dashboard data');
  }

  const money = `(${currency})`;
  const sections: ReportSection[] = [];

  // Portfolio summary
  const summaryRows: Row[] = [];
  if (summary) {
    summaryRows.push(['Total projects', summary.totalProjects]);
    Object.entries(summary.projectsByStatus || {}).forEach(([status, count]) => summaryRows.push([`Projects ${status.toLowerCase()}`, count]));
    summaryRows.push(
      [`Total budget ${money}`, summary.financials?.totalBudget ?? 0],
      [`Total expenses ${money}`, summary.financials?.totalExpenses ?? 0],
      [`Remaining budget ${money}`, summary.financials?.totalRemainingBudget ?? 0],
      ['Budget utilization (%)', num(summary.financials?.overallBudgetUtilization)]
    );
  }
  if (health?.overallHealthPercentage !== undefined) {
    summaryRows.push(['Projects in good health (%)', num(health.overallHealthPercentage)]);
  }
  if (summaryRows.length) {
    sections.push({ title: 'Summary', sheet: 'Summary', widths: [34, 20], tables: [{ rows: summaryRows }] });
  }

  // Income, expenses and profit / loss (the selected project, or all projects)
  if (profitLoss) {
    const tables: ReportSection['tables'] = [
      {
        rows: [
          [`Income ${money}`, profitLoss.income.earned],
          [`Received ${money}`, profitLoss.income.received],
          [`Outstanding ${money}`, profitLoss.income.outstanding],
          [`Expenses ${money}`, profitLoss.expenses.approved],
          [`${profitLoss.profitLoss < 0 ? 'Loss' : 'Profit'} ${money}`, profitLoss.profitLoss],
          ['Margin (% of income)', profitLoss.marginPercent],
          [`Cash position ${money}`, profitLoss.cashPosition],
          [`Expenses awaiting approval ${money}`, profitLoss.expenses.pending],
          [`Invoices awaiting approval ${money}`, profitLoss.income.awaitingApproval],
        ],
      },
    ];
    if (profitLoss.trend.labels.length) {
      tables.push({
        head: ['Month', `Income ${money}`, `Expenses ${money}`, `Profit / loss ${money}`],
        rows: profitLoss.trend.labels.map((label, i) => [
          label,
          profitLoss.trend.income[i],
          profitLoss.trend.expenses[i],
          profitLoss.trend.profitLoss[i],
        ]),
      });
    }
    if (!project && profitLoss.byProject.length > 1) {
      tables.push({
        head: ['Project', `Income ${money}`, `Received ${money}`, `Expenses ${money}`, `Profit / loss ${money}`],
        rows: profitLoss.byProject.map((p) => [p.name, p.income, p.received, p.expenses, p.profitLoss]),
      });
    }
    sections.push({ title: 'Profit & loss', sheet: 'Profit & loss', widths: [34, 18, 18, 18, 18], tables });
  }

  // Selected project
  if (project && financials) {
    sections.push({
      title: `Project: ${project.name}`,
      sheet: 'Project',
      widths: [30, 18, 18, 18, 10],
      tables: [
        {
          rows: [
            ['Status', project.status ?? ''],
            ['Progress (%)', project.progress ?? 0],
            ['Team size', project.team?.length ?? 0],
            [`Contract amount ${money}`, financials.contractAmount],
            [`Budget ${money}`, financials.budget],
            [`Approved expenses ${money}`, financials.expenses.approved],
            [`Pending expenses ${money}`, financials.expenses.pending],
            [`Budget remaining ${money}`, financials.budgetRemaining],
            [`Invoiced ${money}`, financials.invoices.invoiced],
            [`Paid by client ${money}`, financials.invoices.paid],
            [`Outstanding ${money}`, financials.invoices.outstanding],
            [`Profit / loss so far ${money}`, financials.profitLoss],
            [`Cash position ${money}`, financials.cashPosition],
          ],
        },
        {
          head: ['Category', `Planned ${money}`, `Spent ${money}`, `Remaining ${money}`, 'Used (%)'],
          rows: financials.expenses.byCategory.map((c) => [
            capitalize(c.category),
            c.planned,
            c.spent,
            c.planned - c.spent,
            c.planned > 0 ? Math.round((c.spent / c.planned) * 1000) / 10 : null,
          ]),
        },
      ],
    });
  }

  // Projects health
  if (health?.projects?.length) {
    sections.push({
      title: 'Projects',
      sheet: 'Projects',
      widths: [32, 14, 12, 16, 16, 16, 16, 14, 12],
      tables: [
        {
          head: ['Project', 'Status', 'Progress (%)', `Budget ${money}`, `Expenses ${money}`, `Remaining ${money}`, `Variance ${money}`, 'Budget used (%)', 'Health'],
          rows: health.projects.map((p) => [
            p.projectName,
            p.status,
            p.progress,
            p.budget,
            p.expenses,
            p.remainingBudget,
            p.variance,
            num(p.budgetUtilization),
            p.healthScore,
          ]),
        },
      ],
    });
  }

  // Cash flow: one row per period, one column per series
  if (cashFlow?.labels?.length) {
    sections.push({
      title: 'Cash flow',
      sheet: 'Cash flow',
      widths: [16, ...cashFlow.datasets.map(() => 20)],
      tables: [
        {
          head: ['Period', ...cashFlow.datasets.map((d) => `${d.label} ${money}`)],
          rows: cashFlow.labels.map((label, i) => [label, ...cashFlow.datasets.map((d) => d.data[i] ?? 0)]),
        },
      ],
    });
  }

  // Key indicators
  const indicators: Row[] = [];
  const add = (label: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== '') indicators.push([label, value as Cell]);
  };
  if (procurement) {
    add('Requests', procurement.materialRequestCount);
    add('Purchase orders', procurement.purchaseOrderCount);
    add('Supplier on-time delivery (%)', num(procurement.supplierPerformance?.onTimeDeliveryPercentage));
  }
  if (documents) {
    add('Documents', documents.totalDocuments);
    add('Documents approved', documents.approved);
    add('Documents pending', documents.pending);
    add('Document approval rate (%)', num(documents.approvalRate));
    add('Average approval time (days)', num(documents.averageApprovalTimeDays));
  }
  if (timeline) {
    add('Timeline stages', timeline.totalStages);
    add('Stages completed', timeline.completedStages);
    add('Average stage progress (%)', num(timeline.averageProgress));
    add('Average delay (days)', num(timeline.averageDelayDays));
  }
  if (performance) {
    add('Risk score', performance.riskScore);
    add('On-time delivery (%)', num(performance.onTimeDeliveryPercentage));
    add('Stock health (%)', num(performance.stockHealthPercentage));
    add('Predicted completion', performance.predictedCompletionDate);
  }
  if (advanced) {
    add('Budget efficiency (%)', num(advanced.budgetEfficiencyPercentage));
    add('Cost variance (%)', num(advanced.costVariancePercentage));
    add('Procurement velocity (%)', num(advanced.procurementVelocityPercentage));
    add('Projects on track (%)', num(advanced.projectsOnTrackPercentage));
  }
  if (bidding) {
    add('Tenders', bidding.totalTenders);
    add('Active tenders', bidding.activeTenders);
    add('Bids', bidding.totalBids);
    add('Bids awarded', bidding.awardedBids);
    add('Average bids per tender', num(bidding.avgBidsPerTender));
  }
  if (indicators.length) {
    sections.push({ title: 'Key indicators', sheet: 'Indicators', widths: [34, 22], tables: [{ head: ['Indicator', 'Value'], rows: indicators }] });
  }

  return {
    title: project ? `Dashboard report – ${project.name}` : 'Dashboard report',
    generated: new Date(),
    sections,
  };
}

/** Each section on its own sheet; amounts stay numbers so they can be added up */
function writeExcel(report: DashboardReport, fileName: string) {
  const workbook = XLSX.utils.book_new();
  report.sections.forEach((section, index) => {
    const rows: Row[] = [[section.title]];
    if (index === 0) rows.push([report.title], ['Generated', format(report.generated, 'yyyy-MM-dd HH:mm')]);
    for (const table of section.tables) {
      rows.push([]);
      if (table.head) rows.push(table.head);
      rows.push(...table.rows);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = section.widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, ws, section.sheet);
  });
  XLSX.writeFile(workbook, fileName);
}

// What autoTable passes to its cell hooks (the project's local typings declare the options as any)
interface CellHookData {
  section: 'head' | 'body' | 'foot';
  column: { index: number };
  cell: { styles: { halign?: string } };
}

const pdfCell = (value: Cell) =>
  typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : value ?? '';

/** A printable report: a heading, then each section as a table; numbers right-aligned */
function writePdf(report: DashboardReport, fileName: string) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(report.title, margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Generated ${format(report.generated, 'MMMM d, yyyy HH:mm')}`, margin, 25);
  doc.setTextColor(0);

  let y = 34;
  for (const section of report.sections) {
    // Keep a section heading with at least the start of its table
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(section.title, margin, y);
    y += 3;

    for (const table of section.tables) {
      const numeric = (col: number) => table.rows.some((r) => typeof r[col] === 'number');
      const columns = Math.max(table.head?.length ?? 0, ...table.rows.map((r) => r.length));
      const alignRight = Array.from({ length: columns }, (_, col) => col > 0 && numeric(col));
      const columnStyles: Record<number, { halign: 'right' | 'left'; fontStyle?: 'bold' }> = {};
      alignRight.forEach((right, col) => {
        columnStyles[col] = { halign: right ? 'right' : 'left' };
      });
      // Label / value tables: labels in bold
      if (!table.head) columnStyles[0] = { halign: 'left', fontStyle: 'bold' };

      autoTable(doc, {
        startY: y,
        head: table.head ? [table.head] : undefined,
        body: table.rows.map((r) => r.map(pdfCell)),
        theme: table.head ? 'striped' : 'plain',
        margin: { left: margin, right: margin },
        // Narrow tables stay compact instead of spreading across the landscape page
        tableWidth: columns <= 3 ? Math.min(60 * columns, pageWidth - margin * 2) : 'auto',
        styles: { fontSize: 9, cellPadding: table.head ? 2 : 1.5 },
        headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
        columnStyles,
        // Headers line up with their numbers
        didParseCell: (data: CellHookData) => {
          if (data.section === 'head' && alignRight[data.column.index]) data.cell.styles.halign = 'right';
        },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }
    y += 4;
  }

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
  doc.save(fileName);
}

/**
 * Download the dashboard as an Excel workbook or a PDF report: the portfolio summary, each
 * project's health, cash flow and the key indicators, plus the selected project's financials.
 * Returns the file name.
 */
export async function exportDashboard(
  currency: string,
  project?: ExportProject | null,
  fileFormat: DashboardExportFormat = 'excel'
): Promise<string> {
  const report = await buildReport(currency, project);
  const base = `Dashboard_${project ? `${fileSafe(project.name)}_` : ''}${format(report.generated, 'yyyy-MM-dd')}`;
  if (fileFormat === 'pdf') {
    const fileName = `${base}.pdf`;
    writePdf(report, fileName);
    return fileName;
  }
  const fileName = `${base}.xlsx`;
  writeExcel(report, fileName);
  return fileName;
}
