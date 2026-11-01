export const Permissions = {
  // Project permissions
  CREATE_PROJECT: 'project:create',
  UPDATE_PROJECT: 'project:update',
  VIEW_PROJECT: 'project:view',
  DELETE_PROJECT: 'project:delete',
  MANAGE_PROJECT_TEAM: 'project:manage-team',
  VIEW_PROJECT_REPORTS: 'project:view-reports',

  // Company permissions
  COMPANY_CREATE: 'company:create',
  COMPANY_VIEW: 'company:view',
  COMPANY_UPDATE: 'company:update',
  COMPANY_INVITE_MEMBER: 'company:invite-member',
  COMPANY_MANAGE_MEMBERS: 'company:manage-members',
  COMPANY_ASSOCIATE_PROJECT: 'company:associate-project',
  COMPANY_VIEW_PROJECTS: 'company:view-projects',

  // Budget permissions
  CREATE_BUDGET: 'budget:create',
  UPDATE_BUDGET: 'budget:update',
  VIEW_BUDGET: 'budget:view',

  // Expense permissions
  CREATE_EXPENSE: 'expense:create',
  UPDATE_EXPENSE: 'expense:update',
  DELETE_EXPENSE: 'expense:delete',
  VIEW_EXPENSE: 'expense:view',

  // Invoice permissions
  CREATE_INVOICE: 'invoice:create',
  UPDATE_INVOICE_STATUS: 'invoice:update-status',
  VIEW_INVOICE: 'invoice:view',

  // Material request permissions
  CREATE_MATERIAL_REQUEST: 'material-request:create',
  DELETE_MATERIAL_REQUEST: 'material-request:delete',
  UPDATE_MATERIAL_REQUEST: 'material-request:update',
  APPROVE_MATERIAL_REQUEST: 'material-request:approve',
  VIEW_MATERIAL_REQUEST: 'material-request:view',

  // Purchase order permissions
  CREATE_PURCHASE_ORDER: 'purchase-order:create',
  UPDATE_PURCHASE_ORDER: 'purchase-order:update',
  DELETE_PURCHASE_ORDER: 'purchase-order:delete',
  VIEW_PURCHASE_ORDER: 'purchase-order:view',

  // BOQ permissions
  CREATE_BOQ: 'boq:create',
  UPDATE_BOQ_PROGRESS: 'boq:update-progress',
  VIEW_BOQ: 'boq:view',

  // Inventory permissions
  MANAGE_INVENTORY: 'inventory:manage',
  VIEW_INVENTORY: 'inventory:view',

  // Stock transfers between the main store and project sites
  CREATE_STOCK_TRANSFER: 'stock-transfer:create',
  VIEW_STOCK_TRANSFER: 'stock-transfer:view',

  // Site receiving notes (deliveries and inspection)
  CREATE_RECEIVING_NOTE: 'receiving:create',
  VIEW_RECEIVING_NOTE: 'receiving:view',

  // Petty cash
  CREATE_PETTY_CASH: 'petty-cash:create',
  VIEW_PETTY_CASH: 'petty-cash:view',

  // Labour attendance
  RECORD_LABOUR: 'labour:record',
  VIEW_LABOUR: 'labour:view',
  // Subcontractors and the payments made to them
  MANAGE_SUBCONTRACTORS: 'subcontractor:manage',
  VIEW_SUBCONTRACTORS: 'subcontractor:view',

  // Timeline permissions
  CREATE_PROJECT_STAGE: 'timeline:create-stage',
  UPDATE_PROGRESS_TRACKING: 'timeline:update-progress',
  UPDATE_PROJECT_STAGE: 'timeline:update-stage',
  VIEW_TIMELINE: 'timeline:view',
  DELETE_PROJECT_STAGE: 'timeline:delete-stage',
  DELETE_PROGRESS_TRACKING: 'timeline:delete-progress',
  APPROVE_PROJECT_STAGE: 'timeline:approve-stage',

  // Document permissions
  REVIEW_DOCUMENT: 'document:review',
  DELETE_DOCUMENT: 'document:delete',
  UPLOAD_DOCUMENT: 'document:upload',
  VIEW_DOCUMENT: 'document:view',

  // Quality control permissions
  CREATE_QUALITY_REPORT: 'quality:create-report',
  APPROVE_QUALITY: 'quality:approve',

  // Admin permissions
  ADMIN_VIEW_ALL: 'admin:view-all',
  ADMIN_MANAGE_USERS: 'admin:manage-users',
  ADMIN_SYSTEM_SETTINGS: 'admin:system-settings',

  // User permissions
  VIEW_USER: 'user:view',

  // Bidding permissions (matching backend)
  CREATE_TENDER: 'bidding:create-tender',
  UPDATE_TENDER: 'bidding:update-tender',
  VIEW_TENDER: 'bidding:view-tender',
  DELETE_TENDER: 'bidding:delete-tender',
  PUBLISH_TENDER: 'bidding:publish-tender',
  MANAGE_TENDERS: 'bidding:manage-tender',
  
  REGISTER_BIDDER: 'bidder:register',
  VIEW_BIDDER: 'bidder:view',
  UPDATE_BIDDER: 'bidder:update',
  
  SUBMIT_BID: 'bidding:submit-bid',
  VIEW_BID: 'bidding:view-bid',
  UPDATE_BID: 'bidding:update-bid', 
  DELETE_BID: 'bidding:delete-bid',
  EVALUATE_BID: 'bidding:evaluate-bids',
  AWARD_BID: 'bidding:award-tender',
  
  ASK_CLARIFICATION: 'clarification:ask',
  ANSWER_CLARIFICATION: 'clarification:answer',
  VIEW_CLARIFICATION: 'clarification:view',
} as const;

