// Bidding-related enums and constants

export enum CompanyType {
  CONTRACTING = 'Contracting',
  CONSULTING = 'Consulting', 
  SUPPLYING = 'Supplying',
  MANUFACTURING = 'Manufacturing',
  SERVICE = 'Service',
  OTHER = 'Other'
}

export enum ProjectRole {
  MAIN_CONTRACTOR = 'Main Contractor',
  SUBCONTRACTOR = 'Subcontractor',
  CONSULTANT = 'Consultant',
  DESIGNER = 'Designer',
  SUPPLIER = 'Supplier',
  PROJECT_MANAGER = 'Project Manager'
}

export const COMPANY_TYPE_OPTIONS = [
  { value: CompanyType.CONTRACTING, label: 'Contracting' },
  { value: CompanyType.CONSULTING, label: 'Consulting' },
  { value: CompanyType.SUPPLYING, label: 'Supplying' },
  { value: CompanyType.MANUFACTURING, label: 'Manufacturing' },
  { value: CompanyType.SERVICE, label: 'Service' },
  { value: CompanyType.OTHER, label: 'Other' }
];

export const PROJECT_ROLE_OPTIONS = [
  { value: ProjectRole.MAIN_CONTRACTOR, label: 'Main Contractor' },
  { value: ProjectRole.SUBCONTRACTOR, label: 'Subcontractor' },
  { value: ProjectRole.CONSULTANT, label: 'Consultant' },
  { value: ProjectRole.DESIGNER, label: 'Designer' },
  { value: ProjectRole.SUPPLIER, label: 'Supplier' },
  { value: ProjectRole.PROJECT_MANAGER, label: 'Project Manager' }
];

export const REGISTRATION_STEPS = [
  { id: 1, title: 'Company Info', description: 'Basic company details' },
  { id: 2, title: 'Contact & Address', description: 'Contact information' },
  { id: 3, title: 'Financial Info', description: 'Financial details' },
  { id: 4, title: 'Experience', description: 'Project experience' },
  { id: 5, title: 'Documents', description: 'Supporting documents' }
];

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'COMPANY_PROFILE', label: 'Company Profile' },
  { value: 'FINANCIAL_STATEMENT', label: 'Financial Statement' },
  { value: 'REGISTRATION_CERT', label: 'Registration Certificate' },
  { value: 'TAX_CERT', label: 'Tax Certificate' },
  { value: 'OTHER', label: 'Other' }
];