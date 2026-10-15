import { Company, User } from '@/types';
import { Bidder, Tender } from '@/types/bidding';

/**
 * Check if a user has a conflict of interest with a tender
 * Conflict exists if:
 * 1. User created the tender individually and is bidding as individual
 * 2. User is bidding from the same company that created the tender
 * 
 * NOTE: Company admins CAN bid on other companies' tenders (competitive bidding)
 */
export function hasConflictOfInterest(
  tender: Tender, 
  user: User | null,
  organizationProfiles: Company[],
  activeProfile?: { type: 'personal' | 'organization'; id: string; name: string } | null
): { hasConflict: boolean; reason?: string } {
  if (!user || !tender || !activeProfile) {
    return { hasConflict: false };
  }

  // Primary rule: If you created the tender, you cannot bid on it regardless of context
  if ((typeof tender.createdBy === 'string' && tender.createdBy === user._id) || (typeof tender.createdBy === 'object' && tender.createdBy._id === user._id)) {
    return { 
      hasConflict: true, 
      reason: 'Cannot bid on your own tender' 
    };
  }

  // Secondary rule: Cannot bid from the same company that created the tender
  if (tender.companyId && activeProfile.type === 'organization') {
    if (activeProfile.id === tender.companyId) {
      const company = organizationProfiles.find(c => c._id === tender.companyId);
      return { 
        hasConflict: true, 
        reason: `Your company "${company?.name}" created this tender` 
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Check if user can bid on a specific tender
 */
export function canBidOnTender(
  tender: Tender,
  user: User | null, 
  organizationProfiles: Company[],
  activeProfile?: { type: 'personal' | 'organization'; id: string; name: string } | null
): { canBid: boolean; reason?: string } {
  if (!user) {
    return { canBid: false, reason: 'Please log in to bid' };
  }

  // Check conflict of interest
  const conflictCheck = hasConflictOfInterest(tender, user, organizationProfiles, activeProfile);
  if (conflictCheck.hasConflict) {
    return { canBid: false, reason: conflictCheck.reason };
  }

  // Check tender status
  if (tender.status !== 'Published') {
    return { canBid: false, reason: 'Tender is not open for bidding' };
  }

  // Check submission deadline
  if (new Date(tender.submissionDeadline) < new Date()) {
    return { canBid: false, reason: 'Submission deadline has passed' };
  }

  return { canBid: true };
}

/**
 * Get the tender owner display name
 */
export function getTenderOwner(tender: Tender): string {
  if (tender.companyId && tender.tenderManager?.name) {
    return `${tender.tenderManager.name} (${tender.companyId.name || 'Company'})`;
  } else if (tender.tenderManager?.name) {
    return `${tender.tenderManager.name} (Individual)`;
  }
  return 'Unknown';
}

/**
 * Check if user can create tenders (both individual and company modes allowed)
 */
export function canCreateTenders(user: User | null): boolean {
  return !!user; // Any authenticated user can create tenders
}

/**
 * Get tender creation context based on active profile
 */
export function getTenderCreationContext(
  activeProfile: { type: 'personal' | 'organization'; id: string; name: string } | null
): { mode: 'individual' | 'company'; displayName: string } {
  if (activeProfile?.type === 'organization') {
    return {
      mode: 'company',
      displayName: `${activeProfile.name} (Company)`
    };
  }
  return {
    mode: 'individual', 
    displayName: 'Individual'
  };
}

/**
 * Get bidding registration context
 */
export function getBiddingContext(
  activeProfile: { type: 'personal' | 'organization'; id: string; name: string } | null
): { mode: 'individual' | 'company'; displayName: string; companyId?: string } {
  if (activeProfile?.type === 'organization') {
    return {
      mode: 'company',
      displayName: `${activeProfile.name} (Company)`,
      companyId: activeProfile.id
    };
  }
  return {
    mode: 'individual', 
    displayName: 'Individual Bidder'
  };
}


 // Enhanced bidding eligibility check that includes bidder registration
 export const getBiddingEligibility = (tender: Tender, user: User | null, organizationProfiles: Company[], activeProfile: { type: 'personal' | 'organization'; id: string; name: string } | null, bidderProfile: Bidder | null, bidderProfileLoading: boolean): { canBid: boolean; reason?: string; needsBidderRegistration?: boolean } => {
  const basicEligibility = canBidOnTender(tender, user, organizationProfiles || [], activeProfile);
  
  // If basic checks fail, return that result
  if (!basicEligibility.canBid) {
    return basicEligibility;
  }
  
  // Check if user has bidder profile (required to submit bids)
  if (!bidderProfile && !bidderProfileLoading) {
    return { 
      canBid: false, 
      reason: 'Register as bidder to submit bids',
      needsBidderRegistration: true 
    };
  }
  
  return { canBid: true };
};