export const CompanyUserRole = {
  ADMIN: 'CompanyAdmin',
  MANAGER: 'CompanyManager', 
  MEMBER: 'CompanyMember',
  MANAGING_DIRECTOR: 'ManagingDirector',
  PROJECT_MANAGER: 'ProjectManager',
  SITE_ENGINEER: 'SiteEngineer',
  PROCUREMENT_MANAGER: 'ProcurementManager',
  FINANCE_MANAGER: 'FinanceManager',
} as const;

export const companyPermissions: Record<string, string[]> = {
  [CompanyUserRole.ADMIN]: [
    // Full company access
    Permissions.COMPANY_VIEW  ,
    Permissions.COMPANY_UPDATE,
    Permissions.COMPANY_INVITE_MEMBER,
    Permissions.COMPANY_MANAGE_MEMBERS,
    Permissions.COMPANY_ASSOCIATE_PROJECT,
      Permissions.COMPANY_VIEW_PROJECTS,
    // All project permissions for company projects
    Permissions.CREATE_PROJECT,
    Permissions.UPDATE_PROJECT,
    Permissions.DELETE_PROJECT,
    Permissions.MANAGE_PROJECT_TEAM,
    
    // All procurement permissions
    Permissions.CREATE_MATERIAL_REQUEST,
    Permissions.VIEW_MATERIAL_REQUEST,
    Permissions.CREATE_PURCHASE_ORDER,
    Permissions.UPDATE_PURCHASE_ORDER,
    Permissions.VIEW_PURCHASE_ORDER,
    // All timeline permissions
    Permissions.CREATE_PROJECT_STAGE,
    Permissions.UPDATE_PROJECT_STAGE,
    Permissions.UPDATE_PROGRESS_TRACKING,
    Permissions.VIEW_TIMELINE,
    Permissions.APPROVE_PROJECT_STAGE,
    // All finance permissions
    Permissions.VIEW_BUDGET,
    Permissions.CREATE_BUDGET,
    Permissions.UPDATE_BUDGET,
    Permissions.CREATE_EXPENSE,
    Permissions.VIEW_EXPENSE,
    Permissions.CREATE_INVOICE,
    Permissions.UPDATE_INVOICE_STATUS,
    Permissions.VIEW_INVOICE,
    // All BoQ permissions
    Permissions.CREATE_BOQ,
    Permissions.VIEW_BOQ,
    Permissions.UPDATE_BOQ_PROGRESS,
    // All inventory permissions
    Permissions.MANAGE_INVENTORY,
    Permissions.VIEW_INVENTORY,
    Permissions.CREATE_STOCK_TRANSFER,
    Permissions.VIEW_STOCK_TRANSFER,
    Permissions.CREATE_RECEIVING_NOTE,
    Permissions.VIEW_RECEIVING_NOTE,
    Permissions.CREATE_PETTY_CASH,
    Permissions.VIEW_PETTY_CASH,
    Permissions.RECORD_LABOUR,
    Permissions.VIEW_LABOUR,
    Permissions.MANAGE_SUBCONTRACTORS,
    Permissions.VIEW_SUBCONTRACTORS,
    // All bidding permissions
    Permissions.CREATE_TENDER,
    Permissions.UPDATE_TENDER,
    Permissions.VIEW_TENDER,
    Permissions.DELETE_TENDER,
    Permissions.PUBLISH_TENDER,
    Permissions.MANAGE_TENDERS,
    Permissions.VIEW_BID,
    Permissions.EVALUATE_BID,
    Permissions.AWARD_BID,
    Permissions.ANSWER_CLARIFICATION,
    Permissions.VIEW_CLARIFICATION,
    Permissions.SUBMIT_BID,

    Permissions.VIEW_DOCUMENT,
    Permissions.UPLOAD_DOCUMENT,
    Permissions.REVIEW_DOCUMENT,
    Permissions.DELETE_DOCUMENT,
  ],
  
  [CompanyUserRole.MANAGING_DIRECTOR]: [
    Permissions.COMPANY_VIEW,
    Permissions.COMPANY_VIEW_PROJECTS,
    Permissions.VIEW_PROJECT_REPORTS,
    Permissions.VIEW_BUDGET,
    Permissions.VIEW_EXPENSE,
    // The MD can always record expenses by hand
    Permissions.CREATE_EXPENSE,
    Permissions.VIEW_INVOICE,
    Permissions.VIEW_MATERIAL_REQUEST,
    Permissions.VIEW_PURCHASE_ORDER,
    Permissions.VIEW_BOQ,
    Permissions.VIEW_INVENTORY,
    Permissions.VIEW_TIMELINE,
    Permissions.VIEW_DOCUMENT,
    // The MD acts for the owner on deliveries, transfers, petty cash and labour
    Permissions.CREATE_STOCK_TRANSFER,
    Permissions.VIEW_STOCK_TRANSFER,
    Permissions.CREATE_RECEIVING_NOTE,
    Permissions.VIEW_RECEIVING_NOTE,
    Permissions.CREATE_PETTY_CASH,
    Permissions.VIEW_PETTY_CASH,
    Permissions.RECORD_LABOUR,
    Permissions.VIEW_LABOUR,
    Permissions.MANAGE_SUBCONTRACTORS,
    Permissions.VIEW_SUBCONTRACTORS,
    // Bidding permissions
    Permissions.VIEW_TENDER,
    Permissions.VIEW_BID,
    Permissions.VIEW_CLARIFICATION,
    // Strategic oversight permissions
    Permissions.APPROVE_PROJECT_STAGE,
  ],
  
  [CompanyUserRole.MANAGER]: [
    Permissions.COMPANY_VIEW,
    Permissions.COMPANY_INVITE_MEMBER,
    Permissions.COMPANY_ASSOCIATE_PROJECT,
    Permissions.COMPANY_VIEW_PROJECTS,
    Permissions.MANAGE_PROJECT_TEAM,
    Permissions.VIEW_MATERIAL_REQUEST,
    Permissions.VIEW_PURCHASE_ORDER,
    Permissions.CREATE_PROJECT_STAGE,
    Permissions.UPDATE_PROJECT_STAGE,
    Permissions.VIEW_BOQ,
    Permissions.CREATE_BOQ,
    Permissions.VIEW_INVENTORY,
    Permissions.VIEW_STOCK_TRANSFER,
    Permissions.VIEW_RECEIVING_NOTE,
    Permissions.VIEW_TIMELINE,
    Permissions.VIEW_DOCUMENT,
    // Bidding permissions
    Permissions.CREATE_TENDER,
    Permissions.UPDATE_TENDER,
    Permissions.VIEW_TENDER,
    Permissions.PUBLISH_TENDER,
    Permissions.MANAGE_TENDERS,
    Permissions.VIEW_BID,
    Permissions.EVALUATE_BID,
    Permissions.AWARD_BID,
    Permissions.ANSWER_CLARIFICATION,
    Permissions.VIEW_CLARIFICATION,
  ],
  
  [CompanyUserRole.PROJECT_MANAGER]: [
    Permissions.COMPANY_VIEW_PROJECTS,
    Permissions.MANAGE_PROJECT_TEAM,
    Permissions.VIEW_PROJECT_REPORTS,
    Permissions.UPDATE_BOQ_PROGRESS,
    Permissions.UPDATE_PROGRESS_TRACKING,
    Permissions.CREATE_PROJECT_STAGE,
    Permissions.UPDATE_PROJECT_STAGE,
    Permissions.VIEW_MATERIAL_REQUEST,
    Permissions.VIEW_PURCHASE_ORDER,
    Permissions.VIEW_BOQ,
    Permissions.CREATE_BOQ,
    Permissions.UPDATE_BOQ_PROGRESS,
    Permissions.VIEW_INVENTORY,
    Permissions.MANAGE_INVENTORY,
    Permissions.CREATE_STOCK_TRANSFER,
    Permissions.VIEW_STOCK_TRANSFER,
    Permissions.CREATE_RECEIVING_NOTE,
    Permissions.VIEW_RECEIVING_NOTE,
    Permissions.CREATE_PETTY_CASH,
    Permissions.VIEW_PETTY_CASH,
    Permissions.RECORD_LABOUR,
    Permissions.VIEW_LABOUR,
    Permissions.MANAGE_SUBCONTRACTORS,
    Permissions.VIEW_SUBCONTRACTORS,
    Permissions.VIEW_TIMELINE,
    Permissions.VIEW_DOCUMENT,
    // Bidding permissions
    Permissions.VIEW_TENDER,
    Permissions.VIEW_BID,
    Permissions.EVALUATE_BID,
    Permissions.VIEW_CLARIFICATION,
    Permissions.ANSWER_CLARIFICATION,

    Permissions.VIEW_DOCUMENT,
  Permissions.UPLOAD_DOCUMENT,
  Permissions.REVIEW_DOCUMENT,
  Permissions.DELETE_DOCUMENT,
  ],
  
  [CompanyUserRole.SITE_ENGINEER]: [
    Permissions.COMPANY_VIEW_PROJECTS,
    Permissions.UPDATE_BOQ_PROGRESS,
    Permissions.UPDATE_PROGRESS_TRACKING,
    Permissions.CREATE_MATERIAL_REQUEST,
    Permissions.VIEW_MATERIAL_REQUEST,
    Permissions.MANAGE_INVENTORY,
    Permissions.VIEW_INVENTORY,
    // The site manager receives deliveries against purchase orders
    Permissions.VIEW_PURCHASE_ORDER,
    Permissions.CREATE_RECEIVING_NOTE,
    Permissions.VIEW_RECEIVING_NOTE,
    Permissions.CREATE_STOCK_TRANSFER,
    Permissions.VIEW_STOCK_TRANSFER,
    Permissions.CREATE_PETTY_CASH,
    Permissions.VIEW_PETTY_CASH,
    Permissions.RECORD_LABOUR,
    Permissions.VIEW_LABOUR,
    Permissions.VIEW_SUBCONTRACTORS,
    Permissions.VIEW_BOQ,
    Permissions.UPDATE_BOQ_PROGRESS,
    Permissions.VIEW_TIMELINE,
    Permissions.VIEW_DOCUMENT,
    // Bidding permissions
    Permissions.VIEW_TENDER,
    Permissions.VIEW_CLARIFICATION,
  ],
  
  [CompanyUserRole.PROCUREMENT_MANAGER]: [
    Permissions.COMPANY_VIEW_PROJECTS,
    Permissions.CREATE_PURCHASE_ORDER,
    Permissions.UPDATE_PURCHASE_ORDER,
    Permissions.VIEW_PURCHASE_ORDER,
    Permissions.CREATE_MATERIAL_REQUEST,
    Permissions.APPROVE_MATERIAL_REQUEST,
    Permissions.VIEW_MATERIAL_REQUEST,
    Permissions.MANAGE_INVENTORY,
    Permissions.VIEW_INVENTORY,
    Permissions.CREATE_STOCK_TRANSFER,
    Permissions.VIEW_STOCK_TRANSFER,
    Permissions.CREATE_RECEIVING_NOTE,
    Permissions.VIEW_RECEIVING_NOTE,
    Permissions.VIEW_SUBCONTRACTORS,
    Permissions.VIEW_BOQ,
    Permissions.VIEW_TIMELINE,
    Permissions.VIEW_DOCUMENT,
    // Bidding permissions
    Permissions.VIEW_TENDER,
    Permissions.VIEW_CLARIFICATION,
  ],
  
  [CompanyUserRole.FINANCE_MANAGER]: [
    Permissions.COMPANY_VIEW_PROJECTS,
    Permissions.VIEW_BUDGET,
    Permissions.CREATE_BUDGET,
    Permissions.UPDATE_BUDGET,
    Permissions.CREATE_EXPENSE,
    Permissions.VIEW_EXPENSE,
    Permissions.CREATE_INVOICE,
    Permissions.UPDATE_INVOICE_STATUS,
    Permissions.VIEW_INVOICE,
    Permissions.VIEW_PURCHASE_ORDER,
    Permissions.VIEW_BOQ,
    Permissions.VIEW_INVENTORY,
    Permissions.VIEW_STOCK_TRANSFER,
    Permissions.VIEW_RECEIVING_NOTE,
    Permissions.CREATE_PETTY_CASH,
    Permissions.VIEW_PETTY_CASH,
    Permissions.VIEW_LABOUR,
    Permissions.MANAGE_SUBCONTRACTORS,
    Permissions.VIEW_SUBCONTRACTORS,
    Permissions.VIEW_TIMELINE,
    Permissions.VIEW_DOCUMENT,
    // Bidding permissions
    Permissions.VIEW_TENDER,
    Permissions.VIEW_CLARIFICATION,
  ],
  
  [CompanyUserRole.MEMBER]: [
    Permissions.COMPANY_VIEW,
    Permissions.COMPANY_VIEW_PROJECTS,
    Permissions.VIEW_PROJECT,
    Permissions.VIEW_BOQ,
    Permissions.VIEW_INVENTORY,
    Permissions.VIEW_DOCUMENT,
    // Bidding permissions (limited access)
    Permissions.VIEW_TENDER,
  ],
};

// Helper function to get permissions for a company role (matches backend)
export const getCompanyPermissionsForRole = (role: string): string[] => {
  return companyPermissions[role] || [];
};

// Clean permission system now uses CanPerformAction components