import { api } from './axios';
import { Permissions } from '../constants/permissions';
import type {
  CreateTenderDTO,
  UpdateTenderDTO,
  RegisterBidderDTO,
  SubmitBidDTO,
  AskClarificationDTO,
  AnswerClarificationDTO,
  SubmitTechnicalScoreDTO,
  TendersResponse,
  TenderResponse,
  BidsResponse,
  BidResponse,
  BidderResponse,
  ClarificationsResponse,
  Tender,
  Bid,
  Bidder,
  Clarification,
  TenderStatus,
  TenderType
} from '../types/bidding';

// API Functions
export const biddingApi = {
  // --- Tender Routes ---
  
  createTender: async (data: CreateTenderDTO): Promise<TenderResponse> => {
    const formData = new FormData();
    
    // Add regular fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents') {
        // Skip documents, we'll handle them separately
        return;
      } else if (key === 'eligibilityCriteria' || key === 'evaluationCommittee') {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'estimatedBudget' && value !== undefined && value !== null) {
        // Send as string but the backend middleware should parse it as number
        formData.append(key, value.toString());
      } else if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Add documents
    if (data.documents) {
      data.documents.forEach((file) => {
        formData.append('documents', file);
      });
    }
    
    const response = await api.post<TenderResponse>('/bidding/tenders', formData, {
      requiresPermission: Permissions.CREATE_TENDER,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getAllTenders: async (filters?: {
    status?: TenderStatus;
    type?: TenderType;
  }): Promise<TendersResponse> => {
    const response = await api.get<TendersResponse>('/bidding/tenders', {
      requiresPermission: Permissions.VIEW_TENDER,
      params: filters
    });
    return response.data;
  },

  getTenderById: async (id: string): Promise<TenderResponse> => {
    const response = await api.get<TenderResponse>(`/bidding/tenders/${id}`, {
      requiresPermission: Permissions.VIEW_TENDER
    });
    return response.data;
  },

  updateTender: async (id: string, data: UpdateTenderDTO): Promise<TenderResponse> => {
    const formData = new FormData();
    
    // Add regular fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents') {
        // Skip documents, we'll handle them separately
        return;
      } else if (key === 'eligibilityCriteria' || key === 'evaluationCommittee') {
        if (value !== undefined) {
          formData.append(key, JSON.stringify(value));
        }
      } else if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Add documents
    if (data.documents) {
      data.documents.forEach((file) => {
        formData.append('documents', file);
      });
    }
    
    const response = await api.patch<TenderResponse>(`/bidding/tenders/${id}`, formData, {
      requiresPermission: Permissions.UPDATE_TENDER,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  publishTender: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/bidding/tenders/${id}/publish`, {}, {
      requiresPermission: Permissions.PUBLISH_TENDER
    });
    return response.data;
  },

  listPublishedTenders: async (filters?: {
    type?: TenderType;
    page?: number;
    limit?: number;
  }): Promise<TendersResponse> => {
    const response = await api.get<TendersResponse>('/bidding/tenders/published', {
      requiresPermission: Permissions.VIEW_TENDER,
      params: filters
    });
    return response.data;
  },

  addCommitteeMember: async (tenderId: string, userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/bidding/tenders/${tenderId}/committee`, { userId }, {
      requiresPermission: Permissions.MANAGE_TENDERS
    });
    return response.data;
  },

  getEligibleCommitteeMembers: async (tenderId: string): Promise<{ success: boolean; data: Array<{ _id: string; fullName: string; email: string }> }> => {
    const response = await api.get(`/bidding/tenders/${tenderId}/committee/eligible`, {
      requiresPermission: Permissions.MANAGE_TENDERS
    });
    return response.data;
  },

  removeCommitteeMember: async (tenderId: string, memberId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/bidding/tenders/${tenderId}/committee/${memberId}`, {
      requiresPermission: Permissions.MANAGE_TENDERS
    });
    return response.data;
  },

  // --- Bid Evaluation Routes ---

  openBidsForTender: async (tenderId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/bidding/tenders/${tenderId}/open-bids`, {}, {
      requiresPermission: Permissions.EVALUATE_BID
    });
    return response.data;
  },

  submitTechnicalScore: async (bidId: string, data: SubmitTechnicalScoreDTO): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/bidding/bids/${bidId}/technical-score`, data, {
      requiresPermission: Permissions.EVALUATE_BID
    });
    return response.data;
  },

  awardTender: async (bidId: string, tenderId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/bidding/bids/${bidId}/award`, { tenderId }, {
      requiresPermission: Permissions.AWARD_BID
    });
    return response.data;
  },

  // --- Bidder Routes ---

  registerBidder: async (data: RegisterBidderDTO): Promise<BidderResponse> => {
    const formData = new FormData();
    
    // Add regular fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'profileDocuments' || key === 'qualifications') {
        // Skip documents and qualifications, we'll handle them separately
        return;
      } else if (key === 'address' || key === 'experience') {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Add qualifications with their files
    if (data.qualifications) {
      const qualificationsData: any[] = [];
      data.qualifications.forEach((qual: any, index: number) => {
        // Extract file from qualification
        const { file, ...qualData } = qual;
        qualificationsData.push(qualData);
        
        // Add file if present
        if (file) {
          formData.append(`qualifications[${index}][file]`, file);
        }
      });
      formData.append('qualifications', JSON.stringify(qualificationsData));
    }
    
    // Add profile documents with metadata
    if (data.profileDocuments) {
      const profileDocumentsData: any[] = [];
      data.profileDocuments.forEach((doc: any, index: number) => {
        // Extract file from document
        const { file, ...docData } = doc;
        profileDocumentsData.push(docData);
        
        // Add file
        if (file) {
          formData.append(`profileDocuments[${index}][file]`, file);
        }
      });
      formData.append('profileDocuments', JSON.stringify(profileDocumentsData));
    }
    
    const response = await api.post<BidderResponse>('/bidding/bidders/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getBidderProfile: async (): Promise<BidderResponse> => {
    const response = await api.get<BidderResponse>('/bidding/bidders/profile');
    return response.data;
  },

  updateBidderProfile: async (data: any): Promise<BidderResponse> => {
    const formData = new FormData();
    
    // Add regular fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'profileDocuments' || key === 'experience' || key === 'qualifications' || key === 'address') {
        return; // Handle separately
      }
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Add address
    if (data.address) {
      Object.entries(data.address).forEach(([key, value]) => {
        formData.append(`address[${key}]`, String(value));
      });
    }

    // Add experience arrays
    if (data.experience) {
      formData.append('experience', JSON.stringify(data.experience));
    }
    
    // Add qualifications and their files
    if (data.qualifications) {
      const qualificationsData: any[] = [];
      data.qualifications.forEach((qual: any, index: number) => {
        const { file, ...qualData } = qual;
        qualificationsData.push(qualData);
        if (file) {
          formData.append(`qualifications[${index}][file]`, file);
        }
      });
      formData.append('qualifications', JSON.stringify(qualificationsData));
    }
    
    // Add profile documents
    if (data.profileDocuments) {
      const profileDocumentsData: any[] = [];
      data.profileDocuments.forEach((doc: any, index: number) => {
        const { file, ...docData } = doc;
        profileDocumentsData.push(docData);
        if (file && file instanceof File) {
          formData.append(`profileDocuments[${index}][file]`, file);
        }
      });
      formData.append('profileDocuments', JSON.stringify(profileDocumentsData));
    }

    const response = await api.put<BidderResponse>('/bidding/bidders/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // --- Bid Routes ---

  submitBid: async (data: SubmitBidDTO): Promise<BidResponse> => {
    const formData = new FormData();
    
    // Add base fields
    formData.append('tenderId', data.tenderId);
    formData.append('bidderId', data.bidderId);
    
    // Add technical proposal (without documents)
    const techProposal = { ...data.technicalProposal };
    delete (techProposal as any).documents;
    formData.append('technicalProposal', JSON.stringify(techProposal));
    
    // Add financial proposal (without documents and cash flow - these are handled separately)
    const finProposal = { ...data.financialProposal };
    delete (finProposal as any).documents;
    delete (finProposal as any).documentMetadata;
    delete (finProposal as any).cashFlowProjection;
    console.log("financialProposal", JSON.stringify(finProposal))
    
    formData.append('financialProposal', JSON.stringify(finProposal));
    
    // Add technical documents
    if (data.technicalProposal.documents) {
      data.technicalProposal.documents.forEach((file) => {
        formData.append('technicalDocuments', file);
      });
    }
    
    // Add financial documents with indexed field names and metadata
    if (data.financialProposal.documents && data.financialProposal.documentMetadata) {
      data.financialProposal.documents.forEach((file, index) => {
        formData.append(`financialProposal[documents][${index}][file]`, file);
        
        // Add corresponding metadata
        const metadata = data.financialProposal.documentMetadata[index];
        if (metadata) {
          formData.append(`financialProposal[documents][${index}][documentType]`, metadata.documentType);
          formData.append(`financialProposal[documents][${index}][description]`, metadata.description || '');
        }
      });
    }
    
    // Add cash flow projection
    if (data.financialProposal.cashFlowProjection) {
      formData.append('cashFlowProjection', data.financialProposal.cashFlowProjection);
    }
    
    // Add other documents
    if (data.otherDocuments) {
      data.otherDocuments.forEach((file) => {
        formData.append('otherDocuments', file);
      });
    }
    
    
    const response = await api.post<BidResponse>('/bidding/bids', formData, {
      requiresPermission: Permissions.SUBMIT_BID,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getBidsForTender: async (tenderId: string): Promise<BidsResponse> => {
    const response = await api.get<BidsResponse>(`/bidding/tenders/${tenderId}/bids`, {
      requiresPermission: Permissions.VIEW_BID
    });
    return response.data;
  },

  getBid: async (bidId: string): Promise<BidResponse> => {
    const response = await api.get<BidResponse>(`/bidding/bids/${bidId}`, {
      requiresPermission: Permissions.VIEW_BID
    });
    return response.data;
  },

  // --- Clarification Routes ---

  askClarification: async (data: AskClarificationDTO): Promise<{ success: boolean; message: string; data: Clarification }> => {
    const response = await api.post('/bidding/clarifications', data, {
      requiresPermission: Permissions.ASK_CLARIFICATION
    });
    return response.data;
  },

  answerClarification: async (clarificationId: string, data: AnswerClarificationDTO): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/bidding/clarifications/${clarificationId}/answer`, data, {
      requiresPermission: Permissions.ANSWER_CLARIFICATION
    });
    return response.data;
  },

  getTenderClarifications: async (tenderId: string): Promise<ClarificationsResponse> => {
    const response = await api.get<ClarificationsResponse>(`/bidding/tenders/${tenderId}/clarifications`, {
      requiresPermission: Permissions.VIEW_CLARIFICATION
    });
    return response.data;
  },

  // --- Helper Functions ---

  // Get tender statistics for dashboard
  getTenderStats: async (): Promise<{
    totalTenders: number;
    activeTenders: number;
    draftTenders: number;
    awardedTenders: number;
    myBids: number;
    wonBids: number;
  }> => {
    try {
      const response = await api.get('/bidding/stats', {
        requiresPermission: Permissions.VIEW_TENDER
      });
      return response.data.data;
    } catch (error) {
      console.warn('Tender stats endpoint not implemented yet:', error);
      // Return mock data until backend implements this
      return {
        totalTenders: 0,
        activeTenders: 0,
        draftTenders: 0,
        awardedTenders: 0,
        myBids: 0,
        wonBids: 0
      };
    }
  }
};