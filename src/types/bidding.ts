// Bidding types based on backend models

export enum TenderType {
  CONSTRUCTION = "Construction",
  CONSULTANCY = "Consultancy", 
  SUPPLY = "Supply",
  MAINTENANCE = "Maintenance",
  DESIGN_BUILD = "Design & Build"
}

export enum TenderStatus {
  DRAFT = "Draft",
  PUBLISHED = "Published",
  CLOSED = "Closed",
  AWARDED = "Awarded",
  CANCELLED = "Cancelled"
}

export enum BidOpeningStatus {
  PENDING = "Pending",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed"
}

export enum TenderDocumentType {
  BOQ = "BOQ",
  TECHNICAL_SPEC = "Technical Specification",
  DRAWINGS = "Drawings",
  TERMS = "Terms",
  FORMS = "Forms",
  ADDENDUM = "Addendum",
  OTHER = "Other"
}

export enum BidderStatus {
  ACTIVE = "Active",
  SUSPENDED = "Suspended",
  BLACKLISTED = "Blacklisted"
}

export enum BidStatus {
  DRAFT = "Draft",
  SUBMITTED = "Submitted",
  UNDER_EVALUATION = "Under Evaluation",
  EVALUATED = "Evaluated",
  AWARDED = "Awarded",
  REJECTED = "Rejected",
  WITHDRAWN = "Withdrawn"
}

export enum BidEvaluationStatus {
  PENDING = "Pending",
  TECHNICAL_REVIEW = "Technical Review",
  FINANCIAL_REVIEW = "Financial Review",
  COMPLETED = "Completed"
}

export enum ClarificationStatus {
  PENDING = "Pending",
  RESPONDED = "Responded",
  CLOSED = "Closed"
}

export enum CompanyType {
  CORPORATION = "Corporation",
  LLC = "LLC",
  PARTNERSHIP = "Partnership",
  SOLE_PROPRIETORSHIP = "Sole Proprietorship",
  COOPERATIVE = "Cooperative",
  NON_PROFIT = "Non-Profit"
}

// Core Interfaces

export interface TenderDocument {
  filePath: string;
  description: string;
  documentType: TenderDocumentType;
  uploadedAt: string;
}

export interface TenderEligibilityCriteria {
  minimumExperience: number; // years
  minimumTurnover: number; // monetary value
  requiredLicenses: string[];
  requiredCertifications: string[];
  geographicalRestrictions?: string[];
}

export interface Tender {
  _id: string;
  projectId: string;
  companyId: string;
  tenderNumber: string;
  title: string;
  description: string;
  type: TenderType;
  status: TenderStatus;
  
  // Key Dates
  publicationDate?: string;
  preBidMeetingDate?: string;
  clarificationDeadline: string;
  submissionDeadline: string;
  bidOpeningDate: string;
  
  // Eligibility and Requirements
  eligibilityCriteria: TenderEligibilityCriteria;
  estimatedBudget?: number; // Internal use only
  
  // Documents
  documents: TenderDocument[];
  boqId?: string; // Reference to the project's BoQ
  
  // Management
  tenderManager: string; // User responsible
  evaluationCommittee: string[]; // Users in evaluation committee
  
  // Bid Opening
  bidOpeningStatus: BidOpeningStatus;
  bidOpeningOfficer?: string;
  
  // Metadata
  createdBy: string | { _id: string; email: string };
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BidBoQItem {
  boqItemId?: string; // Optional: for pricing existing BoQ
  description?: string; // Required for manual entry
  unit?: string; // Required for manual entry
  quantity?: number; // Required for manual entry
  unitRate: number;
  totalAmount: number;
}

export interface BidDocument {
  filePath: string;
  description: string;
  documentType: string;
}

export interface BidTechnicalProposal {
  methodology: string;
  workPlan: string;
  teamStructure: string;
  equipmentList: string;
  projectSchedule: string;
  documents: BidDocument[];
}

export interface BidFinancialProposal {
  totalBidPrice: number;
  boqItems?: BidBoQItem[];
  priceBreakdown: {
    materials: number;
    labor: number;
    equipment: number;
    overheads: number;
    profit: number;
  };
  cashFlowProjection?: string; // File path to cash flow document
  documents: BidDocument[];
}

export interface BidEvaluation {
  technicalScore?: number;
  technicalMaxScore?: number;
  technicalComments?: string;
  financialScore?: number;
  financialMaxScore?: number;
  financialComments?: string;
  overallScore?: number;
  overallRank?: number;
  evaluatedBy?: string;
  evaluatedAt?: string;
  status: BidEvaluationStatus;
}

export interface Bid {
  _id: string;
  tenderId: string;
  bidderId: string | { _id: string; companyName: string };
  bidNumber: string;
  
  // Submission Details
  submissionDate: string;
  status: BidStatus;
  
