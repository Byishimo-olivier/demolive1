import { User } from './index';

export type ContractType = 'construction' | 'consulting' | 'maintenance' | 'supply';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'under_review';
export type GuaranteeType = 'performance' | 'advance_payment' | 'retention' | 'bid';

export interface Contract {
  id: string;
  contractId: string;
  projectId: string;
  type: ContractType;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  contractValue: number;
  contractorId: string;
  contractorName: string;
  contractorDetails: {
    address: string;
    contact: string;
    email: string;
    license: string;
  };
  documents: {
    name: string;
    url: string;
    type: string;
    uploadedAt: string;
  }[];
  status: ContractStatus;
  statusHistory: {
    status: ContractStatus;
    date: string;
    note: string;
  }[];
  terms: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Guarantee {
  id: string;
  guaranteeId: string;
  contractId: string;
  type: GuaranteeType;
  issuingBank: string;
  value: number;
  startDate: string;
  endDate: string;
  document: {
    name: string;
    url: string;
    uploadedAt: string;
  };
  status: 'active' | 'expired' | 'released';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}