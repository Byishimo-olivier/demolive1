/**
 * The demo's backend, running in the browser.
 *
 * While demo mode is on, axios sends every request here instead of to the server
 * (see the request interceptor in src/lib/axios.ts). Requests are answered from the sample
 * data in demo-seed.ts; anything the visitor creates or changes is kept in this browser's
 * localStorage, so each visitor has their own sandbox and the real data is never touched.
 *
 * Endpoints the app relies on for its main screens are handled explicitly below. Anything else
 * falls back to a generic answer (empty list for reads, the sent data echoed back for writes)
 * so no screen breaks on a missing route.
 */
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { Permissions } from '../constants/permissions';
import { DEMO_TOKEN, DEMO_USER_ID } from './demo-mode';
import { createDemoDb, daysFromNow, DEMO_DB_VERSION, newId, type DemoDb, type Row } from './demo-seed';

/* eslint-disable @typescript-eslint/no-explicit-any */

const STORE_KEY = 'infrasoko_demo_db';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

let db: DemoDb | null = null;

function getDb(): DemoDb {
  if (db) return db;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDb;
      if (parsed?.version === DEMO_DB_VERSION) db = parsed;
    }
  } catch {
    /* corrupt or blocked storage: start fresh */
  }
  if (!db) {
    db = createDemoDb();
    save();
  }
  return db;
}

function save() {
  try {
    if (db) window.localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    /* quota or blocked: changes last until the page reloads */
  }
}