  // Proposals
  technicalProposal: BidTechnicalProposal;
  financialProposal: BidFinancialProposal;
  
  // Security & Validation
  isSealed: boolean; // Financial proposal sealed until bid opening
  sealedUntil?: string;
  digitalSignature?: string;
  submissionHash?: string; // For integrity verification
  
  // Additional Documents
  otherDocuments: BidDocument[];
  
  // Evaluation
  evaluation: BidEvaluation;
  
  // Award Information
  isAwarded: boolean;
  awardDate?: string;
  contractValue?: number;
  
  // Metadata
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BidderExperience {
  projectName: string;
  clientName: string;
  projectValue: number;
  completionDate: string;
  description: string;
  role: string; // e.g., "Main Contractor", "Subcontractor", "Consultant"
}

export interface BidderQualification {
  certificationType: string;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
  filePath: string;
}

export interface BidderAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Bidder {
  _id: string;
  userId: string; // Reference to User account
  companyId?: string; // Reference to Company account
  companyName: string;
  companyType: CompanyType;
  registrationNumber: string;
  taxId: string;
  
  // Contact Information
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: BidderAddress;
  
  // Financial Information
  annualTurnover: number;
  bankName: string;
  bankAccountNumber: string;
  
  // Experience and Qualifications
  experience: BidderExperience[];
  qualifications: BidderQualification[];
  
  // Profile Status
  status: BidderStatus;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedBy?: string;
  verifiedAt?: string;
  
  // Profile Documents
  profileDocuments: {
    filePath: string;
    documentType: "COMPANY_PROFILE" | "FINANCIAL_STATEMENT" | "REGISTRATION_CERT" | "TAX_CERT" | "OTHER";
    description: string;
    uploadedAt: string;
  }[];
  
  // Metadata
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Clarification {
  _id: string;
  tenderId: string;
  askedBy: string; // Bidder ID
  question: string;
  answer?: string;
  answeredBy?: string; // Tender Manager ID
  answeredAt?: string;
  status: ClarificationStatus;
  isPublic: boolean; // Whether answer is visible to all bidders
  createdAt: string;
  updatedAt: string;
}

// DTOs for API requests

export interface CreateTenderDTO {
  projectId: string;
  title: string;
  description: string;
  type: TenderType;
  clarificationDeadline: string;
  submissionDeadline: string;
  bidOpeningDate: string;
  preBidMeetingDate?: string;
  eligibilityCriteria: TenderEligibilityCriteria;
  tenderManager: string;
  estimatedBudget?: number;
  evaluationCommittee?: string[];
  documents?: File[];
  boqId?: string;
}

export interface UpdateTenderDTO {
  title?: string;
  description?: string;
  clarificationDeadline?: string;
  submissionDeadline?: string;
  bidOpeningDate?: string;
  preBidMeetingDate?: string;
  eligibilityCriteria?: Partial<TenderEligibilityCriteria>;
  estimatedBudget?: number;
  evaluationCommittee?: string[];
  documents?: File[];
}

export interface RegisterBidderDTO {
  companyName: string;
  companyType: CompanyType;
  registrationNumber: string;
  taxId: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: BidderAddress;
  annualTurnover: number;
  bankName: string;
  bankAccountNumber: string;
  experience?: BidderExperience[];
  qualifications?: BidderQualification[];
  profileDocuments?: File[];
}

export interface SubmitBidDTO {
  tenderId: string;
  bidderId: string;
  technicalProposal: {
    methodology: string;
    workPlan: string;
    teamStructure: string;
    equipmentList: string;
    projectSchedule: string;
    documents?: File[];
  };
  financialProposal: {
    totalBidPrice: number;
    boqItems?: BidBoQItem[];
    priceBreakdown: {
      materials: number;
      labor: number;
      equipment: number;
      overheads: number;
      profit: number;
    };
    cashFlowProjection?: File;
    documents?: File[];
  };
  otherDocuments?: File[];
}

export interface AskClarificationDTO {
  tenderId: string;
  question: string;
  bidderId: string;
}

export interface AnswerClarificationDTO {
  tenderId: string;
  response: string;
  isPublic: boolean;
}

export interface SubmitTechnicalScoreDTO {
  score: number;
  maxScore: number;
  comments?: string;
}

// Response types
export interface TendersResponse {
  success: boolean;
  data: Tender[];
  message: string;
}

export interface TenderResponse {
  success: boolean;
  data: Tender;
  message: string;
}

export interface BidsResponse {
  success: boolean;
  data: Bid[];
  message: string;
}

export interface BidResponse {
  success: boolean;
  data: Bid;
  message: string;
}

export interface BidderResponse {
  success: boolean;
  data: Bidder;
  message: string;
}

export interface ClarificationsResponse {
  success: boolean;
  data: Clarification[];
  message: string;
}