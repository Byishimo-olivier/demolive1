/**
 * Sample data for the demo: one company, a team, one fully built "showcase" project and a few
 * lighter projects so the company dashboard has something to compare. Dates are relative to
 * today so the demo always looks current.
 */
import { DEMO_COMPANY_ID, DEMO_USER_ID } from './demo-mode';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

export interface DemoDb {
  version: number;
  users: Row[];
  company: Row;
  projects: Row[];
  collections: Record<string, Row[]>;
}

export const DEMO_DB_VERSION = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0x100;
/** A 24-hex-character id like MongoDB's, unique within this browser */
export function newId(): string {
  idCounter += 1;
  const time = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const rand = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return (time + rand + idCounter.toString(16).padStart(10, '0')).slice(0, 24);
}

const DAY = 86_400_000;
export const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

// Deterministic "random" so every visitor sees the same numbers
let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const roundTo = (value: number, step: number) => Math.round(value / step) * step;

const fileUrl = (name: string) => `${window.location.origin}/images/landing/${name}`;

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

const person = (id: string, fullName: string, email: string) => ({
  _id: id,
  fullName,
  email,
  role: 'user',
  isEmailVerified: true,
  isIndividual: false,
  companies: [DEMO_COMPANY_ID],
  activeCompanyId: DEMO_COMPANY_ID,
  permissions: [],
  membershipTier: 'enterprise',
  createdAt: daysFromNow(-400),
  updatedAt: daysFromNow(-2),
});

export const DEMO_USER = person(DEMO_USER_ID, 'Demo Manager', 'demo@infrasoko.app');

const TEAM = [
  { user: person('64d000000000000000000002', 'Jean-Paul Habimana', 'jp.habimana@demo.infrasoko.app'), companyRole: 'ProjectManager', projectRole: 'ProjectManager' },
  { user: person('64d000000000000000000003', 'Aline Uwase', 'aline.uwase@demo.infrasoko.app'), companyRole: 'SiteEngineer', projectRole: 'SiteEngineer' },
  { user: person('64d000000000000000000004', 'Eric Mugisha', 'eric.mugisha@demo.infrasoko.app'), companyRole: 'ProcurementManager', projectRole: 'ProcurementOfficer' },
  { user: person('64d000000000000000000005', 'Grace Mukamana', 'grace.mukamana@demo.infrasoko.app'), companyRole: 'FinanceManager', projectRole: 'FinanceOfficer' },
  { user: person('64d000000000000000000006', 'Patrick Niyonzima', 'patrick.n@demo.infrasoko.app'), companyRole: 'CompanyMember', projectRole: 'QA_QCOfficer' },
];

const teamFor = (count: number) => [
  { _id: newId(), role: 'Owner', user: DEMO_USER },
  ...TEAM.slice(0, count).map((m) => ({ _id: newId(), role: m.projectRole, user: m.user })),
];

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

type Budget = { materials: number; labor: number; equipment: number; fuel: number; overheads: number; subcontractors: number };

function budgetRow(projectId: string, b: Budget, approvalStatus = 'approved') {
  const total = b.materials + b.labor + b.equipment + b.fuel + b.overheads + b.subcontractors;
  return {
    _id: newId(),
    projectId,
    fiscalYear: new Date().getFullYear(),
    materialsBudget: b.materials,
    laborBudget: b.labor,
    equipmentBudget: b.equipment,
    fuelBudget: b.fuel,
    overheadsBudget: b.overheads,
    subcontractorsBudget: b.subcontractors,
    totalPlannedBudget: total,
    notes: 'Approved baseline budget',
    approvalStatus,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    createdAt: daysFromNow(-170),
    updatedAt: daysFromNow(-160),
  };
}

const EXPENSE_TEXT: Record<string, { text: string; supplier?: string; unit?: string }[]> = {
  materials: [
    { text: 'Cement CEM II 42.5N delivery', supplier: 'CIMERWA Distributors', unit: 'bag' },
    { text: 'Reinforcement steel Y12 / Y16', supplier: 'SteelRwa Ltd', unit: 'ton' },
    { text: 'Ready-mix concrete C25', supplier: 'Kigali Concrete Co.', unit: 'm³' },
    { text: 'Hollow concrete blocks 20cm', supplier: 'Masaka Blocks', unit: 'pc' },
    { text: 'River sand and aggregates', supplier: 'Nyabarongo Quarry', unit: 'ton' },
    { text: 'Electrical conduits and cables', supplier: 'ElectroHub Rwanda', unit: 'set' },
  ],
  labor: [{ text: 'Casual labour pay run' }, { text: 'Masons and steel fixers wages' }, { text: 'Night security guards' }],
  equipment: [{ text: 'Excavator hire (CAT 320)' }, { text: 'Tower crane monthly rental' }, { text: 'Concrete mixer & vibrators hire' }],
  fuel: [{ text: 'Diesel for site generators and plant' }, { text: 'Fuel for site vehicles' }],
  overheads: [{ text: 'Site office utilities and internet' }, { text: 'Insurance – Contractor all risk' }, { text: 'Health & safety PPE' }],
  subcontractors: [{ text: 'Plumbing subcontractor – interim payment' }, { text: 'Electrical subcontractor – interim payment' }],
};