/** Throw away the visitor's changes; the next request starts from fresh sample data */
export function resetDemoData() {
  db = null;
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

type Result = { status: number; body: any };
type Ctx = { method: string; path: string; params: Record<string, any>; body: Row; p: Record<string, string> };
type Handler = (ctx: Ctx) => Result;

const ok = (data: any, message = 'Success'): Result => ({ status: 200, body: { success: true, message, data } });
const created = (data: any, message = 'Created successfully'): Result => ({ status: 201, body: { success: true, message, data } });
const fail = (status: number, message: string): Result => ({ status, body: { success: false, message } });

const col = (name: string): Row[] => {
  const d = getDb();
  if (!d.collections[name]) d.collections[name] = [];
  return d.collections[name];
};
const byProject = (name: string, projectId: string) => col(name).filter((r) => r.projectId === projectId);
const findIn = (name: string, id: string) => col(name).find((r) => r._id === id || r.id === id);
const user = () => getDb().users.find((u) => u._id === DEMO_USER_ID)!;
const now = () => new Date().toISOString();
const num = (v: any) => (v === undefined || v === null || v === '' ? 0 : Number(v) || 0);
const sum = (rows: Row[], f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0);
const findProject = (id: string) => getDb().projects.find((p) => p._id === id);

function stamp(row: Row): Row {
  return { createdBy: DEMO_USER_ID, updatedBy: DEMO_USER_ID, createdAt: now(), updatedAt: now(), ...row };
}

function insert(name: string, row: Row): Row {
  const record = stamp({ _id: newId(), ...row });
  col(name).unshift(record);
  return record;
}

function update(name: string, id: string, changes: Row): Row | null {
  const record = findIn(name, id);
  if (!record) return null;
  Object.assign(record, changes, { updatedAt: now(), updatedBy: DEMO_USER_ID });
  return record;
}

function remove(name: string, id: string) {
  const list = col(name);
  const i = list.findIndex((r) => r._id === id || r.id === id);
  if (i >= 0) list.splice(i, 1);
}

/** Within ?startDate / ?endDate when given */
function inRange(dateValue: string | undefined, params: Record<string, any>) {
  if (!dateValue) return true;
  const d = dateValue.slice(0, 10);
  if (params.startDate && d < String(params.startDate).slice(0, 10)) return false;
  if (params.endDate && d > String(params.endDate).slice(0, 10)) return false;
  return true;
}

const paginated = (docs: Row[]) => ({
  docs,
  totalDocs: docs.length,
  limit: Math.max(docs.length, 10),
  page: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
});

const historyEntry = (action: string, comment?: string) => ({ action, byName: user().fullName, at: now(), comment });

// ---------------------------------------------------------------------------
// Money: worked out from expenses and invoices so every screen agrees
// ---------------------------------------------------------------------------

const budgetOf = (projectId: string) =>
  byProject('budgets', projectId).sort((a, b) => (b.fiscalYear || 0) - (a.fiscalYear || 0))[0] || null;

const approvedExpenses = (projectId?: string) =>
  col('expenses').filter((e) => e.approvalStatus === 'approved' && (!projectId || e.projectId === projectId));

function incomeOf(projectId?: string) {
  const inv = col('invoices').filter((i) => !projectId || i.projectId === projectId);
  const earned = sum(inv.filter((i) => i.status === 'approved' || i.status === 'paid'), (i) => num(i.totalAmount));
  const received = sum(inv.filter((i) => i.status === 'paid'), (i) => num(i.totalAmount));
  const waiting = inv.filter((i) => i.status === 'pending');
  return { earned, received, outstanding: earned - received, awaitingApproval: sum(waiting, (i) => num(i.totalAmount)), awaitingApprovalCount: waiting.length };
}

function withBudget(project: Row): Row {
  const b = budgetOf(project._id);
  return { ...project, budget: b ? num(b.totalPlannedBudget) : 0 };
}

function projectProgress(projectId: string) {
  const stages = byProject('stages', projectId);
  return stages.length ? Math.round(sum(stages, (s) => num(s.progressPercentage)) / stages.length) : 0;
}

function budgetSummary(projectId: string) {
  const b = budgetOf(projectId);
  const spent = approvedExpenses(projectId);
  const total = sum(spent, (e) => num(e.amount));
  const byCategory: Record<string, number> = {};
  spent.forEach((e) => (byCategory[e.category] = (byCategory[e.category] || 0) + num(e.amount)));
  const planned = b ? num(b.totalPlannedBudget) : 0;
  return {
    budget: {
      totalPlanned: planned,
      materials: num(b?.materialsBudget),
      labor: num(b?.laborBudget),
      equipment: num(b?.equipmentBudget),
      fuel: num(b?.fuelBudget),
      overheads: num(b?.overheadsBudget),
      subcontractors: num(b?.subcontractorsBudget),
    },
    expenses: { total, byCategory },
    remaining: planned - total,
    utilizationPercentage: planned > 0 ? (total / planned) * 100 : total > 0 ? 100 : 0,
  };
}

function monthLabels(count = 6) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = count - 1; i >= 0; i -= 1) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`, label: m.toLocaleString('en', { month: 'short', year: '2-digit' }) });
  }
  return out;
}

function profitLoss(projectId: string | undefined, params: Record<string, any>) {
  const projects = getDb().projects.filter((p) => !projectId || p._id === projectId);
  const ids = new Set(projects.map((p) => p._id));
  const expenses = col('expenses').filter((e) => ids.has(e.projectId) && inRange(e.date, params));
  const approved = expenses.filter((e) => e.approvalStatus === 'approved');
  const pending = expenses.filter((e) => e.approvalStatus === 'pending');
  const invoices = col('invoices').filter((i) => ids.has(i.projectId) && inRange(i.invoiceDate || i.createdAt, params));
  const earned = sum(invoices.filter((i) => ['approved', 'paid'].includes(i.status)), (i) => num(i.totalAmount));
  const received = sum(invoices.filter((i) => i.status === 'paid'), (i) => num(i.totalAmount));
  const waiting = invoices.filter((i) => i.status === 'pending');
  const spent = sum(approved, (e) => num(e.amount));

  const byCat: Record<string, number> = {};
  approved.forEach((e) => (byCat[e.category] = (byCat[e.category] || 0) + num(e.amount)));

  const months = monthLabels(6);
  const monthOf = (v?: string) => (v || '').slice(0, 7);
  const incomeTrend = months.map((m) => sum(invoices.filter((i) => ['approved', 'paid'].includes(i.status) && monthOf(i.invoiceDate || i.createdAt) === m.key), (i) => num(i.totalAmount)));
  const expenseTrend = months.map((m) => sum(approved.filter((e) => monthOf(e.date) === m.key), (e) => num(e.amount)));

  return {
    projectId: projectId || null,
    projectCount: projects.length,
    startDate: params.startDate || null,
    endDate: params.endDate || null,
    income: { earned, received, outstanding: earned - received, awaitingApproval: sum(waiting, (i) => num(i.totalAmount)), awaitingApprovalCount: waiting.length },
    expenses: {
      approved: spent,
      pending: sum(pending, (e) => num(e.amount)),
      pendingCount: pending.length,
      byCategory: Object.entries(byCat).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    },
    profitLoss: earned - spent,
    marginPercent: earned > 0 ? Math.round(((earned - spent) / earned) * 1000) / 10 : null,
    cashPosition: received - spent,
    byProject: projects.map((p) => {
      const inc = incomeOf(p._id);
      const exp = sum(approvedExpenses(p._id).filter((e) => inRange(e.date, params)), (e) => num(e.amount));
      return { projectId: p._id, name: p.name, income: inc.earned, received: inc.received, expenses: exp, profitLoss: inc.earned - exp };
    }),
    trend: {
      // Month keys (yyyy-MM): the charts format them
      labels: months.map((m) => m.key),
      income: incomeTrend,
      expenses: expenseTrend,
      profitLoss: incomeTrend.map((v, i) => v - expenseTrend[i]),
    },
  };
}

function projectFinancials(projectId: string, params: Record<string, any>) {
  const p = findProject(projectId)!;
  const summary = budgetSummary(projectId);
  const pending = byProject('expenses', projectId).filter((e) => e.approvalStatus === 'pending');
  const inc = incomeOf(projectId);
  const categories = ['materials', 'labor', 'equipment', 'fuel', 'overheads', 'subcontractors'];
  const contract = num(p.contract?.amount ?? p.contractAmount);
  const result: Row = {
    contractAmount: contract,
    budget: summary.budget.totalPlanned,
    expenses: {
      approved: summary.expenses.total,
      pending: sum(pending, (e) => num(e.amount)),
      byCategory: categories.map((c) => ({ category: c, planned: num((summary.budget as Row)[c]), spent: num(summary.expenses.byCategory[c]) })),
    },
    invoices: { invoiced: inc.earned, paid: inc.received, outstanding: inc.outstanding, awaitingApproval: inc.awaitingApproval },
    profitLoss: inc.earned - summary.expenses.total,
    marginPercent: inc.earned > 0 ? Math.round(((inc.earned - summary.expenses.total) / inc.earned) * 1000) / 10 : null,
    projectedProfit: contract - summary.budget.totalPlanned,
    budgetRemaining: summary.remaining,
    cashPosition: inc.received - summary.expenses.total,
  };
  if (params.startDate || params.endDate) {
    const exp = approvedExpenses(projectId).filter((e) => inRange(e.date, params));
    const inv = byProject('invoices', projectId).filter((i) => ['approved', 'paid'].includes(i.status) && inRange(i.invoiceDate, params));
    const paid = inv.filter((i) => i.status === 'paid');
    const byCat: Record<string, number> = {};
    exp.forEach((e) => (byCat[e.category] = (byCat[e.category] || 0) + num(e.amount)));
    const expenses = sum(exp, (e) => num(e.amount));
    const invoiced = sum(inv, (i) => num(i.totalAmount));
    result.period = {
      startDate: params.startDate || null,
      endDate: params.endDate || null,
      expenses,
      expenseCount: exp.length,
      expensesByCategory: Object.entries(byCat).map(([category, spent]) => ({ category, spent })),
      invoiced,
      invoiceCount: inv.length,
      paid: sum(paid, (i) => num(i.totalAmount)),
      profitLoss: invoiced - expenses,
      cashFlow: sum(paid, (i) => num(i.totalAmount)) - expenses,
    };
  }
  return result;
}

function projectsHealth() {
  const projects = getDb().projects.map((p) => {
    const b = budgetOf(p._id);
    const budget = b ? num(b.totalPlannedBudget) : 0;
    const expenses = sum(approvedExpenses(p._id), (e) => num(e.amount));
    const utilization = budget > 0 ? (expenses / budget) * 100 : 0;
    const progress = projectProgress(p._id);
    return {
      projectId: p._id,
      projectName: p.name,
      status: p.status,
      progress,
      budget,
      expenses,
      remainingBudget: budget - expenses,
      variance: budget - expenses,
      budgetUtilization: utilization,
      healthScore: utilization > progress + 15 ? 'At Risk' : 'Healthy',
    };
  });
  const healthy = projects.filter((p) => p.healthScore === 'Healthy').length;
  return { projects, overallHealthPercentage: String(projects.length ? Math.round((healthy / projects.length) * 100) : 0) };
}

// ---------------------------------------------------------------------------
// Timeline helpers
// ---------------------------------------------------------------------------

const statusFor = (progress: number) => (progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending');

function rollUpStage(stage: Row) {
  (stage.subStages || []).forEach((sub: Row) => {
    if (sub.tasks?.length) {
      sub.progressPercentage = Math.round(sum(sub.tasks, (t) => num(t.progressPercentage)) / sub.tasks.length);
      sub.status = statusFor(sub.progressPercentage);
    }
  });
  if (stage.subStages?.length) {
    stage.progressPercentage = Math.round(sum(stage.subStages, (s) => num(s.progressPercentage)) / stage.subStages.length);
    stage.status = statusFor(stage.progressPercentage);
  }
  stage.updatedAt = now();
  const project = findProject(stage.projectId);
  if (project) project.progress = projectProgress(project._id);
  return stage;
}

function newWorkItem(body: Row): Row {
  const progress = num(body.progressPercentage);
  const start = body.startDate || now();
  const end = body.endDate || daysFromNow(14);
  return {
    _id: newId(),
    name: body.name || 'New activity',
    description: body.description,
    startDate: start,
    endDate: end,
    plannedDuration: Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000)),
    responsiblePersonName: body.responsiblePersonName,
    responsiblePerson: body.responsiblePerson || null,
    status: body.status || statusFor(progress),
    progressPercentage: progress,
    budget: num(body.budget),
    actualCost: num(body.actualCost),
    approval: { status: 'Pending' },
    tasks: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

function stageAndItem(p: Record<string, string>) {
  const stage = findIn('stages', p.stageId);
  const sub = stage?.subStages?.find((s: Row) => s._id === p.subId);
  const task = p.taskId ? sub?.tasks?.find((t: Row) => t._id === p.taskId) : undefined;
  return { stage, sub, task };
}

function setProgress(item: Row, progress: number, status?: string, note?: string) {
  item.progressPercentage = Math.max(0, Math.min(100, progress));
  item.status = status || statusFor(item.progressPercentage);
  item.progressUpdatedAt = now();
  item.progressUpdatedByName = user().fullName;
  item.progressHistory = [...(item.progressHistory || []), { progressPercentage: item.progressPercentage, status: item.status, note, date: now(), byName: user().fullName }];
}

// ---------------------------------------------------------------------------
// Labour helpers
// ---------------------------------------------------------------------------

function attendanceSummary(projectId: string, params: Record<string, any>) {
  let rows = byProject('attendance', projectId).filter((r) => inRange(r.date, params));
  if (params.workerId) rows = rows.filter((r) => r.workerId === params.workerId);
  if (params.status) rows = rows.filter((r) => r.status === params.status);
  rows = rows.sort((a, b) => b.date.localeCompare(a.date) || a.workerName.localeCompare(b.workerName));

  const byWorker = new Map<string, Row>();
  const byDate = new Map<string, Row>();
  rows.forEach((r) => {
    const w =
      byWorker.get(r.workerId) ||
      { workerId: r.workerId, workerName: r.workerName, trade: r.trade, rateType: r.rateType, rate: r.rate, days: 0, units: 0, amount: 0, unpaidAmount: 0, present: 0, halfDay: 0, absent: 0, leave: 0 };
    w.days += 1;
    w.units += r.units;
    w.amount += r.amount;
    if (!r.paid) w.unpaidAmount += r.amount;
    if (r.status === 'Present') w.present += 1;
    if (r.status === 'Half day') w.halfDay += 1;
    if (r.status === 'Absent') w.absent += 1;
    if (r.status === 'Leave') w.leave += 1;
    byWorker.set(r.workerId, w);

    const d = byDate.get(r.date) || { date: r.date, workers: 0, units: 0, amount: 0, unpaidAmount: 0 };
    if (r.units > 0) d.workers += 1;
    d.units += r.units;
    d.amount += r.amount;
    if (!r.paid) d.unpaidAmount += r.amount;
    byDate.set(r.date, d);
  });

  const amount = sum(rows, (r) => r.amount);
  const unpaid = rows.filter((r) => !r.paid);
  return {
    rows,
    totals: {
      amount,
      paidAmount: amount - sum(unpaid, (r) => r.amount),
      unpaidAmount: sum(unpaid, (r) => r.amount),
      units: sum(rows, (r) => r.units),
      presentDays: rows.filter((r) => r.status === 'Present').length,
      workerCount: byWorker.size,
      rowCount: rows.length,
      unpaidCount: unpaid.length,
    },
    byWorker: [...byWorker.values()],
    byDate: [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

function saveAttendance(projectId: string, date: string, entries: Row[]) {
  let saved = 0;
  entries.forEach((entry) => {
    const worker = findIn('workers', entry.workerId);
    if (!worker) return;
    const units = entry.units === '' || entry.units === undefined ? (entry.status === 'Present' ? 1 : entry.status === 'Half day' ? 0.5 : 0) : num(entry.units);
    const existing = col('attendance').find((a) => a.projectId === projectId && a.workerId === worker._id && a.date === date);
    const row = {
      projectId,
      date,
      workerId: worker._id,
      workerName: worker.fullName,
      trade: worker.trade,
      status: entry.status,
      units,
      rateType: worker.rateType,
      rate: worker.rate,
      amount: units * num(worker.rate),
      remarks: entry.remarks,
      recordedByName: user().fullName,
      paid: false,
    };
    if (existing) Object.assign(existing, row);
    else col('attendance').push({ _id: newId(), ...row });
    saved += 1;
  });
  return saved;
}

// ---------------------------------------------------------------------------
// Petty cash / subcontractors
// ---------------------------------------------------------------------------

function pettyCashList(projectId: string, params: Record<string, any>) {
  const all = byProject('pettyCash', projectId);
  const transactions = all.filter((t) => inRange(t.transactionDate, params)).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  const approved = all.filter((t) => t.status === 'Approved');
  const toppedUp = sum(approved.filter((t) => t.type === 'Top-up'), (t) => num(t.amount));
  const paidOut = sum(approved.filter((t) => t.type === 'Payment'), (t) => num(t.amount));
  const pending = all.filter((t) => t.status === 'Pending');
  const byCat: Record<string, Row> = {};
  approved.filter((t) => t.type === 'Payment').forEach((t) => {
    const key = t.category || 'other';
    byCat[key] = byCat[key] || { category: key, amount: 0, count: 0 };
    byCat[key].amount += num(t.amount);
    byCat[key].count += 1;
  });
  return {
    transactions,
    summary: {
      openingBalance: 0,
      toppedUp,
      paidOut,
      closingBalance: toppedUp - paidOut,
      pendingCount: pending.length,
      pendingAmount: sum(pending.filter((t) => t.type === 'Payment'), (t) => num(t.amount)),
      pendingTopUpAmount: sum(pending.filter((t) => t.type === 'Top-up'), (t) => num(t.amount)),
      byCategory: Object.values(byCat),
    },
    people: projectPeople(projectId).map((p: Row) => ({ userId: p.userId, name: p.name })),
  };
}

function subcontractorTotals(s: Row) {
  const payments = col('subcontractorPayments').filter((p) => p.subcontractorId === s._id);
  const paid = sum(payments.filter((p) => p.status === 'Approved'), (p) => num(p.amount));
  const pending = sum(payments.filter((p) => p.status === 'Pending'), (p) => num(p.amount));
  return { contractAmount: num(s.contractAmount), paid, pending, remaining: num(s.contractAmount) - paid, paymentCount: payments.length };
}

function projectPeople(projectId: string): Row[] {
  const project = findProject(projectId);
  return (project?.team || []).map((m: Row) => ({ userId: m.user._id, name: m.user.fullName, email: m.user.email, role: m.role, group: 'Project' }));
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

function listStock(filter: (r: Row) => boolean, params: Record<string, any>) {
  return col('inventory').filter((r) => {
    if (!filter(r)) return false;
    if (params.category && r.category !== params.category) return false;
    if (params.search && !`${r.name} ${r.materialCode}`.toLowerCase().includes(String(params.search).toLowerCase())) return false;
    return true;
  });
}

function adjustStock(item: Row, quantity: number, reason: string, movement?: string) {
  const change = movement === 'issued' ? -Math.abs(quantity) : movement === 'received' ? Math.abs(quantity) : quantity;
  item.currentStock = Math.max(0, num(item.currentStock) + change);
  item.updatedAt = now();
  col('inventoryTransactions').unshift({
    _id: newId(),
    itemId: item._id,
    type: movement || 'adjusted',
    direction: change >= 0 ? 'in' : 'out',
    quantity: Math.abs(change),
    balanceAfter: item.currentStock,
    sourceDocument: { type: 'Adjustment', id: item._id },
    remarks: reason,
    createdBy: { _id: DEMO_USER_ID, fullName: user().fullName },
    createdAt: now(),
  });
  return item;
}

function newStockItem(body: Row, extra: Row) {
  const { openingStock, ...rest } = body;
  return insert('inventory', {
    materialCode: `MAT-${String(col('inventory').length + 1).padStart(3, '0')}`,
    category: 'materials',
    unit: 'pc',
    isCustom: true,
    ...rest,
    ...extra,
    unitPrice: num(rest.unitPrice),
    minimumStock: num(rest.minimumStock),
    currentStock: num(openingStock ?? body.currentStock),
  });
}

function stockEndpoints(projectId: string): Row[] {
  const d = getDb();
  return [
    { key: 'main', kind: 'Main', label: 'Main store', isCurrentProject: false },
    ...d.projects.map((p) => ({ key: `project:${p._id}`, kind: 'Project', label: `${p.name} (site)`, projectId: p._id, isCurrentProject: p._id === projectId })),
    ...col('stockLocations').map((l) => ({
      key: `named:${l._id}`,
      kind: 'Named',
      namedKind: l.kind,
      label: l.name,
      projectId: l.projectId,
      locationId: l._id,
      isCurrentProject: l.projectId === projectId,
    })),
  ];
}

function companyInventoryOverview() {
  const d = getDb();
  const placeOf = (r: Row) => (r.location === 'Main' ? 'main' : r.location === 'Named' ? `named:${r.locationId}` : `project:${r.projectId}`);
  const places = stockEndpoints('').map((e) => {
    const items = col('inventory').filter((r) => placeOf(r) === e.key);
    const project = e.projectId ? findProject(e.projectId) : undefined;
    return {
      key: e.key,
      kind: e.kind === 'Main' ? 'Main' : e.kind === 'Project' ? 'Project' : (e as Row).namedKind || 'Store',
      label: e.label,
      projectId: e.projectId,
      projectName: project?.name,
      projectStatus: project?.status,
      items: items.length,
      value: sum(items, (r) => num(r.currentStock) * num(r.unitPrice)),
      lowStock: items.filter((r) => r.currentStock > 0 && r.currentStock < r.minimumStock).length,
      outOfStock: items.filter((r) => num(r.currentStock) <= 0).length,
    };
  });
  const materials = new Map<string, Row>();
  col('inventory').forEach((r) => {
    const key = (r.materialCode || r.name).toLowerCase();
    const m = materials.get(key) || { key, materialCode: r.materialCode, name: r.name, unit: r.unit, category: r.category, totalStock: 0, totalValue: 0, lowStock: false, outOfStock: false, places: [] };
    const low = r.currentStock < r.minimumStock;
    m.totalStock += num(r.currentStock);
    m.totalValue += num(r.currentStock) * num(r.unitPrice);
    m.lowStock = m.lowStock || low;
    m.outOfStock = m.totalStock <= 0;
    const place = places.find((p) => p.key === placeOf(r));
    m.places.push({ key: placeOf(r), label: place?.label || 'Store', stock: r.currentStock, unitPrice: r.unitPrice, low });
    materials.set(key, m);
  });
  return {
    company: { id: d.company._id, name: d.company.name },
    totals: {
      stores: places.filter((p) => p.kind === 'Main' || p.kind === 'Store').length,
      sites: places.filter((p) => p.kind === 'Project' || p.kind === 'Site').length,
      materials: materials.size,
      value: sum(places, (p) => p.value),
      lowStock: sum(places, (p) => p.lowStock),
      outOfStock: sum(places, (p) => p.outOfStock),
      pendingTransfers: col('stockTransfers').filter((t) => t.status === 'Pending').length,
    },
    places,
    materials: [...materials.values()],
    mainStore: { label: 'Main store', viaProjectId: d.projects[0]?._id || null, canManage: true, visible: true },
  };
}

// ---------------------------------------------------------------------------
// Access: the demo user may do everything
// ---------------------------------------------------------------------------

const ALL_PERMISSIONS = Object.values(Permissions) as string[];

const APPROVAL_ACTIONS = ['timeline', 'budgets', 'expenses', 'invoices', 'requests', 'otherRequests', 'purchaseOrders', 'receiving', 'stockTransfers', 'pettyCash', 'subcontractorPayments'];

function approvalInfo(projectId: string) {
  const project = findProject(projectId);
  const settings: Row = project?.mdApprovals || Object.fromEntries(APPROVAL_ACTIONS.map((a) => [a, true]));
  return {
    settings,
    actions: APPROVAL_ACTIONS.map((key) => ({ key, label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), description: '', available: true })),
    isMd: true,
    canManage: true,
    canApproveRequests: true,
    canApproveOtherRequests: true,
    canApprovePurchaseOrders: true,
    canReviewReceiving: true,
    canApproveStockTransfers: true,
    canApprovePettyCash: true,
    canApproveSubcontractorPayments: true,
    isOwner: true,
    canApproveOwn: true,
    canApproveExpenses: true,
    canRecordManualExpense: true,
    canManageManualExpenses: true,
    manualExpenses: { roles: ['Owner', 'ProjectManager', 'FinanceOfficer'], reference: '', roleOptions: ['Owner', 'ProjectManager', 'SiteEngineer', 'ProcurementOfficer', 'FinanceOfficer'] },
  };
}

function timelineAccess(projectId: string) {
  const project = findProject(projectId);
  return {
    canApproveStages: true,
    canApproveItems: true,
    canManageApprovers: true,
    approvers: [],
    isMd: true,
    lock: { status: 'Draft', mdRequired: false, canDecide: true, ...(project?.timelineLock || {}) },
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const routes: [string, string, Handler][] = [];
const on = (method: string, pattern: string, handler: Handler) => routes.push([method, pattern, handler]);

// --- Auth & user ---
on('POST', '/auth/login', () => ok({ user: user(), token: DEMO_TOKEN }, 'Login successful'));
on('GET', '/users/profile', () => ok(user()));
on('PATCH', '/users/profile', ({ body }) => ok(Object.assign(user(), body, { updatedAt: now() }), 'Profile updated'));
on('GET', '/users/search', ({ params }) => {
  const q = String(params.email || '').toLowerCase();
  return ok(getDb().users.filter((u) => !q || u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q)));
});
on('GET', '/users/admin/stats', () => ok({ totalUsers: getDb().users.length, totalCompanies: 1, totalProjects: getDb().projects.length }));

// --- Company ---
on('GET', '/companies/user/me', () => ok([getDb().company]));
on('GET', '/companies/:id/projects', () => ok(getDb().projects.map(withBudget)));
on('GET', '/companies/:id/invitations/pending', () => ok(col('companyInvitations')));
on('DELETE', '/companies/:id/invitations/:invId', ({ p }) => (remove('companyInvitations', p.invId), ok(null, 'Invitation cancelled')));
on('POST', '/companies/invitation', ({ body }) =>
  created(insert('companyInvitations', { email: body.email, role: body.role, status: 'pending', expiresAt: daysFromNow(7) }), 'Invitation sent (demo: no email is sent)')
);
on('PATCH', '/companies/:id/members/:memberId/role', ({ p, body }) => {
  const m = getDb().company.members.find((x: Row) => x._id === p.memberId || x.userId?._id === p.memberId);
  if (m) m.role = body.role;
  return ok(getDb().company, 'Role updated');
});
on('DELETE', '/companies/:id/members/:memberId', ({ p }) => {
  const c = getDb().company;
  c.members = c.members.filter((x: Row) => x._id !== p.memberId && x.userId?._id !== p.memberId);
  return ok(c, 'Member removed');
});
on('GET', '/companies/:id', () => ok(getDb().company));
on('PATCH', '/companies/:id', ({ body }) => ok(Object.assign(getDb().company, body, { updatedAt: now() }), 'Company updated'));
on('POST', '/companies', () => ok(getDb().company, 'Company created'));

// --- Projects ---
on('GET', '/projects/user/me', () => ok(getDb().projects.map(withBudget)));
on('GET', '/projects/admin', () => ok(getDb().projects.map(withBudget)));
on('POST', '/projects/invitation', ({ body }) => {
  insert('projectInvitations', { projectId: body.projectId, email: body.email, role: body.role, status: 'pending', expiresAt: daysFromNow(7) });
  return ok({ email: body.email, role: body.role, emailSent: false }, 'Invitation created (demo: no email is sent)');
});
on('GET', '/projects/invitation/pending/:projectId', ({ p }) => ok(byProject('projectInvitations', p.projectId)));
on('DELETE', '/projects/invitation/:projectId/:invId', ({ p }) => (remove('projectInvitations', p.invId), ok(null, 'Invitation cancelled')));
on('PATCH', '/projects/documents/review', ({ body }) => {
  const d = findIn('documents', body.documentId);
  if (d) d.status = body.status;
  return ok(d, 'Document reviewed');
});
on('POST', '/projects', ({ body }) => {
  const project = stamp({
    _id: newId(),
    name: body.name || 'New project',
    projectCode: body.projectCode || `PRJ-${getDb().projects.length + 1}`,
    projectDescription: body.projectDescription || body.description || '',
    status: body.status || 'Planning',
    type: body.type || 'Capital',
    team: [{ _id: newId(), role: 'Owner', user: user() }],
    progress: num(body.progress),
    budget: 0,
    clientName: body.clientName,
    contractAmount: num(body.contractAmount),
    contactName: body.contactName,
    contactPhone: body.contactPhone,
    contactEmail: body.contactEmail,
    contract: body.contractAmount ? { amount: num(body.contractAmount) } : undefined,
    documents: [],
    __v: 0,
  });
  getDb().projects.unshift(project);
  if (num(body.budget) > 0) {
    insert('budgets', {
      projectId: project._id,
      fiscalYear: new Date().getFullYear(),
      materialsBudget: num(body.budget),
      laborBudget: 0,
      equipmentBudget: 0,
      fuelBudget: 0,
      overheadsBudget: 0,
      subcontractorsBudget: 0,
      totalPlannedBudget: num(body.budget),
      approvalStatus: 'pending',
    });
  }
  return created(withBudget(project), 'Project created');
});
on('GET', '/projects/:id/financials', ({ p, params }) => (findProject(p.id) ? ok(projectFinancials(p.id, params)) : fail(404, 'Project not found')));
on('GET', '/projects/:id/access', ({ p }) => {
  const project = findProject(p.id);
  return ok({
    areas: [],
    canManage: true,
    me: { role: 'Owner', actions: ALL_PERMISSIONS, scopeActions: ALL_PERMISSIONS },
    members: (project?.team || []).map((m: Row) => ({ userId: m.user._id, fullName: m.user.fullName, email: m.user.email, role: m.role, access: {}, fromRole: {}, customised: [] })),
  });
});
on('PUT', '/projects/:id/team/:userId/access', ({ p, body }) => ok({ userId: p.userId, role: 'Member', access: body.access || {}, fromRole: {}, customised: [] }, 'Access updated'));
on('GET', '/projects/:id/documents', ({ p, params }) => {
  let docs = byProject('documents', p.id);
  if (params.type) docs = docs.filter((d) => d.type === params.type);
  return ok(docs.filter((d) => inRange(d.date, params)));
});
on('DELETE', '/projects/:id/documents', ({ body }) => (remove('documents', body.documentId), ok(null, 'Document deleted')));
on('PUT', '/projects/:id/contract', ({ p, body }) => {
  const project = findProject(p.id);
  if (!project) return fail(404, 'Project not found');
  const { removeDocument: _ignored, ...contract } = body;
  project.contract = { ...(project.contract || {}), ...contract, amount: num(body.amount) };
  project.contractAmount = num(body.amount);
  return ok(withBudget(project), 'Contract saved');
});
on('GET', '/projects/:id', ({ p }) => {
  const project = findProject(p.id);
  return project ? ok(withBudget(project)) : fail(404, 'Project not found');
});
on('PATCH', '/projects/:id', ({ p, body }) => {
  const project = findProject(p.id);
  if (!project) return fail(404, 'Project not found');
  const { team: _team, file: _file, budget: _budget, ...changes } = body;
  if (changes.contractAmount !== undefined) changes.contractAmount = num(changes.contractAmount);
  if (changes.progress !== undefined) changes.progress = num(changes.progress);
  Object.assign(project, changes, { updatedAt: now() });
  return ok(withBudget(project), 'Project updated');
});
on('DELETE', '/projects/:id', ({ p }) => {
  const d = getDb();
  d.projects = d.projects.filter((x) => x._id !== p.id);
  return ok(null, 'Project deleted');
});

// --- Dashboard ---
on('GET', '/dashboard/summary', () => {
  const d = getDb();
  const byStatus: Record<string, number> = {};
  d.projects.forEach((p) => (byStatus[p.status] = (byStatus[p.status] || 0) + 1));
  const totalBudget = sum(d.projects, (p) => num(budgetOf(p._id)?.totalPlannedBudget));
  const totalExpenses = sum(approvedExpenses(), (e) => num(e.amount));
  return ok({
    totalProjects: d.projects.length,
    projectsByStatus: byStatus,
    financials: {
      totalBudget,
      totalExpenses,
      totalRemainingBudget: totalBudget - totalExpenses,
      overallBudgetUtilization: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
    },
  });
});
on('GET', '/dashboard/projects-health', ({ params }) => {
  const health = projectsHealth();
  if (params.status) health.projects = health.projects.filter((p) => p.status === params.status);
  return ok(health);
});
on('GET', '/dashboard/profit-loss', ({ params }) => ok(profitLoss(params.projectId, params)));
on('GET', '/dashboard/procurement-analytics', () =>
  ok({ materialRequestCount: col('materialRequests').length, purchaseOrderCount: col('purchaseOrders').length, supplierPerformance: { onTimeDeliveryPercentage: '92' } })
);
on('GET', '/dashboard/document-workflow', () => {
  const docs = col('documents');
  const approved = docs.filter((d) => d.status === 'approved').length;
  return ok({
    totalDocuments: docs.length,
    approved,
    pending: docs.filter((d) => d.status === 'pending').length,
    approvalRate: String(docs.length ? Math.round((approved / docs.length) * 100) : 0),
    averageApprovalTimeDays: '1.8',
  });
});
on('GET', '/dashboard/performance-matrix', () => ok({ riskScore: '28', onTimeDeliveryPercentage: '92', stockHealthPercentage: '80', predictedCompletionDate: daysFromNow(310) }));
on('GET', '/dashboard/timeline-trends', () => {
  const stages = col('stages');
  return ok({
    totalStages: stages.length,
    completedStages: stages.filter((s) => s.status === 'Completed').length,
    averageProgress: String(stages.length ? Math.round(sum(stages, (s) => num(s.progressPercentage)) / stages.length) : 0),
    averageDelayDays: '3',
  });
});
on('GET', '/dashboard/advanced-analytics', () => {
  const health = projectsHealth();
  const onTrack = health.projects.filter((p) => p.healthScore === 'Healthy').length;
  return ok({
    budgetEfficiencyPercentage: '94',
    costVariancePercentage: '-3.2',
    procurementVelocityPercentage: '87',
    projectsOnTrackPercentage: String(health.projects.length ? Math.round((onTrack / health.projects.length) * 100) : 0),
  });
});
on('GET', '/dashboard/cash-flow', () => {
  const pl = profitLoss(undefined, {});
  const months = monthLabels(6);
  const paid = months.map((m) => sum(col('invoices').filter((i) => i.status === 'paid' && (i.paidAt || '').slice(0, 7) === m.key), (i) => num(i.totalAmount)));
  return ok({
    labels: months.map((m) => m.label),
    datasets: [
      { label: 'Income', data: paid },
      { label: 'Expenses', data: pl.trend.expenses },
    ],
  });
});
on('GET', '/dashboard/bidding-analytics', () => ok({ totalTenders: 0, activeTenders: 0, totalBids: 0, awardedBids: 0, avgBidsPerTender: '0' }));

// --- Notifications ---
on('GET', '/notifications', ({ params }) => {
  const items = [...col('notifications')].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, num(params.limit) || 20);
  return ok({ items, unreadCount: col('notifications').filter((n) => !n.read).length });
});
on('PATCH', '/notifications/read-all', () => (col('notifications').forEach((n) => (n.read = true)), ok(null)));
on('PATCH', '/notifications/:id/read', ({ p }) => ok(update('notifications', p.id, { read: true })));
on('DELETE', '/notifications/:id', ({ p }) => (remove('notifications', p.id), ok(null)));

// --- Approvals ---
on('GET', '/approvals/projects/:id', ({ p }) => ok(approvalInfo(p.id)));
on('PUT', '/approvals/projects/:id/manual-expenses', ({ p }) => ok(approvalInfo(p.id), 'Updated'));
on('PUT', '/approvals/projects/:id', ({ p, body }) => {
  const project = findProject(p.id);
  if (project) project.mdApprovals = { ...approvalInfo(p.id).settings, ...body };
  return ok(approvalInfo(p.id), 'Approval settings updated');
});

// --- Budget ---
on('GET', '/finance/budget/:projectId/summary', ({ p }) => ok(budgetSummary(p.projectId)));
on('GET', '/finance/budget/:projectId/report', ({ p }) => ok({ summary: budgetSummary(p.projectId), expenses: byProject('expenses', p.projectId) }));
on('POST', '/finance/budget/:projectId/check-thresholds', () => ok({ alerts: [] }, 'No thresholds crossed'));
on('POST', '/finance/budget/:projectId/send-report', () => ok(null, 'Demo: the report would be emailed here'));
on('PATCH', '/finance/budget/:id/approval-status', ({ p, body }) => ok(update('budgets', p.id, { approvalStatus: body.status }), 'Budget status updated'));
on('PATCH', '/finance/budget/:id', ({ p, body }) => {
  const row = update('budgets', p.id, normaliseBudget(body));
  return row ? ok(row, 'Budget updated') : fail(404, 'Budget not found');
});
on('GET', '/finance/budget/:projectId', ({ p }) => {
  const b = budgetOf(p.projectId);
  return b ? ok(b) : fail(404, 'No budget found for this project');
});
on('POST', '/finance/budget', ({ body }) => {
  const existing = budgetOf(body.projectId);
  if (existing) return ok(update('budgets', existing._id, normaliseBudget(body)), 'Budget updated');
  return created(insert('budgets', { approvalStatus: 'pending', ...normaliseBudget(body) }), 'Budget created');
});

function normaliseBudget(body: Row) {
  const out: Row = { ...body };
  ['materialsBudget', 'laborBudget', 'equipmentBudget', 'fuelBudget', 'overheadsBudget', 'subcontractorsBudget', 'totalPlannedBudget'].forEach((k) => {
    if (out[k] !== undefined) out[k] = num(out[k]);
  });
  if (out.totalPlannedBudget === undefined || out.totalPlannedBudget === 0) {
    const total = num(out.materialsBudget) + num(out.laborBudget) + num(out.equipmentBudget) + num(out.fuelBudget) + num(out.overheadsBudget) + num(out.subcontractorsBudget);
    if (total > 0) out.totalPlannedBudget = total;
  }
  return out;
}

// --- Expenses ---
on('GET', '/finance/expense/:projectId/report', ({ p }) => {
  const exp = approvedExpenses(p.projectId);
  const total = sum(exp, (e) => num(e.amount));
  const byCat: Record<string, number> = {};
  exp.forEach((e) => (byCat[e.category] = (byCat[e.category] || 0) + num(e.amount)));
  const byDate: Record<string, number> = {};
  exp.forEach((e) => (byDate[e.date.slice(0, 10)] = (byDate[e.date.slice(0, 10)] || 0) + num(e.amount)));
  return ok({
    totalExpenses: total,
    expensesByCategory: Object.entries(byCat).map(([category, amount]) => ({ category, amount, percentage: total ? (amount / total) * 100 : 0 })),
    expensesByDate: Object.entries(byDate).map(([date, amount]) => ({ date, amount })),
  });
});
on('PATCH', '/finance/expense/:id/approval-status', ({ p, body }) =>
  ok(update('expenses', p.id, { approvalStatus: body.status, approval: { reviewedBy: DEMO_USER_ID, reviewedByName: user().fullName, reviewedAt: now(), comment: body.comments } }), `Expense ${body.status}`)
);
on('GET', '/finance/expense/:id', ({ p, params }) => {
  if (findProject(p.id)) {
    let rows = byProject('expenses', p.id).filter((e) => inRange(e.date, params));
    if (params.category) rows = rows.filter((e) => e.category === params.category);
    if (params.status) rows = rows.filter((e) => e.approvalStatus === params.status);
    if (params.source) rows = rows.filter((e) => (e.source?.kind || 'Manual') === params.source);
    return ok(rows.sort((a, b) => b.date.localeCompare(a.date)));
  }
  const row = findIn('expenses', p.id);
  return row ? ok(row) : fail(404, 'Expense not found');
});
on('POST', '/finance/expense', ({ body }) =>
  created(
    insert('expenses', {
      ...body,
      amount: num(body.amount),
      date: body.date || now(),
      documents: [],
      approvalStatus: 'pending',
      source: { kind: 'Manual' },
    }),
    'Expense recorded – awaiting approval'
  )
);
on('PATCH', '/finance/expense/:id', ({ p, body }) => ok(update('expenses', p.id, { ...body, ...(body.amount !== undefined ? { amount: num(body.amount) } : {}) }), 'Expense updated'));
on('DELETE', '/finance/expense/:id', ({ p }) => (remove('expenses', p.id), ok(null, 'Expense deleted')));

// --- Invoices ---
on('PATCH', '/finance/invoice/:id/status', ({ p, body }) => {
  const changes: Row = { status: body.status };
  if (body.status === 'approved') changes.approvalWorkflow = { approvedBy: DEMO_USER_ID, approvedAt: now(), comments: body.comments };
  if (body.status === 'paid') changes.paidAt = now();
  return ok(update('invoices', p.id, changes), `Invoice ${body.status}`);
});
on('POST', '/finance/invoice/:id/void', ({ p, body }) => ok(update('invoices', p.id, { status: 'void', voidedAt: now(), voidReason: body.reason }), 'Invoice voided'));
on('GET', '/finance/invoice/:projectId', ({ p, params }) => {
  let rows = byProject('invoices', p.projectId).filter((i) => inRange(i.invoiceDate || i.createdAt, params));
  if (params.status) rows = rows.filter((i) => i.status === params.status);
  if (params.type) rows = rows.filter((i) => i.type === params.type);
  return ok(rows.sort((a, b) => (b.invoiceDate || b.createdAt).localeCompare(a.invoiceDate || a.createdAt)));
});
on('POST', '/finance/invoice', ({ body }) => {
  const items = (Array.isArray(body.invoiceItems) ? body.invoiceItems : []).map((i: Row) => ({ ...i, amount: num(i.amount) || num(i.quantity) * num(i.unitPrice ?? i.rate) }));
  const count = byProject('invoices', body.projectId).length + 1;
  const project = findProject(body.projectId);
  return created(
    insert('invoices', {
      ...body,
      invoiceItems: items,
      invoiceNumber: `${(project?.projectCode || 'INV').split('-')[0]}-IPC-${String(count).padStart(3, '0')}`,
      totalAmount: sum(items, (i: Row) => num(i.amount)),
      documents: [],
      status: 'pending',
      issuerId: DEMO_USER_ID,
      invoiceDate: body.invoiceDate || now(),
      approvalWorkflow: {},
    }),
    'Invoice created'
  );
});

// --- Bill of quantities ---
function boqOf(projectId: string) {
  return byProject('boqs', projectId)[0];
}
function normaliseBoq(sections: Row[]) {
  return (sections || []).map((s) => {
    const items = (s.items || []).map((i: Row) => ({ _id: i._id || newId(), ...i, quantity: num(i.quantity), rate: num(i.rate), amount: num(i.quantity) * num(i.rate), completedQuantity: num(i.completedQuantity) }));
    return { _id: s._id || newId(), sectionName: s.sectionName, items, subTotal: sum(items, (i: Row) => i.amount) };
  });
}
function saveBoq(projectId: string, sections: Row[], imports?: Row[]) {
  const normalised = normaliseBoq(sections);
  const existing = boqOf(projectId);
  const values = { sections: normalised, grandTotal: sum(normalised, (s) => s.subTotal), ...(imports ? { imports } : {}) };
  if (existing) return update('boqs', existing._id, values)!;
  return insert('boqs', { projectId, imports: [], ...values });
}
on('POST', '/finance/boq/:projectId/import', ({ p, body }) => {
  const existing = boqOf(p.projectId);
  const importId = newId();
  const incoming = (body.sections || []).map((s: Row) => ({ ...s, items: (s.items || []).map((i: Row) => ({ ...i, importId })) }));
  const sections = body.mode === 'replace' || !existing ? incoming : [...existing.sections, ...incoming];
  const imports = [...(existing?.imports || []), { _id: importId, fileName: body.fileName, sheets: body.sheets || [], importedBy: { _id: DEMO_USER_ID, fullName: user().fullName }, importedAt: now() }];
  return ok(saveBoq(p.projectId, sections, imports), 'BoQ imported');
});
on('DELETE', '/finance/boq/:projectId/imports/:importId', ({ p }) => {
  const existing = boqOf(p.projectId);
  if (!existing) return fail(404, 'BoQ not found');
  const sections = existing.sections.map((s: Row) => ({ ...s, items: s.items.filter((i: Row) => i.importId !== p.importId) })).filter((s: Row) => s.items.length);
  return ok(saveBoq(p.projectId, sections, (existing.imports || []).filter((i: Row) => i._id !== p.importId)), 'Import removed');
});
on('PATCH', '/finance/boq/:id/progress', ({ p, body }) => {
  for (const boq of col('boqs')) {
    for (const s of boq.sections) {
      const item = s.items.find((i: Row) => i._id === p.id);
      if (item) {
        item.completedQuantity = num(body.completedQuantity);
        boq.updatedAt = now();
        return ok(boq, 'Progress updated');
      }
    }
  }
  return fail(404, 'BoQ item not found');
});
on('GET', '/finance/boq/:projectId', ({ p }) => {
  const boq = boqOf(p.projectId);
  return boq ? ok(boq) : fail(404, 'No BoQ for this project yet');
});
on('DELETE', '/finance/boq/:projectId', ({ p }) => {
  const boq = boqOf(p.projectId);
  if (boq) remove('boqs', boq._id);
  return ok(null, 'BoQ deleted');
});
on('POST', '/finance/boq', ({ body }) => ok(saveBoq(body.projectId, body.sections || []), 'BoQ saved'));

// --- Work done (from the BoQ) ---
on('GET', '/finance/work-records/project/:projectId/day', ({ p, params }) => {
  const boq = boqOf(p.projectId);
  const date = String(params.date || now().slice(0, 10));
  const sheet = col('workRecords').find((w) => w.projectId === p.projectId && w.date === date);
  const items = (boq?.sections || []).flatMap((s: Row) =>
    s.items.map((i: Row) => ({
      boqItemId: i._id,
      sectionName: s.sectionName,
      description: i.description,
      unit: i.unit,
      rate: i.rate,
      boqQuantity: i.quantity,
      doneBefore: i.completedQuantity,
      quantity: num(sheet?.lines?.find((l: Row) => l.boqItemId === i._id)?.quantity),
      amount: num(sheet?.lines?.find((l: Row) => l.boqItemId === i._id)?.quantity) * i.rate,
      invoiceId: null,
    }))
  );
  return ok({ date, remarks: sheet?.remarks || '', recordedByName: sheet ? user().fullName : undefined, updatedAt: sheet?.updatedAt, items });
});
on('PUT', '/finance/work-records/project/:projectId/day/:date', ({ p, body }) => {
  const existing = col('workRecords').find((w) => w.projectId === p.projectId && w.date === p.date);
  if (existing) Object.assign(existing, { lines: body.lines, remarks: body.remarks, updatedAt: now() });
  else insert('workRecords', { projectId: p.projectId, date: p.date, lines: body.lines, remarks: body.remarks });
  return ok({ date: p.date, remarks: body.remarks || '', items: [] }, 'Work recorded');
});
on('GET', '/finance/work-records/project/:projectId/summary', ({ p, params }) => {
  const records = col('workRecords').filter((w) => w.projectId === p.projectId && inRange(w.date, params));
  const boq = boqOf(p.projectId);
  const lookup = new Map<string, Row>();
  (boq?.sections || []).forEach((s: Row) => s.items.forEach((i: Row) => lookup.set(i._id, { ...i, sectionName: s.sectionName })));
  const totals = new Map<string, number>();
  records.forEach((r) => (r.lines || []).forEach((l: Row) => totals.set(l.boqItemId, (totals.get(l.boqItemId) || 0) + num(l.quantity))));
  const items = [...totals.entries()].filter(([id]) => lookup.has(id)).map(([id, qty]) => {
    const i = lookup.get(id)!;
    return { boqItemId: id, sectionName: i.sectionName, description: i.description, unit: i.unit, rate: i.rate, quantity: qty, amount: qty * i.rate, invoicedQuantity: 0, invoicedAmount: 0, uninvoicedQuantity: qty, uninvoicedAmount: qty * i.rate };
  });
  const amount = sum(items, (i) => i.amount);
  return ok({
    startDate: params.startDate || null,
    endDate: params.endDate || null,
    totals: { amount, invoiced: 0, uninvoiced: amount, days: records.length },
    items,
    days: records.map((r) => {
      const a = sum(r.lines || [], (l: Row) => num(l.quantity) * num(lookup.get(l.boqItemId)?.rate));
      return { date: r.date, items: (r.lines || []).length, amount: a, invoicedAmount: 0, uninvoicedAmount: a, invoiceNumbers: [], recordedByName: user().fullName };
    }),
    invoices: [],
  });
});

// --- Timeline ---
on('GET', '/timeline/project-stages/:projectId', ({ p }) =>
  ok(byProject('stages', p.projectId).sort((a, b) => (a.wbsCode || '').localeCompare(b.wbsCode || '', undefined, { numeric: true })))
);
on('GET', '/timeline/access/:projectId', ({ p }) => ok(timelineAccess(p.projectId)));
on('PUT', '/timeline/approvers/:projectId', ({ p }) => ok(timelineAccess(p.projectId), 'Approvers updated'));
on('POST', '/timeline/lock/:projectId/:action', ({ p, body }) => {
  const project = findProject(p.projectId);
  const status = p.action === 'submit' ? 'Submitted' : p.action === 'approve' ? 'Locked' : 'Draft';
  if (project) project.timelineLock = { status, note: body.note, decidedAt: now(), decidedBy: user() };
  return ok(timelineAccess(p.projectId).lock, `Timeline ${status.toLowerCase()}`);
});
on('GET', '/timeline/stage-templates', () =>
  ok([
    { stage: 'Preliminaries', wbsCode: '1', subStages: [{ name: 'Site establishment', tasks: ['Hoarding', 'Site office'] }, { name: 'Setting out' }] },
    { stage: 'Construction', wbsCode: '5', subStages: [{ name: 'Substructure' }, { name: 'Superstructure' }, { name: 'Finishes' }] },
  ])
);
on('POST', '/timeline/project-stage', ({ body }) => {
  const subs = (body.subStages || []).map((s: Row) => ({ ...newWorkItem(s), tasks: (s.tasks || []).map(newWorkItem) }));
  const stage = insert('stages', {
    ...body,
    wbsCode: String(byProject('stages', body.projectId).length + 1),
    budget: num(body.budget),
    actualCost: num(body.actualCost),
    progressPercentage: num(body.progressPercentage),
    subStages: subs,
    approval: { status: 'Pending' },
    alertSettings: body.alertSettings || { email: true, sms: false },
  });
  return created(rollUpStage(stage), 'Stage created');
});
on('GET', '/timeline/progress-tracking/:projectId', ({ p }) => ok(byProject('progressReports', p.projectId)));
on('POST', '/timeline/progress-tracking', ({ body }) => created(insert('progressReports', { ...body, stageProgress: body.stageProgress || [] }), 'Progress report saved'));
on('PATCH', '/timeline/progress-tracking/:id', ({ p, body }) => ok(update('progressReports', p.id, body), 'Progress report updated'));
on('DELETE', '/timeline/progress-tracking/:id', ({ p }) => (remove('progressReports', p.id), ok(null, 'Deleted')));

on('POST', '/timeline/project-stage/:stageId/apply-template', ({ p }) => {
  const stage = findIn('stages', p.stageId);
  if (!stage) return fail(404, 'Stage not found');
  stage.subStages = [...(stage.subStages || []), newWorkItem({ name: 'Standard activity 1' }), newWorkItem({ name: 'Standard activity 2' })];
  return ok(rollUpStage(stage), 'Template applied');
});
on('PATCH', '/timeline/project-stage/:stageId/progress', ({ p, body }) => {
  const stage = findIn('stages', p.stageId);
  if (!stage) return fail(404, 'Stage not found');
  const sub = body.subStageId ? stage.subStages?.find((s: Row) => s._id === body.subStageId) : null;
  const task = body.taskId ? sub?.tasks?.find((t: Row) => t._id === body.taskId) : null;
  setProgress(task || sub || stage, num(body.progressPercentage), body.status, body.note);
  return ok(rollUpStage(stage), 'Progress updated');
});
on('PUT', '/timeline/project-stage/:stageId/sub-stages/order', ({ p, body }) => {
  const stage = findIn('stages', p.stageId);
  if (!stage) return fail(404, 'Stage not found');
  const ids: string[] = body.ids || [];
  stage.subStages = [...stage.subStages].sort((a: Row, b: Row) => ids.indexOf(a._id) - ids.indexOf(b._id));
  return ok(stage);
});
on('POST', '/timeline/project-stage/:stageId/sub-stages', ({ p, body }) => {
  const stage = findIn('stages', p.stageId);
  if (!stage) return fail(404, 'Stage not found');
  stage.subStages = [...(stage.subStages || []), newWorkItem(body)];
  return ok(rollUpStage(stage), 'Sub-stage added');
});
on('PUT', '/timeline/project-stage/:stageId/sub-stages/:subId/tasks/order', (ctx) => {
  const { stage, sub } = stageAndItem(ctx.p);
  if (!stage || !sub) return fail(404, 'Not found');
  const ids: string[] = ctx.body.ids || [];
  sub.tasks = [...(sub.tasks || [])].sort((a: Row, b: Row) => ids.indexOf(a._id) - ids.indexOf(b._id));
  return ok(stage);
});
on('POST', '/timeline/project-stage/:stageId/sub-stages/:subId/tasks', (ctx) => {
  const { stage, sub } = stageAndItem(ctx.p);
  if (!stage || !sub) return fail(404, 'Not found');
  sub.tasks = [...(sub.tasks || []), newWorkItem(ctx.body)];
  return ok(rollUpStage(stage), 'Task added');
});
on('PATCH', '/timeline/project-stage/:stageId/sub-stages/:subId/tasks/:taskId/completion', (ctx) => {
  const { stage, task } = stageAndItem(ctx.p);
  if (!stage || !task) return fail(404, 'Not found');
  setProgress(task, ctx.body.done ? 100 : 0);
  return ok(rollUpStage(stage));
});
on('PATCH', '/timeline/project-stage/:stageId/sub-stages/:subId/tasks/:taskId/review', (ctx) => {
  const { stage, task } = stageAndItem(ctx.p);
  if (!stage || !task) return fail(404, 'Not found');
  task.approval = { status: ctx.body.status, comment: ctx.body.comment, reviewedBy: user(), reviewedAt: now() };
  return ok(rollUpStage(stage));
});
on('PATCH', '/timeline/project-stage/:stageId/sub-stages/:subId/tasks/:taskId', (ctx) => {
  const { stage, task } = stageAndItem(ctx.p);
  if (!stage || !task) return fail(404, 'Not found');
  Object.assign(task, ctx.body, { updatedAt: now() });
  if (ctx.body.progressPercentage !== undefined) setProgress(task, num(ctx.body.progressPercentage), ctx.body.status);
  return ok(rollUpStage(stage), 'Task updated');
});
on('DELETE', '/timeline/project-stage/:stageId/sub-stages/:subId/tasks/:taskId', (ctx) => {
  const { stage, sub } = stageAndItem(ctx.p);
  if (!stage || !sub) return fail(404, 'Not found');
  sub.tasks = (sub.tasks || []).filter((t: Row) => t._id !== ctx.p.taskId);
  return ok(rollUpStage(stage), 'Task deleted');
});
on('PATCH', '/timeline/project-stage/:stageId/sub-stages/:subId/completion', (ctx) => {
  const { stage, sub } = stageAndItem(ctx.p);
  if (!stage || !sub) return fail(404, 'Not found');
  setProgress(sub, ctx.body.done ? 100 : 0);
  (sub.tasks || []).forEach((t: Row) => setProgress(t, ctx.body.done ? 100 : t.progressPercentage));
  return ok(rollUpStage(stage));
});
on('PATCH', '/timeline/project-stage/:stageId/sub-stages/:subId/review', (ctx) => {
  const { stage, sub } = stageAndItem(ctx.p);
  if (!stage || !sub) return fail(404, 'Not found');
  sub.approval = { status: ctx.body.status, comment: ctx.body.comment, reviewedBy: user(), reviewedAt: now() };
  return ok(rollUpStage(stage));
});
on('PATCH', '/timeline/project-stage/:stageId/sub-stages/:subId', (ctx) => {
  const { stage, sub } = stageAndItem(ctx.p);
  if (!stage || !sub) return fail(404, 'Not found');
  Object.assign(sub, ctx.body, { updatedAt: now() });
  if (ctx.body.progressPercentage !== undefined) setProgress(sub, num(ctx.body.progressPercentage), ctx.body.status);
  return ok(rollUpStage(stage), 'Sub-stage updated');
});
on('DELETE', '/timeline/project-stage/:stageId/sub-stages/:subId', (ctx) => {
  const stage = findIn('stages', ctx.p.stageId);
  if (!stage) return fail(404, 'Stage not found');
  stage.subStages = (stage.subStages || []).filter((s: Row) => s._id !== ctx.p.subId);
  return ok(rollUpStage(stage), 'Sub-stage deleted');
});
on('PATCH', '/timeline/project-stage/:id/review', ({ p, body }) => {
  const stage = findIn('stages', p.id);
  if (!stage) return fail(404, 'Stage not found');
  stage.approval = { status: body.status, comment: body.comment, reviewedBy: user(), reviewedAt: now() };
  return ok(rollUpStage(stage), `Stage ${String(body.status).toLowerCase()}`);
});
on('PATCH', '/timeline/project-stage/:id', ({ p, body }) => {
  const stage = findIn('stages', p.id);
  if (!stage) return fail(404, 'Stage not found');
  const { subStages: _ignored, ...changes } = body;
  Object.assign(stage, changes);
  if (body.progressPercentage !== undefined && !stage.subStages?.length) setProgress(stage, num(body.progressPercentage), body.status);
  return ok(rollUpStage(stage), 'Stage updated');
});
on('DELETE', '/timeline/project-stage/:id', ({ p }) => {
  const stage = findIn('stages', p.id);
  remove('stages', p.id);
  const project = stage && findProject(stage.projectId);
  if (project) project.progress = projectProgress(project._id);
  return ok(null, 'Stage deleted');
});

// --- Procurement ---
on('GET', '/procurement/material-requests/project/:projectId', ({ p }) => ok(paginated(byProject('materialRequests', p.projectId))));
on('PATCH', '/procurement/material-requests/:id/review', ({ p, body }) => {
  const row = findIn('materialRequests', p.id);
  if (!row) return fail(404, 'Request not found');
  row.status = body.status;
  row.approval = { reviewedBy: user(), reviewedAt: now(), comment: body.comment };
  row.history = [...(row.history || []), historyEntry(body.status, body.comment)];
  if (body.status === 'Approved' && row.requestType === 'Other') {
    (row.materialDetails || []).forEach((m: Row, i: number) => {
      const line = (body.lines || []).find((l: Row) => l.index === i);
      insert('expenses', {
        projectId: row.projectId,
        date: now(),
        category: line?.category || m.category || 'overheads',
        amount: num(line?.estimatedCost ?? m.estimatedCost),
        description: m.materialName,
        documents: [],
        approvalStatus: 'approved',
        source: { kind: 'Request', refId: row._id },
      });
    });
  }
  return ok(row, `Request ${String(body.status).toLowerCase()}`);
});
on('POST', '/procurement/material-requests', ({ body }) =>
  created(
    insert('materialRequests', {
      requestType: 'Material',
      ...body,
      requestDate: body.requestDate || now(),
      materialDetails: (body.materialDetails || []).map((m: Row) => ({ ...m, quantity: num(m.quantity), estimatedCost: num(m.estimatedCost) })),
      status: 'Pending',
      requestedBy: user(),
      history: [historyEntry('Requested')],
    }),
    'Request submitted'
  )
);
on('GET', '/procurement/material-requests/:id', ({ p }) => ok(findIn('materialRequests', p.id)));
on('PATCH', '/procurement/material-requests/:id', ({ p, body }) => ok(update('materialRequests', p.id, body), 'Request updated'));
on('DELETE', '/procurement/material-requests/:id', ({ p }) => (remove('materialRequests', p.id), ok(null, 'Request deleted')));
on('GET', '/procurement/purchase-orders/:id', ({ p }) => ok(findIn('purchaseOrders', p.id)));
on('PATCH', '/procurement/purchase-orders/:id', ({ p, body }) => ok(update('purchaseOrders', p.id, body), 'Purchase order updated'));
on('DELETE', '/procurement/purchase-orders/:id', ({ p }) => (remove('purchaseOrders', p.id), ok(null, 'Purchase order deleted')));
on('GET', '/procurement/purchase-orders/project/:projectId', ({ p }) => ok(paginated(byProject('purchaseOrders', p.projectId))));
on('PATCH', '/procurement/purchase-orders/:id/approve', ({ p, body }) => {
  const po = findIn('purchaseOrders', p.id);
  if (!po) return fail(404, 'Purchase order not found');
  po.status = 'Approved';
  po.approval = { approvedBy: user(), approvedAt: now(), comment: body.comment, signature: { signerName: body.signerName, signerTitle: body.signerTitle, image: body.signatureImage } };
  po.history = [...(po.history || []), historyEntry('Approved', body.comment)];
  if (!po.expenseRecorded) {
    po.expenseRecorded = true;
    insert('expenses', {
      projectId: po.projectId,
      date: now(),
      category: 'materials',
      amount: num(po.totalCost),
      description: `${po.poNumber} – ${po.supplierDetails}`,
      documents: [],
      approvalStatus: 'approved',
      source: { kind: 'PurchaseOrder', refId: po._id, reference: po.poNumber },
    });
  }
  return ok(po, 'Purchase order approved');
});
on('PATCH', '/procurement/purchase-orders/:id/return-to-draft', ({ p }) => ok(update('purchaseOrders', p.id, { status: 'Draft' }), 'Returned to draft'));
on('POST', '/procurement/purchase-orders', ({ body }) => {
  const list = (Array.isArray(body.materialList) ? body.materialList : []).map((m: Row) => ({ _id: newId(), ...m, quantity: num(m.quantity), unitPrice: num(m.unitPrice) }));
  return created(
    insert('purchaseOrders', {
      ...body,
      materialList: list,
      totalCost: num(body.totalCost) || sum(list, (m: Row) => m.quantity * m.unitPrice),
      orderDate: body.orderDate || now(),
      expenseRecorded: false,
      status: 'Draft',
      history: [historyEntry('Created')],
    }),
    'Purchase order created'
  );
});

// --- Inventory ---
on('GET', '/finance/inventory/company/overview', () => ok(companyInventoryOverview()));
on('GET', '/finance/inventory/access/:projectId', () => ok({ canAdjustProjectStock: true, canManageMainStock: true, canApproveStockTransfers: true, isOwner: true, mainStore: { label: 'Main store' } }));
on('GET', '/finance/inventory/:place/:projectId/movement-totals', () => ok([]));
on('POST', '/finance/inventory/:place/:projectId/import', ({ p, body }) => {
  const rows: Row[] = body.rows || [];
  rows.forEach((r) =>
    newStockItem(
      { name: r.name || r.Name || 'Item', materialCode: r.materialCode || r.code, unit: r.unit || 'pc', unitPrice: r.unitPrice || r.price, minimumStock: r.minimumStock, openingStock: r.openingStock || r.stock || r.quantity },
      p.place === 'main' ? { location: 'Main' } : { location: 'Project', projectId: p.projectId }
    )
  );
  return ok({ created: rows.length, added: 0, skipped: 0, skippedNames: [] }, 'Items imported');
});
on('GET', '/finance/inventory/project/:projectId', ({ p, params }) => ok(listStock((r) => r.location !== 'Main' && r.location !== 'Named' && r.projectId === p.projectId, params)));
on('GET', '/finance/inventory/main/:projectId', ({ params }) => ok(listStock((r) => r.location === 'Main', params)));
on('POST', '/finance/inventory/main/:projectId/items/:id/adjust', ({ p, body }) => {
  const item = findIn('inventory', p.id);
  return item ? ok(adjustStock(item, num(body.quantity), body.reason, body.movement), 'Stock updated') : fail(404, 'Item not found');
});
on('GET', '/finance/inventory/main/:projectId/items/:id/transactions', ({ p }) => ok(col('inventoryTransactions').filter((t) => t.itemId === p.id)));
on('PATCH', '/finance/inventory/main/:projectId/items/:id', ({ p, body }) => ok(update('inventory', p.id, body), 'Item updated'));
on('DELETE', '/finance/inventory/main/:projectId/items/:id', ({ p }) => (remove('inventory', p.id), ok(null, 'Item deleted')));
on('POST', '/finance/inventory/main/:projectId', ({ body }) => created(newStockItem(body, { location: 'Main' }), 'Item added'));
on('GET', '/finance/inventory/named/:projectId/:locationId', ({ p, params }) => ok(listStock((r) => r.location === 'Named' && r.locationId === p.locationId, params)));
on('POST', '/finance/inventory/named/:projectId/:locationId/items/:id/adjust', ({ p, body }) => {
  const item = findIn('inventory', p.id);
  return item ? ok(adjustStock(item, num(body.quantity), body.reason, body.movement), 'Stock updated') : fail(404, 'Item not found');
});
on('GET', '/finance/inventory/named/:projectId/:locationId/items/:id/transactions', ({ p }) => ok(col('inventoryTransactions').filter((t) => t.itemId === p.id)));
on('PATCH', '/finance/inventory/named/:projectId/:locationId/items/:id', ({ p, body }) => ok(update('inventory', p.id, body), 'Item updated'));
on('DELETE', '/finance/inventory/named/:projectId/:locationId/items/:id', ({ p }) => (remove('inventory', p.id), ok(null, 'Item deleted')));
on('POST', '/finance/inventory/named/:projectId/:locationId', ({ p, body }) => created(newStockItem(body, { location: 'Named', locationId: p.locationId, projectId: p.projectId }), 'Item added'));
on('POST', '/finance/inventory/:id/adjust', ({ p, body }) => {
  const item = findIn('inventory', p.id);
  return item ? ok(adjustStock(item, num(body.quantity), body.reason, body.movement), 'Stock updated') : fail(404, 'Item not found');
});
on('GET', '/finance/inventory/:id/transactions', ({ p }) => ok(col('inventoryTransactions').filter((t) => t.itemId === p.id)));
on('GET', '/finance/inventory/:id/documents', () => ok([]));
on('GET', '/finance/inventory/:id', ({ p }) => {
  const item = findIn('inventory', p.id);
  return item ? ok(item) : ok(listStock((r) => r.projectId === p.id, {}));
});
on('PATCH', '/finance/inventory/:id', ({ p, body }) => ok(update('inventory', p.id, body), 'Item updated'));
on('PUT', '/finance/inventory/:id', ({ p, body }) => ok(update('inventory', p.id, body), 'Item updated'));
on('DELETE', '/finance/inventory/:id', ({ p }) => (remove('inventory', p.id), ok(null, 'Item deleted')));
on('GET', '/finance/inventory', () => ok(listStock((r) => r.location !== 'Main', {})));
on('POST', '/finance/inventory', ({ body }) => created(newStockItem(body, { location: 'Project', projectId: body.projectId }), 'Item added'));

// --- Stock locations & transfers ---
on('GET', '/finance/stock-locations/project/:projectId/items', ({ params }) => {
  const key = String(params.key || '');
  if (key === 'main') return ok(listStock((r) => r.location === 'Main', {}));
  if (key.startsWith('project:')) return ok(listStock((r) => r.location === 'Project' && r.projectId === key.slice(8), {}));
  if (key.startsWith('named:')) return ok(listStock((r) => r.location === 'Named' && r.locationId === key.slice(6), {}));
  return ok([]);
});
on('GET', '/finance/stock-locations/project/:projectId/people', ({ p }) => ok(projectPeople(p.projectId)));
on('GET', '/finance/stock-locations/project/:projectId/report', ({ params }) => {
  const overview = companyInventoryOverview();
  const placeOf = (r: Row) => (r.location === 'Main' ? 'main' : r.location === 'Named' ? `named:${r.locationId}` : `project:${r.projectId}`);
  const places = overview.places.map((pl) => {
    const items = col('inventory')
      .filter((r) => placeOf(r) === pl.key)
      .map((r) => ({ itemId: r._id, name: r.name, materialCode: r.materialCode, unit: r.unit, category: r.category, stock: r.currentStock, minimumStock: r.minimumStock, unitPrice: r.unitPrice, value: r.currentStock * r.unitPrice, in: 0, out: 0 }));
    return { key: pl.key, label: pl.label, kind: pl.kind === 'Main' || pl.kind === 'Store' ? 'Store' : 'Site', items, totals: { items: items.length, value: sum(items, (i) => i.value), in: 0, out: 0 } };
  });
  return ok({
    startDate: params.startDate || null,
    endDate: params.endDate || null,
    places,
    materials: overview.materials.map((m) => ({ name: m.name, materialCode: m.materialCode, unit: m.unit, stock: m.totalStock, value: m.totalValue, in: 0, out: 0, byPlace: Object.fromEntries(m.places.map((x: Row) => [x.key, x.stock])) })),
    totals: { places: places.length, value: sum(places, (x) => x.totals.value), in: 0, out: 0 },
  });
});
on('GET', '/finance/stock-locations/project/:projectId', ({ p }) => ok(stockEndpoints(p.projectId)));
on('POST', '/finance/stock-locations', ({ body }) => {
  const loc = insert('stockLocations', { projectId: body.projectId, kind: body.kind, name: body.name });
  return created({ key: `named:${loc._id}`, kind: 'Named', namedKind: loc.kind, label: loc.name, projectId: loc.projectId, locationId: loc._id, isCurrentProject: true }, 'Location added');
});
on('GET', '/finance/stock-transfers/project/:projectId', ({ p }) => ok(col('stockTransfers').filter((t) => t.projectId === p.projectId || t.from?.projectId === p.projectId || t.to?.projectId === p.projectId)));
on('POST', '/finance/stock-transfers/batch', ({ body }) => created([insert('stockTransfers', { ...body, transferNumber: `TR-${col('stockTransfers').length + 1}`, status: 'Pending', history: [historyEntry('Requested')] })], 'Transfer requested'));
on('POST', '/finance/stock-transfers', ({ body }) => created(insert('stockTransfers', { ...body, transferNumber: `TR-${col('stockTransfers').length + 1}`, status: 'Pending', history: [historyEntry('Requested')] }), 'Transfer requested'));
on('PATCH', '/finance/stock-transfers/:id/:action', ({ p, body }) => {
  const status = { approve: 'Approved', reject: 'Rejected', receive: 'Received', cancel: 'Cancelled' }[p.action] || 'Pending';
  const t = findIn('stockTransfers', p.id);
  if (!t) return fail(404, 'Transfer not found');
  t.status = status;
  t.history = [...(t.history || []), historyEntry(status, body.comment)];
  return ok(t, `Transfer ${status.toLowerCase()}`);
});

// --- Receiving notes ---
on('GET', '/finance/receiving-notes/project/:projectId', ({ p }) => ok(byProject('receivingNotes', p.projectId)));
on('GET', '/finance/receiving-notes/purchase-order/:poId', ({ p }) => {
  const po = findIn('purchaseOrders', p.poId);
  return ok({
    purchaseOrderId: p.poId,
    items: (po?.materialList || []).map((m: Row) => ({ materialName: m.materialName, unit: m.unit, ordered: m.quantity, received: 0, remaining: m.quantity })),
    notes: byProject('receivingNotes', po?.projectId || '').filter((n) => n.purchaseOrderId === p.poId),
  });
});
on('POST', '/finance/receiving-notes/:id/submit', ({ p }) => ok(update('receivingNotes', p.id, { status: 'Submitted' }), 'Submitted for review'));
on('PATCH', '/finance/receiving-notes/:id/review', ({ p, body }) => ok(update('receivingNotes', p.id, { status: body.status || 'Approved' }), 'Reviewed'));
on('GET', '/finance/receiving-notes/:id', ({ p }) => ok(findIn('receivingNotes', p.id)));
on('PATCH', '/finance/receiving-notes/:id', ({ p, body }) => ok(update('receivingNotes', p.id, body), 'Updated'));
on('DELETE', '/finance/receiving-notes/:id', ({ p }) => (remove('receivingNotes', p.id), ok(null, 'Deleted')));
on('GET', '/finance/stock-transfers/:id', ({ p }) => ok(findIn('stockTransfers', p.id)));
on('POST', '/finance/receiving-notes',({ body }) =>
  created(insert('receivingNotes', { ...body, grnNumber: `GRN-${col('receivingNotes').length + 1}`, status: 'Draft', attachments: [], history: [historyEntry('Created')] }), 'Delivery recorded')
);

// --- Labour ---
on('GET', '/finance/labour/workers/project/:projectId', ({ p, params }) => {
  let rows = byProject('workers', p.projectId);
  if (params.active !== undefined) rows = rows.filter((w) => String(w.active) === String(params.active));
  return ok(rows);
});
on('POST', '/finance/labour/workers/import', ({ body }) => {
  (body.workers || []).forEach((w: Row) => insert('workers', { rateType: 'Daily', rate: 0, active: true, ...w, projectId: body.projectId }));
  return ok({ created: (body.workers || []).length, skipped: [] }, 'Workers imported');
});
on('POST', '/finance/labour/workers', ({ body }) => created(insert('workers', { active: true, rateType: 'Daily', ...body, rate: num(body.rate) }), 'Worker added'));
on('PATCH', '/finance/labour/workers/:id', ({ p, body }) => ok(update('workers', p.id, body), 'Worker updated'));
on('POST', '/finance/labour/attendance/bulk', ({ body }) => ok({ date: body.date, saved: saveAttendance(body.projectId, body.date, body.entries || []) }, 'Register saved'));
on('POST', '/finance/labour/attendance/list', ({ body }) => {
  const createdWorkers: Row[] = [];
  const refs: Record<string, string> = {};
  (body.newWorkers || []).forEach((w: Row) => {
    const worker = insert('workers', { projectId: body.projectId, fullName: w.fullName, phone: w.phone, nationalId: w.nationalId, trade: w.trade, rate: num(w.rate), rateType: 'Daily', active: true });
    refs[w.ref] = worker._id;
    createdWorkers.push({ _id: worker._id, fullName: worker.fullName, phone: worker.phone });
  });
  const days = (body.days || []).map((d: Row) => ({
    date: d.date,
    saved: saveAttendance(body.projectId, d.date, (d.entries || []).map((e: Row) => ({ ...e, workerId: e.workerId || refs[e.newRef] }))),
  }));
  return ok({ days, created: createdWorkers, reactivated: [] }, 'Attendance saved');
});
on('POST', '/finance/labour/attendance/photo', () => fail(400, 'Photo attendance needs the mobile app – not available in the demo'));
on('GET', '/finance/labour/attendance/project/:projectId', ({ p, params }) => ok(attendanceSummary(p.projectId, params)));
on('DELETE', '/finance/labour/attendance/:id', ({ p }) => (remove('attendance', p.id), ok(null, 'Deleted')));
on('GET', '/finance/labour/pay-runs/project/:projectId', ({ p }) => ok(byProject('payRuns', p.projectId)));
on('POST', '/finance/labour/pay-runs', ({ body }) => {
  const rows = byProject('attendance', body.projectId).filter((r) => !r.paid && inRange(r.date, body));
  if (!rows.length) return fail(400, 'No unpaid attendance in this period');
  const reference = `PR-${String(byProject('payRuns', body.projectId).length + 8).padStart(3, '0')}`;
  rows.forEach((r) => Object.assign(r, { paid: true, payRunReference: reference }));
  const total = sum(rows, (r) => r.amount);
  const expense = insert('expenses', { projectId: body.projectId, date: now(), category: 'labor', amount: total, description: `Labour pay run ${reference}`, documents: [], approvalStatus: 'pending', source: { kind: 'Labour', reference } });
  return created(
    insert('payRuns', {
      projectId: body.projectId,
      reference,
      startDate: body.startDate,
      endDate: body.endDate,
      totalAmount: total,
      attendanceCount: rows.length,
      workerCount: new Set(rows.map((r) => r.workerId)).size,
      createdByName: user().fullName,
      expense: { _id: expense._id, amount: total, approvalStatus: 'pending' },
    }),
    'Pay run created'
  );
});
on('DELETE', '/finance/labour/pay-runs/:id', ({ p }) => {
  const run = findIn('payRuns', p.id);
  if (run) col('attendance').filter((a) => a.payRunReference === run.reference).forEach((a) => Object.assign(a, { paid: false, payRunReference: undefined }));
  remove('payRuns', p.id);
  return ok(null, 'Pay run deleted');
});

// --- Petty cash ---
on('GET', '/finance/petty-cash/project/:projectId', ({ p, params }) => ok(pettyCashList(p.projectId, params)));
on('PATCH', '/finance/petty-cash/:id/review', ({ p, body }) => {
  const row = findIn('pettyCash', p.id);
  if (!row) return fail(404, 'Not found');
  row.status = body.status;
  row.approval = { reviewedByName: user().fullName, reviewedAt: now(), comment: body.comment };
  row.history = [...(row.history || []), historyEntry(body.status, body.comment)];
  if (body.status === 'Approved' && row.type === 'Payment' && !row.expenseRecorded) {
    row.expenseRecorded = true;
    insert('expenses', { projectId: row.projectId, date: row.transactionDate, category: row.category || 'overheads', amount: num(row.amount), description: row.description, documents: [], approvalStatus: 'approved', source: { kind: 'PettyCash', refId: row._id, reference: row.voucherNumber } });
  }
  return ok(row, `Transaction ${String(body.status).toLowerCase()}`);
});
on('POST', '/finance/petty-cash/:id/receipts', ({ p }) => ok(findIn('pettyCash', p.id), 'Receipts added'));
on('GET', '/finance/petty-cash/:id', ({ p }) => ok(findIn('pettyCash', p.id)));
on('PATCH', '/finance/petty-cash/:id', ({ p, body }) => ok(update('pettyCash', p.id, { ...body, ...(body.amount !== undefined ? { amount: num(body.amount) } : {}) }), 'Updated'));
on('DELETE', '/finance/petty-cash/:id', ({ p }) => (remove('pettyCash', p.id), ok(null, 'Deleted')));
on('POST', '/finance/petty-cash', ({ body }) =>
  created(
    insert('pettyCash', {
      ...body,
      amount: num(body.amount),
      voucherNumber: `PCV-${String(col('pettyCash').length + 1).padStart(4, '0')}`,
      responsiblePerson: { userId: body.responsiblePersonId, name: body.responsiblePersonName || user().fullName },
      documents: [],
      status: 'Pending',
      expenseRecorded: false,
      history: [historyEntry('Recorded')],
    }),
    'Transaction recorded'
  )
);

// --- Subcontractors ---
on('GET', '/finance/subcontractors/project/:projectId', ({ p }) => {
  const subs = byProject('subcontractors', p.projectId).map((s) => ({ ...s, totals: subcontractorTotals(s) }));
  const totals = subs.reduce(
    (acc, s) => ({
      contractAmount: acc.contractAmount + s.totals.contractAmount,
      paid: acc.paid + s.totals.paid,
      pending: acc.pending + s.totals.pending,
      remaining: acc.remaining + s.totals.remaining,
      paymentCount: acc.paymentCount + s.totals.paymentCount,
    }),
    { contractAmount: 0, paid: 0, pending: 0, remaining: 0, paymentCount: 0 }
  );
  return ok({ subcontractors: subs, summary: totals });
});
on('GET', '/finance/subcontractors/payments/project/:projectId', ({ p, params }) => {
  let rows = byProject('subcontractorPayments', p.projectId).filter((r) => inRange(r.paymentDate, params));
  if (params.subcontractorId) rows = rows.filter((r) => r.subcontractorId === params.subcontractorId);
  return ok(rows);
});
on('PATCH', '/finance/subcontractors/payments/:id/review', ({ p, body }) => {
  const row = findIn('subcontractorPayments', p.id);
  if (!row) return fail(404, 'Not found');
  row.status = body.status;
  row.approval = { reviewedByName: user().fullName, reviewedAt: now(), comment: body.comment };
  if (body.status === 'Approved' && !row.expenseRecorded) {
    row.expenseRecorded = true;
    insert('expenses', { projectId: row.projectId, date: row.paymentDate, category: 'subcontractors', amount: num(row.amount), description: `${row.subcontractorName} – ${row.description}`, documents: [], approvalStatus: 'approved', source: { kind: 'Subcontractor', refId: row._id, reference: row.paymentNumber } });
  }
  return ok(row, `Payment ${String(body.status).toLowerCase()}`);
});
on('PATCH', '/finance/subcontractors/payments/:id', ({ p, body }) => ok(update('subcontractorPayments', p.id, body), 'Updated'));
on('DELETE', '/finance/subcontractors/payments/:id', ({ p }) => (remove('subcontractorPayments', p.id), ok(null, 'Deleted')));
on('POST', '/finance/subcontractors/payments', ({ body }) => {
  const s = findIn('subcontractors', body.subcontractorId);
  return created(
    insert('subcontractorPayments', {
      ...body,
      projectId: s?.projectId || body.projectId,
      subcontractorName: s?.name || '',
      amount: num(body.amount),
      paymentNumber: `SCP-${String(col('subcontractorPayments').length + 1).padStart(4, '0')}`,
      documents: [],
      status: 'Pending',
      expenseRecorded: false,
      history: [historyEntry('Recorded')],
    }),
    'Payment recorded'
  );
});
on('POST', '/finance/subcontractors', ({ body }) =>
  created(insert('subcontractors', { status: 'Active', boqItems: [], ...body, contractAmount: num(body.contractAmount) || sum(body.boqItems || [], (i: Row) => num(i.quantity) * num(i.rate)) }), 'Subcontractor added')
);
on('PATCH', '/finance/subcontractors/:id', ({ p, body }) => ok(update('subcontractors', p.id, body), 'Updated'));
on('DELETE', '/finance/subcontractors/:id', ({ p }) => (remove('subcontractors', p.id), ok(null, 'Deleted')));

// --- Material usage ---
on('GET', '/finance/material-usage/:projectId', ({ p }) => ok(byProject('materialUsage', p.projectId)));
on('POST', '/finance/material-usage', ({ body }) => {
  const item = findIn('inventory', body.materialId || body.inventoryItemId);
  if (item) adjustStock(item, -num(body.quantity ?? body.quantityUsed), 'Used on site', 'issued');
  return created(insert('materialUsage', body), 'Usage recorded');
});

// --- Subscription, mobile app, site content ---
on('GET', '/subscriptions/status', () => ok({ isActive: true, plan: 'enterprise', status: 'active', startDate: daysFromNow(-30), endDate: daysFromNow(335), daysRemaining: 335, canRenew: false, canUpgrade: false }));
on('GET', '/subscriptions/plans', () =>
  ok([
    { id: 'basic', name: 'Basic', price: 50_000, features: { maxProjects: 3, maxUsers: 5, storageGB: 5, canCreateTenders: false, canAccessBidding: false, canCreateInvoices: true, hasAdvancedReporting: false, hasBudgetThresholdAlerts: false, hasApiAccess: false } },
    { id: 'professional', name: 'Professional', price: 150_000, features: { maxProjects: 15, maxUsers: 25, storageGB: 50, canCreateTenders: true, canAccessBidding: true, canCreateInvoices: true, hasAdvancedReporting: true, hasBudgetThresholdAlerts: true, hasApiAccess: false } },
    { id: 'enterprise', name: 'Enterprise', price: 400_000, features: { maxProjects: -1, maxUsers: -1, storageGB: 500, canCreateTenders: true, canAccessBidding: true, canCreateInvoices: true, hasAdvancedReporting: true, hasBudgetThresholdAlerts: true, hasApiAccess: true } },
  ])
);
on('GET', '/subscriptions/payment/history', () => ok([]));
on('POST', '/subscriptions/payment/initiate', () => fail(400, 'Payments are disabled in the demo'));
on('GET', '/mobile/admin/status', () => ok({ configured: false }));
on('GET', '/site/landing-images', () => ok([]));

// --- Bidding: not part of the demo story; reads come back empty ---
on('GET', '/bidding/stats', () => ok({ totalTenders: 0, activeTenders: 0, totalBids: 0, awardedBids: 0 }));
on('GET', '/bidding/bidders/profile', () => fail(404, 'No bidder profile'));

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

const compiled = routes.map(([method, pattern, handler]) => {
  const keys: string[] = [];
  const source = pattern.replace(/:([a-zA-Z]+)/g, (_m, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { method, regex: new RegExp(`^${source}/?$`), keys, handler };
});

function handle(ctx: Omit<Ctx, 'p'>): Result {
  for (const route of compiled) {
    if (route.method !== ctx.method) continue;
    const m = route.regex.exec(ctx.path);
    if (!m) continue;
    const p: Record<string, string> = {};
    route.keys.forEach((k, i) => (p[k] = decodeURIComponent(m[i + 1])));
    return route.handler({ ...ctx, p });
  }
  // Anything else: harmless defaults so no screen breaks
  if (ctx.method === 'GET') return ok([]);
  if (ctx.method === 'DELETE') return ok(null, 'Deleted');
  return ok(stamp({ _id: newId(), ...ctx.body }), 'Saved (demo)');
}

// ---------------------------------------------------------------------------
// Axios adapter
// ---------------------------------------------------------------------------

function parseBody(data: unknown): Row {
  if (!data) return {};
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const out: Row = {};
    data.forEach((value, key) => {
      let v: unknown = value;
      if (typeof value === 'string') {
        const t = value.trim();
        if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
          try {
            v = JSON.parse(t);
          } catch {
            /* keep the text */
          }
        }
      } else {
        v = (value as File).name; // files stay on the visitor's computer
      }
      if (key in out) out[key] = ([] as unknown[]).concat(out[key], v);
      else out[key] = v;
    });
    return out;
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return typeof data === 'object' ? (data as Row) : {};
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const method = (config.method || 'get').toUpperCase();
  const url = new URL(config.url || '/', 'http://demo.local');
  // Some modules call with the /api/v1 prefix already included
  const path = url.pathname.replace(/^\/api\/v1(?=\/)/, '').replace(/\/+$/, '') || '/';
  const params: Record<string, any> = { ...Object.fromEntries(url.searchParams.entries()), ...(config.params || {}) };
  const body = parseBody(config.data);

  // A short pause so loading states look natural
  await new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));

  let result: Result;
  try {
    result = handle({ method, path, params, body });
  } catch (error) {
    console.error('[demo] request failed', method, path, error);
    result = fail(500, 'Something went wrong in the demo');
  }
  if (MUTATING.has(method)) save();

  const response: AxiosResponse = {
    data: JSON.parse(JSON.stringify(result.body ?? null)),
    status: result.status,
    statusText: result.status < 400 ? 'OK' : 'Error',
    headers: {},
    config,
    request: {},
  };
  if (result.status >= 400) {
    throw new AxiosError(result.body?.message || 'Request failed', result.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, {}, response);
  }
  return response;
}
