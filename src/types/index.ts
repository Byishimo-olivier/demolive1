export type AccessLevel = "view" | "edit" | "approve" | "admin";

export enum ProjectType {
  CAPITAL = "Capital",
  MAINTENANCE = "Maintenance",
}

export enum ProjectStatus {
  PLANNING = "Planning",
  IN_PROGRESS = "In Progress",
  ON_HOLD = "On Hold",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
}

export enum ExpenseCategory {
  MATERIALS = "materials",
  LABOR = "labor",
  EQUIPMENT = "equipment",
  FUEL = "fuel",
  OVERHEADS = "overheads",
}

export enum InvoiceStatus {
  PENDING = "pending",
  APPROVED = "approved",
  PAID = "paid",
  VOID = "void",
}

export enum InvoiceType {
  BOQ_BASED = "BoQ Based",
  SERVICE_BASED = "Service Based",
}

export enum BudgetApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum ReportingPeriod {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export enum BoQItemStatus {
  PENDING = "pending",
  IN_PROGRESS = "in-progress",
  COMPLETED = "completed",
}

export enum GRNStatus {
  COMPLETE = "complete",
  PARTIAL = "partial",
}

export enum UnitOfMeasurement {
  METER = "m",
  SQUARE_METER = "m²",
  CUBIC_METER = "m³",
  KILOGRAM = "kg",
  LITER = "l",
  PIECE = "pc",
  UNIT = "unit",
  TON = "ton",
  HOUR = "hour",
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  BAG = "bag",
  BUNDLE = "bundle",
  SET = "set",
  BOX = "box",
}

export enum PaymentTerms {
  IMMEDIATE = "Immediate",
  NET_15 = "Net 15",
  NET_30 = "Net 30",
  NET_60 = "Net 60",
  NET_90 = "Net 90",
  UPON_COMPLETION = "Upon completion",
  MILESTONE_BASED = "Milestone based",
}

export enum PriorityLevel {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

export enum ProjectStage {
  PRELIMINARIES = "Preliminaries",
  DESIGN = "Design",
  ENGINEERING = "Engineering",
  PROCUREMENT = "Procurement",
  MOBILIZATION = "Mobilization",
  CONSTRUCTION = "Construction",
  TESTING = "Testing and Commissioning",
  HANDOVER = "Handover",
}

export enum ProjectStageStatus {
  PENDING = "Pending",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
}

export enum Department {
  ENGINEERING = "Engineering",
  PROCUREMENT = "Procurement",
  FINANCE = "Finance",
  OPERATIONS = "Operations",
  MANAGEMENT = "Management",
  QUALITY_ASSURANCE = "Quality Assurance",
  HEALTH_SAFETY = "Health and Safety",
}

export enum UserRole {
  OWNER = "Owner",
  PROJECT_MANAGER = "ProjectManager",
  SITE_ENGINEER = "SiteEngineer",
  PROCUREMENT_OFFICER = "ProcurementOfficer",
  FINANCE_OFFICER = "FinanceOfficer",
  QA_QC_OFFICER = "QA_QCOfficer",
  HSE_OFFICER = "HSEOfficer",
}

export enum CompanyType {
  CONTRACTING = "Contracting",
  CONSULTING = "Consulting",
  SUPPLYING = "Supplying",
  MANUFACTURING = "Manufacturing",
  SERVICE = "Service",
  OTHER = "Other",
}

export enum MembershipTier {
  BASIC = "basic",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

export enum RateType {
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export type User = {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  profilePicture?: string;
  isEmailVerified: boolean;
  isIndividual: boolean;
  companies: string[];
  activeCompanyId?: string;
  permissions: string[];
  membershipTier: MembershipTier;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  _id: string;
  name: string;
  projectCode: string;
  projectDescription: string;
  status: string;
  type: "Capital" | "Maintenance";
  team: Array<{
    _id: string;
    role: UserRole;
    user: User;
  }>;
  progress: number;
  budget: number;
  createdBy: string;
  updatedBy: string;
  documents?: {
    filePath: string;
    description?: string;
  }[];
  createdAt: string;
  updatedAt: string;
  __v: number;
};

export type ProjectFormData = {
  name: string;
  projectDescription: string;
  status: string;
  type: "Capital" | "Maintenance";
  team: string[];
  progress: number;
  budget: number;
  file?: File;
  description: string;
};

export type MaterialRequest = {
  _id: string;
  projectId: string;
  requesterName: string;
  department: Department;
  requestDate: string;
  materialDetails: {
    materialName: string;
    quantity: number;
    unit: UnitOfMeasurement;
    requiredByDate: string;
    specifications?: string;
    estimatedCost: number;
    category: ExpenseCategory;
  }[];
  purpose: string;
  priorityLevel: PriorityLevel;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrder = {
  _id: string;
  projectId: string;
  poNumber: string;
  supplierDetails: string;
  orderDate: string;
  deliveryDate: string;
  materialRequestId?: string;
  materialList: {
    materialName: string;
    quantity: number;
    unit: UnitOfMeasurement;
    category: ExpenseCategory;
    unitPrice: number;
  }[];
  expenseRecorded: boolean;
  totalCost: number;
  paymentTerms: PaymentTerms;
  specialInstructions?: string;
  documentFilePath?: string;
  createdAt: string;
  updatedAt: string;
};

export type BidSubmission = {
  id: string;
  projectId: string;
  contractorName: string;
  contractorLicense: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  bidAmount: number;
  technicalProposal: string;
  financialProposal: string;
  supportingDocs: string[];
  submissionDate: string;
  termsAccepted: boolean;
  status: "draft" | "submitted" | "under_review" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
};

export type RegisterFormData = {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
  contact_number: string;
  user_role: "client" | "contractor" | "consultant";
  profile_picture_url?: string;
};

export type Company = {
  _id: string;
  name: string;
  registrationNumber: string;
  type: CompanyType;
  address: string;
  email: string;
  contactNumber: string;
  website?: string;
  logo?: string;
  experience?: {
    description: string;
    years?: number;
    documentProof?: string;
  }[];
  certifications?: {
    name: string;
    issuingBody: string;
    issueDate: string;
    expiryDate?: string;
    documentProof?: string;
  }[];
  ownerId:
    | string
    | {
        _id: string;
        fullName: string;
        email: string;
      };
  members: {
    _id: string;
    userId:
      | string
      | {
          _id: string;
          fullName: string;
          email: string;
          profilePicture?: string;
        };
    role: UserRole;
    permissions: string[];
  }[];
  invites?: CompanyInvite[];
  createdAt: string;
  updatedAt: string;
};

export type CompanyMember = {
  _id: string;
  userId: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    profilePicture?: string;
  };
  role: UserRole;
  joinedAt: string;
};

export type CompanyInvite = {
  _id: string;
  email: string;
  role: UserRole;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt: string;
};

export type ProjectInvite = {
  _id: string;
  email: string;
  role: UserRole;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt: string;
};

export type CreateCompanyData = {
  name: string;
  registrationNumber: string;
  type: CompanyType;
  address: string;
  email: string;
  contactNumber: string;
  website?: string;
  experience?: {
    description: string;
    years?: number;
    documentProof?: File;
  }[];
  certifications?: {
    name: string;
    issuingBody: string;
    issueDate: string;
    expiryDate?: string;
    documentProof?: File;
  }[];
  experienceDocuments?: File[];
  certificationDocuments?: File[];
};

export type InviteMemberData = {
  companyId: string;
  email: string;
  role: UserRole;
  projectIds?: string[];
};