/** Approved spending per category spread over the past months, plus a few awaiting approval */
function expensesFor(projectId: string, spend: Partial<Budget>, monthsBack: number, pending = 2) {
  const rows: Row[] = [];
  Object.entries(spend).forEach(([category, total]) => {
    if (!total) return;
    const options = EXPENSE_TEXT[category];
    const parts = Math.max(2, Math.min(6, Math.round(total / 40_000_000)));
    let left = total;
    for (let i = 0; i < parts; i += 1) {
      const amount = i === parts - 1 ? left : roundTo((total / parts) * (0.7 + rand() * 0.6), 5_000);
      left -= amount;
      const pick = options[i % options.length];
      const day = -between(3, monthsBack * 30);
      rows.push({
        _id: newId(),
        projectId,
        date: daysFromNow(day),
        category,
        amount,
        description: pick.text,
        documents: [],
        approvalStatus: 'approved',
        source: { kind: category === 'labor' ? 'Labour' : category === 'subcontractors' ? 'Subcontractor' : 'Manual' },
        approval: { reviewedBy: DEMO_USER_ID, reviewedByName: 'Demo Manager', reviewedAt: daysFromNow(day + 1) },
        details: pick.supplier ? { supplier: pick.supplier, unit: pick.unit } : undefined,
        createdBy: TEAM[3].user._id,
        updatedBy: DEMO_USER_ID,
        createdAt: daysFromNow(day),
        updatedAt: daysFromNow(day + 1),
      });
    }
  });
  const pendingTexts = [
    { category: 'materials', description: 'Ceramic floor tiles – first batch', amount: 18_450_000 },
    { category: 'equipment', description: 'Scaffolding hire – extension', amount: 6_200_000 },
    { category: 'fuel', description: 'Diesel top-up for generators', amount: 2_350_000 },
  ];
  pendingTexts.slice(0, pending).forEach((p, i) => {
    rows.push({
      _id: newId(),
      projectId,
      date: daysFromNow(-i - 1),
      category: p.category,
      amount: p.amount,
      description: p.description,
      documents: [],
      approvalStatus: 'pending',
      source: { kind: 'Manual' },
      createdBy: TEAM[1].user._id,
      updatedBy: TEAM[1].user._id,
      createdAt: daysFromNow(-i - 1),
      updatedAt: daysFromNow(-i - 1),
    });
  });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function invoiceRow(projectId: string, n: number, amount: number, status: string, daysAgo: number, prefix: string) {
  const issued = daysFromNow(-daysAgo);
  return {
    _id: newId(),
    invoiceNumber: `${prefix}-IPC-${String(n).padStart(3, '0')}`,
    type: 'BoQ Based',
    projectId,
    issuerId: DEMO_USER_ID,
    workPeriod: { start: daysFromNow(-daysAgo - 30), end: issued },
    invoiceItems: [{ description: `Interim payment certificate No. ${n} – works executed`, quantity: 1, unitPrice: amount, rate: amount, amount }],
    totalAmount: amount,
    documents: [],
    status,
    paymentTerms: 'Net 30',
    dueDate: daysFromNow(-daysAgo + 30),
    invoiceDate: issued,
    paymentDetails: { bankName: 'Bank of Kigali', accountNumber: '000400012345678', accountName: 'Demo Construction Ltd' },
    approvalWorkflow: status === 'pending' ? {} : { approvedBy: DEMO_USER_ID, approvedAt: daysFromNow(-daysAgo + 3) },
    paidAt: status === 'paid' ? daysFromNow(-daysAgo + 20) : undefined,
    createdBy: TEAM[3].user._id,
    updatedBy: DEMO_USER_ID,
    createdAt: issued,
    updatedAt: issued,
  };
}

function workItem(name: string, start: number, end: number, progress: number, extra: Row = {}): Row {
  const status = progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending';
  return {
    _id: newId(),
    name,
    startDate: daysFromNow(start),
    endDate: daysFromNow(end),
    plannedDuration: Math.max(1, end - start),
    status,
    progressPercentage: progress,
    responsiblePerson: TEAM[1].user,
    responsiblePersonName: TEAM[1].user.fullName,
    approval: { status: progress >= 100 ? 'Approved' : 'Pending' },
    progressUpdatedAt: daysFromNow(Math.min(-1, end)),
    progressUpdatedByName: TEAM[1].user.fullName,
    createdAt: daysFromNow(start - 5),
    updatedAt: daysFromNow(-1),
    ...extra,
  };
}

type StagePlan = { stage: string; start: number; end: number; budget: number; subs: [string, number, string[]?][] };

function stagesFor(projectId: string, plans: StagePlan[], approved = true) {
  return plans.map((plan, si) => {
    const span = plan.end - plan.start;
    const subs = plan.subs.map(([name, progress, tasks], i) => {
      const s = plan.start + Math.round((span / plan.subs.length) * i);
      const e = plan.start + Math.round((span / plan.subs.length) * (i + 1));
      return workItem(name, s, e, progress, {
        wbsCode: `${si + 1}.${i + 1}`,
        tasks: (tasks || []).map((t, ti) =>
          workItem(t, s, e, progress >= 100 ? 100 : Math.max(0, Math.min(100, progress + (ti === 0 ? 20 : -15))), { wbsCode: `${si + 1}.${i + 1}.${ti + 1}` })
        ),
      });
    });
    const progress = subs.length ? Math.round(subs.reduce((sum, s) => sum + s.progressPercentage, 0) / subs.length) : 0;
    return {
      _id: newId(),
      projectId,
      stage: plan.stage,
      wbsCode: String(si + 1),
      budget: plan.budget,
      actualCost: Math.round((plan.budget * progress) / 100 * (0.9 + rand() * 0.2)),
      description: `${plan.stage} works`,
      startDate: daysFromNow(plan.start),
      endDate: daysFromNow(plan.end),
      plannedDuration: span,
      responsiblePerson: TEAM[0].user,
      responsiblePersonName: TEAM[0].user.fullName,
      status: progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending',
      progressPercentage: progress,
      subStages: subs,
      approval: { status: approved ? 'Approved' : 'Pending', reviewedBy: approved ? DEMO_USER : null, reviewedAt: approved ? daysFromNow(plan.start - 3) : undefined },
      alertSettings: { email: true, sms: false },
      progressUpdatedAt: daysFromNow(-1),
      progressUpdatedByName: TEAM[1].user.fullName,
      createdAt: daysFromNow(-180),
      updatedAt: daysFromNow(-1),
    };
  });
}

// ---------------------------------------------------------------------------
// The showcase project
// ---------------------------------------------------------------------------

function showcase(collections: Record<string, Row[]>) {
  const id = newId();
  const contractAmount = 1_850_000_000;
  const budget: Budget = { materials: 720_000_000, labor: 260_000_000, equipment: 180_000_000, fuel: 60_000_000, overheads: 90_000_000, subcontractors: 140_000_000 };

  const project = {
    _id: id,
    name: 'Kigali Business Hub – Office Block',
    projectCode: 'KBH-2026-01',
    projectDescription:
      'Construction of a G+6 commercial office block with two basement parking levels, including structure, finishes, MEP services and external works.',
    status: 'In Progress',
    type: 'Capital',
    team: teamFor(5),
    progress: 0,
    budget: 0,
    clientName: 'Horizon Properties Ltd',
    contractAmount,
    contactName: 'Diane Ingabire',
    contactPhone: '+250 788 000 111',
    contactEmail: 'projects@horizon-properties.example',
    clientAddress: 'KG 7 Ave, Kigali',
    clientTin: '102345678',
    contract: {
      reference: 'HPL/KBH/2026/001',
      title: 'Main works contract – Kigali Business Hub',
      signedDate: daysFromNow(-200),
      startDate: daysFromNow(-180),
      endDate: daysFromNow(300),
      amount: contractAmount,
      advancePayment: 185_000_000,
      retentionPercent: 5,
      paymentTerms: 'Monthly interim payment certificates, 30 days',
      scope: 'Structure, finishes, MEP and external works as per BoQ',
    },
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    documents: [],
    createdAt: daysFromNow(-200),
    updatedAt: daysFromNow(-1),
    __v: 0,
  };

  collections.budgets.push(budgetRow(id, budget));
  collections.expenses.push(
    ...expensesFor(id, { materials: 318_000_000, labor: 104_000_000, equipment: 86_000_000, fuel: 27_500_000, overheads: 38_000_000, subcontractors: 46_000_000 }, 6, 3)
  );
  collections.invoices.push(
    invoiceRow(id, 1, 285_000_000, 'paid', 130, 'KBH'),
    invoiceRow(id, 2, 312_000_000, 'paid', 95, 'KBH'),
    invoiceRow(id, 3, 246_500_000, 'approved', 55, 'KBH'),
    invoiceRow(id, 4, 198_000_000, 'pending', 12, 'KBH')
  );

  collections.stages.push(
    ...stagesFor(id, [
      { stage: 'Preliminaries', start: -180, end: -150, budget: 45_000_000, subs: [['Site establishment', 100, ['Hoarding and gates', 'Site office and stores']], ['Surveys and setting out', 100]] },
      { stage: 'Design', start: -175, end: -120, budget: 60_000_000, subs: [['Structural design review', 100], ['MEP coordination drawings', 100]] },
      { stage: 'Procurement', start: -150, end: -40, budget: 30_000_000, subs: [['Long-lead items (lifts, transformer)', 100], ['Finishes suppliers selection', 70]] },
      { stage: 'Mobilization', start: -150, end: -130, budget: 25_000_000, subs: [['Plant and equipment', 100], ['Labour mobilisation', 100]] },
      {
        stage: 'Construction',
        start: -130,
        end: 220,
        budget: 1_100_000_000,
        subs: [
          ['Excavation and basements', 100, ['Bulk excavation', 'Retaining walls']],
          ['Foundations', 100, ['Pile caps', 'Ground beams']],
          ['Superstructure frame (G to L6)', 65, ['Columns and slabs L1–L3', 'Columns and slabs L4–L6']],
          ['Blockwork and walling', 35, ['External walls', 'Internal partitions']],
          ['MEP first fix', 15, ['Electrical conduits', 'Plumbing and drainage']],
          ['Finishes', 0, ['Plastering', 'Tiling', 'Painting']],
        ],
      },
      { stage: 'Testing and Commissioning', start: 220, end: 270, budget: 40_000_000, subs: [['MEP testing', 0], ['Lifts commissioning', 0]] },
      { stage: 'Handover', start: 270, end: 300, budget: 15_000_000, subs: [['Snagging', 0], ['As-built documents and handover', 0]] },
    ])
  );

  collections.progressReports.push({
    _id: newId(),
    projectId: id,
    periodStart: daysFromNow(-37),
    periodEnd: daysFromNow(-7),
    stageProgress: [
      { stage: 'Construction', progressPercentage: 38 },
      { stage: 'Procurement', progressPercentage: 85 },
    ],
    comments: 'Level 5 slab cast. Blockwork started on L1–L3. Two days lost to heavy rain.',
    delayDocumentation: ['Heavy rain – 2 days'],
    correctiveActions: ['Extra shift for blockwork crew'],
    createdAt: daysFromNow(-6),
    updatedAt: daysFromNow(-6),
  });

  // Bill of quantities
  const boqSection = (sectionName: string, items: [string, string, number, number, number][]) => {
    const rows = items.map(([description, unit, quantity, rate, done]) => ({
      _id: newId(),
      description,
      unit,
      quantity,
      rate,
      amount: quantity * rate,
      completedQuantity: done,
    }));
    return { _id: newId(), sectionName, items: rows, subTotal: rows.reduce((s, r) => s + r.amount, 0) };
  };
  const sections = [
    boqSection('Excavation', [
      ['Bulk excavation to basement level', 'm³', 9_800, 4_500, 9_800],
      ['Cart away excavated material', 'm³', 9_800, 3_200, 9_800],
    ]),
    boqSection('Foundation', [
      ['Concrete C30 in pile caps', 'm³', 620, 185_000, 620],
      ['Reinforcement steel in foundations', 'kg', 68_000, 1_450, 68_000],
      ['Ground beams formwork', 'm²', 1_450, 12_000, 1_450],
    ]),
    boqSection('Walling', [
      ['20cm hollow block walls', 'm²', 7_200, 18_500, 2_500],
      ['15cm partition walls', 'm²', 5_400, 15_000, 1_400],
    ]),
    boqSection('Plastering', [['Internal plaster 15mm', 'm²', 21_000, 6_500, 0], ['External render', 'm²', 7_800, 8_500, 0]]),
    boqSection('MEP', [
      ['Electrical installation (lump sum per floor)', 'set', 9, 38_000_000, 1],
      ['Plumbing and drainage (per floor)', 'set', 9, 21_000_000, 1],
    ]),
    boqSection('Painting', [['Emulsion paint, 3 coats', 'm²', 21_000, 3_800, 0]]),
  ];
  collections.boqs.push({
    _id: newId(),
    projectId: id,
    sections,
    grandTotal: sections.reduce((s, sec) => s + sec.subTotal, 0),
    imports: [],
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    createdAt: daysFromNow(-170),
    updatedAt: daysFromNow(-3),
  });

  // Procurement
  const mr = (name: string, qty: number, unit: string, cost: number, status: string, days: number, priority = 'Medium') => ({
    _id: newId(),
    projectId: id,
    requestType: 'Material',
    requesterName: TEAM[1].user.fullName,
    department: 'Engineering',
    requestDate: daysFromNow(-days),
    materialDetails: [{ materialName: name, quantity: qty, unit, requiredByDate: daysFromNow(-days + 10), estimatedCost: cost, category: 'materials' }],
    purpose: `${name} for ongoing works`,
    priorityLevel: priority,
    status,
    requestedBy: TEAM[1].user,
    approval: status === 'Pending' ? undefined : { reviewedBy: DEMO_USER, reviewedAt: daysFromNow(-days + 1) },
    history: [{ action: 'Requested', byName: TEAM[1].user.fullName, at: daysFromNow(-days) }].concat(
      status === 'Pending' ? [] : [{ action: status, byName: 'Demo Manager', at: daysFromNow(-days + 1) }]
    ),
    createdAt: daysFromNow(-days),
    updatedAt: daysFromNow(-days + 1),
  });
  collections.materialRequests.push(
    mr('Cement CEM II 42.5N', 1_200, 'bag', 15_600_000, 'Pending', 1, 'High'),
    mr('Ceramic floor tiles 60x60', 2_400, 'm²', 33_600_000, 'Pending', 2),
    mr('Reinforcement steel Y16', 18, 'ton', 25_200_000, 'Approved', 9, 'High'),
    mr('Hollow blocks 20cm', 15_000, 'pc', 10_500_000, 'Approved', 16),
    mr('PVC conduits 25mm', 3_000, 'm', 2_400_000, 'Rejected', 20, 'Low')
  );
  const po = (n: number, supplier: string, items: [string, number, string, number][], status: string, days: number) => {
    const materialList = items.map(([materialName, quantity, unit, unitPrice]) => ({ _id: newId(), materialName, quantity, unit, unitPrice, category: 'materials' }));
    return {
      _id: newId(),
      projectId: id,
      poNumber: `PO-KBH-${String(n).padStart(4, '0')}`,
      supplierDetails: supplier,
      orderDate: daysFromNow(-days),
      deliveryDate: daysFromNow(-days + 7),
      materialList,
      expenseRecorded: status === 'Approved',
      totalCost: materialList.reduce((s, m) => s + m.quantity * m.unitPrice, 0),
      paymentTerms: 'Net 30',
      specialInstructions: 'Deliver to site gate B between 7am and 4pm',
      status,
      approval: status === 'Approved' ? { approvedBy: DEMO_USER, approvedAt: daysFromNow(-days + 1), signature: { signerName: 'Demo Manager', signerTitle: 'Managing Director', image: '' } } : undefined,
      history: [{ action: 'Created', byName: TEAM[2].user.fullName, at: daysFromNow(-days) }],
      createdAt: daysFromNow(-days),
      updatedAt: daysFromNow(-days),
    };
  };
  collections.purchaseOrders.push(
    po(14, 'SteelRwa Ltd – Gikondo Industrial Zone', [['Reinforcement steel Y16', 18, 'ton', 1_400_000]], 'Approved', 8),
    po(13, 'Masaka Blocks Ltd', [['Hollow blocks 20cm', 15_000, 'pc', 700]], 'Approved', 15),
    po(12, 'Kigali Concrete Co.', [['Ready-mix concrete C25', 180, 'm³', 145_000], ['Pump hire', 3, 'day', 450_000]], 'Approved', 30),
    po(15, 'ElectroHub Rwanda', [['Electrical cables 2.5mm²', 40, 'box', 85_000], ['DB boards 12-way', 18, 'pc', 160_000]], 'Draft', 1)
  );

  // Site stock
  const stock = (name: string, code: string, unit: string, current: number, min: number, price: number) => ({
    _id: newId(),
    location: 'Project',
    projectId: id,
    name,
    materialCode: code,
    category: 'materials',
    unit,
    currentStock: current,
    unitPrice: price,
    minimumStock: min,
    isCustom: false,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    createdAt: daysFromNow(-150),
    updatedAt: daysFromNow(-2),
  });
  collections.inventory.push(
    stock('Cement CEM II 42.5N', 'MAT-001', 'bag', 340, 400, 13_000),
    stock('Reinforcement steel Y12', 'MAT-002', 'ton', 6.5, 3, 1_380_000),
    stock('Reinforcement steel Y16', 'MAT-003', 'ton', 11, 4, 1_400_000),
    stock('Hollow blocks 20cm', 'MAT-004', 'pc', 8_200, 2_000, 700),
    stock('River sand', 'MAT-005', 'ton', 45, 20, 18_000),
    stock('Aggregates 3/4"', 'MAT-006', 'ton', 12, 25, 22_000),
    stock('Binding wire', 'MAT-007', 'kg', 180, 100, 2_200),
    stock('Timber formwork 2x6', 'MAT-008', 'pc', 420, 150, 6_500),
    stock('PVC pipes 110mm', 'MAT-009', 'pc', 64, 30, 14_500),
    stock('Diesel', 'FUEL-01', 'l', 0, 500, 1_650)
  );
  collections.inventory.push(
    { ...stock('Cement CEM II 42.5N', 'MAT-001', 'bag', 2_400, 500, 12_800), location: 'Main', projectId: undefined },
    { ...stock('Paint – white emulsion 20L', 'MAT-020', 'pc', 85, 40, 48_000), location: 'Main', projectId: undefined },
    { ...stock('Safety helmets', 'PPE-001', 'pc', 120, 50, 6_000), location: 'Main', projectId: undefined }
  );

  // Labour
  const trades: [string, string, number][] = [
    ['Emmanuel Nshimiyimana', 'Mason', 8_000],
    ['Claude Hakizimana', 'Mason', 8_000],
    ['Innocent Bizimana', 'Steel fixer', 7_500],
    ['Theogene Ndayisaba', 'Steel fixer', 7_500],
    ['Olivier Mugabo', 'Carpenter', 7_500],
    ['Jean Bosco Ntawukuriryayo', 'Carpenter', 7_000],
    ['Alphonse Uwimana', 'Electrician', 9_000],
    ['Fabrice Iradukunda', 'Plumber', 9_000],
    ['Vestine Mukandayisenga', 'Helper', 4_500],
    ['Josiane Uwamahoro', 'Helper', 4_500],
    ['Samuel Habyarimana', 'Helper', 4_500],
    ['Didier Twagirayezu', 'Store keeper', 6_000],
  ];
  const workers = trades.map(([fullName, trade, rate], i) => ({
    _id: newId(),
    projectId: id,
    fullName,
    nationalId: `1199${String(80012345678 + i * 7919).slice(0, 12)}`,
    phone: `+250 78${String(8100000 + i * 4111).slice(0, 7)}`,
    trade,
    rateType: 'Daily',
    rate,
    payEveryDays: 15,
    active: true,
    createdAt: daysFromNow(-120),
  }));
  collections.workers.push(...workers);
  for (let d = 13; d >= 0; d -= 1) {
    const date = new Date(Date.now() - d * 86_400_000);
    if (date.getDay() === 0) continue; // no work on Sundays
    workers.forEach((w) => {
      const roll = rand();
      const status = roll > 0.93 ? 'Absent' : roll > 0.88 ? 'Half day' : 'Present';
      const units = status === 'Present' ? 1 : status === 'Half day' ? 0.5 : 0;
      collections.attendance.push({
        _id: newId(),
        projectId: id,
        date: date.toISOString().slice(0, 10),
        workerId: w._id,
        workerName: w.fullName,
        trade: w.trade,
        status,
        units,
        rateType: 'Daily',
        rate: w.rate,
        amount: units * w.rate,
        siteLocation: 'Main site',
        recordedByName: TEAM[1].user.fullName,
        paid: d > 7,
        payRunReference: d > 7 ? 'PR-KBH-007' : undefined,
      });
    });
  }
  const paidRows = collections.attendance.filter((a) => a.projectId === id && a.paid);
  collections.payRuns.push({
    _id: newId(),
    projectId: id,
    reference: 'PR-KBH-007',
    startDate: daysFromNow(-13),
    endDate: daysFromNow(-8),
    totalAmount: paidRows.reduce((s, r) => s + r.amount, 0),
    attendanceCount: paidRows.length,
    workerCount: workers.length,
    createdByName: TEAM[3].user.fullName,
    createdAt: daysFromNow(-7),
    expense: { _id: newId(), amount: paidRows.reduce((s, r) => s + r.amount, 0), approvalStatus: 'approved' },
  });

  // Petty cash
  const pc = (n: number, type: string, amount: number, description: string, category: string | undefined, status: string, days: number) => ({
    _id: newId(),
    projectId: id,
    voucherNumber: `PCV-${String(n).padStart(4, '0')}`,
    type,
    transactionDate: daysFromNow(-days),
    amount,
    description,
    category,
    payee: type === 'Payment' ? 'Local supplier' : undefined,
    responsiblePerson: { userId: TEAM[1].user._id, name: TEAM[1].user.fullName },
    documents: [],
    status,
    approval: status === 'Pending' ? undefined : { reviewedByName: 'Demo Manager', reviewedAt: daysFromNow(-days + 1) },
    expenseRecorded: status === 'Approved' && type === 'Payment',
    history: [{ action: 'Recorded', byName: TEAM[1].user.fullName, at: daysFromNow(-days) }],
    createdAt: daysFromNow(-days),
  });
  collections.pettyCash.push(
    pc(1, 'Top-up', 1_500_000, 'Monthly petty cash float', undefined, 'Approved', 25),
    pc(2, 'Payment', 85_000, 'Drinking water for workers', 'overheads', 'Approved', 20),
    pc(3, 'Payment', 240_000, 'Small tools – trowels and spirit levels', 'equipment', 'Approved', 14),
    pc(4, 'Payment', 120_000, 'Transport of samples to lab', 'overheads', 'Approved', 9),
    pc(5, 'Payment', 64_000, 'First aid kit refill', 'overheads', 'Pending', 2),
    pc(6, 'Payment', 150_000, 'Moto deliveries – urgent fittings', 'materials', 'Pending', 1)
  );

  // Subcontractors
  const sub = (name: string, trade: string, contractAmount: number, contact: string) => ({
    _id: newId(),
    projectId: id,
    name,
    trade,
    contactPerson: contact,
    phone: '+250 788 222 333',
    email: `${trade.toLowerCase().replace(/\W+/g, '')}@subcontractor.example`,
    contractAmount,
    boqItems: [],
    startDate: daysFromNow(-90),
    endDate: daysFromNow(200),
    status: 'Active',
    createdAt: daysFromNow(-95),
  });
  const subs = [
    sub('AquaFlow Plumbing Ltd', 'Plumbing', 189_000_000, 'Kevin Rukundo'),
    sub('PowerLine Electrical Co.', 'Electrical', 342_000_000, 'Ange Mutoni'),
    sub('Alu-Glass Facades', 'Curtain walling', 128_000_000, 'Moses Kayitare'),
  ];
  collections.subcontractors.push(...subs);
  const sp = (s: Row, n: number, amount: number, status: string, days: number) => ({
    _id: newId(),
    projectId: id,
    subcontractorId: s._id,
    subcontractorName: s.name,
    paymentNumber: `SCP-${String(n).padStart(4, '0')}`,
    paymentDate: daysFromNow(-days),
    amount,
    description: `Interim payment ${n}`,
    documents: [],
    status,
    approval: status === 'Pending' ? undefined : { reviewedByName: 'Demo Manager', reviewedAt: daysFromNow(-days + 1) },
    expenseRecorded: status === 'Approved',
    history: [],
    createdAt: daysFromNow(-days),
  });
  collections.subcontractorPayments.push(sp(subs[0], 1, 21_000_000, 'Approved', 40), sp(subs[1], 2, 25_000_000, 'Approved', 18), sp(subs[1], 3, 32_000_000, 'Pending', 3));

  // Documents
  const doc = (name: string, type: string, file: string, status: string, days: number) => ({
    id: newId(),
    projectId: id,
    type,
    name,
    path: fileUrl(file),
    date: daysFromNow(-days),
    source: type,
    isSensitive: false,
    status,
  });
  collections.documents.push(
    doc('Architectural drawings – rev C', 'Project', 'blueprints.webp', 'approved', 160),
    doc('Site progress photo – Level 5 slab', 'Progress', 'construction-site.webp', 'approved', 6),
    doc('Site team induction', 'Progress', 'site-team.webp', 'approved', 120),
    doc('IPC 3 supporting documents', 'Invoice', 'finance-docs.webp', 'pending', 55),
    doc('Monthly progress meeting', 'Project', 'meeting.webp', 'pending', 10)
  );

  // Notifications (bell + dashboard feed)
  const note = (area: string, title: string, message: string, days: number, read: boolean, actor: Row, tab = area) => ({
    _id: newId(),
    actorName: actor.fullName,
    projectId: id,
    projectName: project.name,
    resource: area,
    action: 'CREATE',
    area,
    title,
    message,
    link: `/projects/${id}?tab=${tab}`,
    read,
    createdAt: daysFromNow(-days),
  });
  collections.notifications.push(
    note('procurement', 'New material request', 'Cement CEM II 42.5N – 1,200 bags (High priority)', 0.05, false, TEAM[1].user),
    note('finance', 'Invoice submitted', 'KBH-IPC-004 for RWF 198,000,000 is awaiting approval', 0.4, false, TEAM[3].user),
    note('finance', 'Expense awaiting approval', 'Ceramic floor tiles – first batch', 1, false, TEAM[1].user),
    note('timeline', 'Progress updated', 'Superstructure frame (G to L6) is now 65% complete', 1.5, true, TEAM[1].user),
    note('inventory', 'Low stock', 'Cement CEM II 42.5N is below its minimum stock', 2, true, TEAM[4].user),
    note('procurement', 'Purchase order approved', 'PO-KBH-0014 – SteelRwa Ltd', 7, true, DEMO_USER),
    note('team', 'Team member joined', 'Patrick Niyonzima joined as QA/QC Officer', 12, true, TEAM[4].user, 'team')
  );

  return project;
}

// ---------------------------------------------------------------------------
// Lighter projects (for the company dashboard)
// ---------------------------------------------------------------------------

function lightProject(
  collections: Record<string, Row[]>,
  opts: {
    name: string;
    code: string;
    status: string;
    type?: string;
    client: string;
    contract: number;
    budget: Budget;
    spend: Partial<Budget>;
    invoices: [number, string, number][];
    stages: StagePlan[];
    teamSize: number;
    started: number;
    description: string;
  }
) {
  const id = newId();
  collections.budgets.push(budgetRow(id, opts.budget, opts.status === 'Planning' ? 'pending' : 'approved'));
  collections.expenses.push(...expensesFor(id, opts.spend, Math.max(1, Math.round(-opts.started / 30)), opts.status === 'Completed' ? 0 : 1));
  opts.invoices.forEach(([amount, status, daysAgo], i) => collections.invoices.push(invoiceRow(id, i + 1, amount, status, daysAgo, opts.code.split('-')[0])));
  collections.stages.push(...stagesFor(id, opts.stages, opts.status !== 'Planning'));
  return {
    _id: id,
    name: opts.name,
    projectCode: opts.code,
    projectDescription: opts.description,
    status: opts.status,
    type: opts.type || 'Capital',
    team: teamFor(opts.teamSize),
    progress: 0,
    budget: 0,
    clientName: opts.client,
    contractAmount: opts.contract,
    contract: { amount: opts.contract, startDate: daysFromNow(opts.started), signedDate: daysFromNow(opts.started - 10) },
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    documents: [],
    createdAt: daysFromNow(opts.started - 15),
    updatedAt: daysFromNow(-3),
    __v: 0,
  };
}

// ---------------------------------------------------------------------------

export function createDemoDb(): DemoDb {
  seed = 42;
  const collections: Record<string, Row[]> = {
    budgets: [],
    expenses: [],
    invoices: [],
    boqs: [],
    stages: [],
    progressReports: [],
    materialRequests: [],
    purchaseOrders: [],
    inventory: [],
    inventoryTransactions: [],
    workers: [],
    attendance: [],
    payRuns: [],
    pettyCash: [],
    subcontractors: [],
    subcontractorPayments: [],
    documents: [],
    notifications: [],
    receivingNotes: [],
    stockTransfers: [],
    stockLocations: [],
    companyInvitations: [],
    projectInvitations: [],
  };

  const projects = [
    showcase(collections),
    lightProject(collections, {
      name: 'Musanze Water Supply Extension',
      code: 'MWS-2026-02',
      status: 'In Progress',
      client: 'WASAC Group',
      contract: 640_000_000,
      budget: { materials: 260_000_000, labor: 95_000_000, equipment: 70_000_000, fuel: 25_000_000, overheads: 30_000_000, subcontractors: 40_000_000 },
      spend: { materials: 158_000_000, labor: 51_000_000, equipment: 46_000_000, fuel: 14_000_000, overheads: 16_000_000 },
      invoices: [[160_000_000, 'paid', 80], [138_000_000, 'approved', 30]],
      stages: [
        { stage: 'Mobilization', start: -120, end: -100, budget: 20_000_000, subs: [['Site camp', 100]] },
        { stage: 'Construction', start: -100, end: 90, budget: 450_000_000, subs: [['Trenching and pipe laying (12 km)', 70], ['Reservoir 500 m³', 45], ['Kiosks and connections', 10]] },
        { stage: 'Testing and Commissioning', start: 90, end: 120, budget: 25_000_000, subs: [['Pressure testing', 0]] },
      ],
      teamSize: 3,
      started: -120,
      description: '12 km water distribution pipeline, 500 m³ reservoir and 25 public water kiosks.',
    }),
    lightProject(collections, {
      name: 'Rubavu Feeder Road Rehabilitation',
      code: 'RFR-2026-03',
      status: 'Planning',
      client: 'Rwanda Transport Development Agency',
      contract: 980_000_000,
      budget: { materials: 380_000_000, labor: 120_000_000, equipment: 190_000_000, fuel: 70_000_000, overheads: 40_000_000, subcontractors: 0 },
      spend: { overheads: 9_500_000, equipment: 6_000_000 },
      invoices: [],
      stages: [
        { stage: 'Design', start: -20, end: 25, budget: 35_000_000, subs: [['Topographic survey', 60], ['Pavement design', 10]] },
        { stage: 'Mobilization', start: 25, end: 45, budget: 30_000_000, subs: [['Plant mobilisation', 0]] },
        { stage: 'Construction', start: 45, end: 280, budget: 800_000_000, subs: [['Earthworks', 0], ['Drainage structures', 0], ['Gravel wearing course', 0]] },
      ],
      teamSize: 2,
      started: -20,
      description: 'Rehabilitation of 18 km of feeder roads including drainage and culverts.',
    }),
    lightProject(collections, {
      name: 'Huye School Classroom Blocks',
      code: 'HSC-2025-07',
      status: 'Completed',
      client: 'Ministry of Education',
      contract: 310_000_000,
      budget: { materials: 140_000_000, labor: 50_000_000, equipment: 18_000_000, fuel: 7_000_000, overheads: 15_000_000, subcontractors: 20_000_000 },
      spend: { materials: 136_500_000, labor: 52_400_000, equipment: 16_800_000, fuel: 6_200_000, overheads: 13_900_000, subcontractors: 19_500_000 },
      invoices: [[120_000_000, 'paid', 200], [110_000_000, 'paid', 140], [80_000_000, 'paid', 60]],
      stages: [
        { stage: 'Construction', start: -260, end: -80, budget: 230_000_000, subs: [['Foundations', 100], ['Walling and roofing', 100], ['Finishes', 100]] },
        { stage: 'Handover', start: -80, end: -60, budget: 5_000_000, subs: [['Snagging and handover', 100]] },
      ],
      teamSize: 2,
      started: -260,
      description: '12 classrooms in 3 blocks with latrines and rainwater harvesting.',
    }),
  ];

  // Projects' progress follows their timeline
  projects.forEach((p) => {
    const stages = collections.stages.filter((s) => s.projectId === p._id);
    p.progress = stages.length ? Math.round(stages.reduce((sum, s) => sum + (s.progressPercentage || 0), 0) / stages.length) : 0;
  });

  // Stores the stock can move between
  collections.stockLocations.push({ _id: newId(), projectId: projects[0]._id, kind: 'Store', name: 'Basement store', createdAt: daysFromNow(-100) });

  const company = {
    _id: DEMO_COMPANY_ID,
    name: 'Demo Construction Ltd',
    registrationNumber: 'RDB-108765432',
    type: 'Contracting',
    address: 'KN 4 Ave, Kigali, Rwanda',
    email: 'info@demo-construction.example',
    contactNumber: '+250 788 000 000',
    website: 'https://demo-construction.example',
    experience: [{ description: 'Commercial and public buildings, water and road works', years: 12 }],
    certifications: [{ name: 'Building contractor – Category A', issuingBody: 'RPPA', issueDate: daysFromNow(-700) }],
    ownerId: { _id: DEMO_USER._id, fullName: DEMO_USER.fullName, email: DEMO_USER.email },
    members: [
      { _id: newId(), userId: { _id: DEMO_USER._id, fullName: DEMO_USER.fullName, email: DEMO_USER.email }, role: 'CompanyAdmin', permissions: [] },
      ...TEAM.map((m) => ({ _id: newId(), userId: { _id: m.user._id, fullName: m.user.fullName, email: m.user.email }, role: m.companyRole, permissions: [] })),
    ],
    invites: [],
    createdAt: daysFromNow(-700),
    updatedAt: daysFromNow(-5),
  };

  return {
    version: DEMO_DB_VERSION,
    users: [DEMO_USER, ...TEAM.map((m) => m.user)],
    company,
    projects,
    collections,
  };
}
