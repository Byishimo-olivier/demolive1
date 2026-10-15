import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, isAfter, isBefore } from 'date-fns';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Users,
  Edit,
  Send,
  MessageCircleQuestion,
  Award,
  Eye,
  Download,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserCheck,
  UserPlus,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Can } from '../components/PermissionGate';
import { Permissions } from '../constants/permissions';
import { biddingApi } from '../lib/bidding-api';
import { displayUser } from '../utils/display';
import type { Tender, Bid, Clarification } from '../types/bidding';
import { ClarificationStatus, TenderStatus, BidOpeningStatus } from '../types/bidding';
import {
  getBiddingEligibility 
} from '../utils/bidding-conflicts';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

const TENDER_STATUS_COLORS = {
  Draft: 'bg-gray-100 text-gray-800',
  Published: 'bg-blue-100 text-blue-800', 
  Closed: 'bg-orange-100 text-orange-800',
  Awarded: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800'
} as const;

export function TenderDetails() {
  const { formatAmount } = useCurrency();
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  const { user, organizationProfiles, activeProfile } = useAuth();
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [bidderProfile, setBidderProfile] = useState<any>(null);
  const [bidderProfileLoading, setBidderProfileLoading] = useState(true);
  const [askQuestionOpen, setAskQuestionOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  
  const [answerClarificationOpen, setAnswerClarificationOpen] = useState(false);
  const [answeringClarificationId, setAnsweringClarificationId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isAnswerPublic, setIsAnswerPublic] = useState(true);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [eligibleMembers, setEligibleMembers] = useState<Array<any>>([]);
  const [eligibleMembersLoading, setEligibleMembersLoading] = useState(false);

  useEffect(() => {
    if (tenderId) {
      loadTenderDetails();
    }
  }, [tenderId]);

  useEffect(() => {
    loadBidderProfile();
  }, []);

  const loadBidderProfile = async () => {
    try {
      setBidderProfileLoading(true);
      const response = await biddingApi.getBidderProfile();
      setBidderProfile(response.data);
    } catch (error) {
      setBidderProfile(null);
    } finally {
      setBidderProfileLoading(false);
    }
  };

  useEffect(() => {
    if (tender) {
      loadBids(); // Always load bids to check if user has submitted one
      if (activeTab === 'clarifications') {
        loadClarifications();
      }
    }
  }, [tender]);

  useEffect(() => {
    if (tender && activeTab === 'clarifications') {
      loadClarifications();
    }
  }, [activeTab, tender]);

  const loadTenderDetails = async () => {
    if (!tenderId) return;
    
    try {
      setLoading(true);
      const response = await biddingApi.getTenderById(tenderId);
      setTender(response.data);
    } catch (error) {
      console.error('Error loading tender details:', error);
      toast.error(getErrorMessage(error, 'Failed to load tender details'));
    } finally {
      setLoading(false);
    }
  };

  const loadBids = async () => {
    if (!tenderId) return;
    
    try {
      setBidsLoading(true);
      const response = await biddingApi.getBidsForTender(tenderId);
      setBids(response.data);
    } catch (error) {
      console.error('Error loading bids:', error);
      // Don't show error toast - user might not have permission
    } finally {
      setBidsLoading(false);
    }
  };

  const loadClarifications = async () => {
    if (!tenderId) return;
    
    try {
      const response = await biddingApi.getTenderClarifications(tenderId);
      setClarifications(response.data);
    } catch (error) {
      console.error('Error loading clarifications:', error);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!questionText.trim() || !tenderId) return;

    try {
      setSubmittingQuestion(true);
      await biddingApi.askClarification({
        tenderId: tenderId,
        question: questionText.trim(),
        bidderId: bidderProfile?._id || ''
      });
      
      toast.success('Question submitted successfully');
      setQuestionText('');
      setAskQuestionOpen(false);
      
      // Reload clarifications to show the new question
      loadClarifications();
    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error(getErrorMessage(error, 'Failed to submit question'));
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleAnswerClarification = async () => {
    if (!answeringClarificationId || !answerText.trim() || !tenderId) return;

    try {
      setSubmittingAnswer(true);
      await biddingApi.answerClarification(answeringClarificationId, {
        tenderId,
        response: answerText.trim(),
        isPublic: isAnswerPublic
      });
      
      toast.success('Answer submitted successfully');
      setAnswerText('');
      setAnswerClarificationOpen(false);
      setAnsweringClarificationId(null);
      
      loadClarifications();
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error(getErrorMessage(error, 'Failed to submit answer'));
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberUserId?.trim() || !tender) return;

    try {
      setAddingMember(true);
      await biddingApi.addCommitteeMember(tender._id, newMemberUserId.trim());
      toast.success('Committee member added successfully');
      setNewMemberUserId('');
      setAddMemberOpen(false);
      
      // Reload tender details to show the new member
      loadTenderDetails();
    } catch (error) {
      console.error('Error adding committee member:', error);
      toast.error(getErrorMessage(error, 'Failed to add committee member'));
    } finally {
      setAddingMember(false);
    }
  };

  const loadEligibleMembers = async () => {
    if (!tender) return;
    try {
      setEligibleMembersLoading(true);
      const response = await biddingApi.getEligibleCommitteeMembers(tender._id);
      const rawMembers = response.data?.data || response.data || [];
      // Normalize: ensure each member has _id
      const members = rawMembers.map((m: any) => ({
        ...m,
        _id: m._id || m.userId,
      }));
      console.log('Eligible members:', members);
      setEligibleMembers(members);
    } catch (error) {
      console.error('Error loading eligible members:', error);
      toast.error(getErrorMessage(error, 'Failed to load eligible members'));
      setEligibleMembers([]);
    } finally {
      setEligibleMembersLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!tender) return;

    try {
      await biddingApi.removeCommitteeMember(tender._id, memberId);
      toast.success('Committee member removed successfully');
      
      // Reload tender details to show the updated committee
      loadTenderDetails();
      // // Reload eligible members to update the list
      loadEligibleMembers();
    } catch (error) {
      console.error('Error removing committee member:', error);
      toast.error(getErrorMessage(error, 'Failed to remove committee member'));
    }
  };

  const handlePublishTender = async () => {
    if (!tender) return;
    
    try {
      await biddingApi.publishTender(tender._id);
      toast.success('Tender published successfully');
      loadTenderDetails(); // Reload to get updated status
      loadEligibleMembers(); // Reload eligible members to update the list
    } catch (error) {
      console.error('Error publishing tender:', error);
      toast.error(getErrorMessage(error, 'Failed to publish tender'));
    }
  };

  const handleOpenBids = async () => {
    if (!tender) return;
    
    try {
      await biddingApi.openBidsForTender(tender._id);
      toast.success('Bids opened successfully');
      loadTenderDetails(); // Reload to get updated status
      loadEligibleMembers(); // Reload eligible members to update the list
    } catch (error) {
      console.error('Error opening bids:', error);
      toast.error(getErrorMessage(error, 'Failed to open bids'));
    }
  };

  const getTimeStatus = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    
    if (isBefore(deadlineDate, now)) {
      return { text: 'Expired', color: 'text-red-600', icon: AlertCircle };
    }
    
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      return { text: 'Due today', color: 'text-red-600', icon: AlertCircle };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} days left`, color: 'text-orange-600', icon: Clock };
    } else {
      return { text: `${diffDays} days left`, color: 'text-green-600', icon: CheckCircle };
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-muted-foreground">Loading tender details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h3 className="text-lg font-semibold">Tender not found</h3>
          <Button onClick={() => navigate('/bidding/tenders')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
        </div>
      </div>
    );
  }

  const clarificationStatus = getTimeStatus(tender.clarificationDeadline);
  const submissionStatus = getTimeStatus(tender.submissionDeadline);
  
  const biddingEligibility = getBiddingEligibility(tender, user, organizationProfiles || [], activeProfile, bidderProfile, bidderProfileLoading);
  // Check if user can view bids (tender creator, evaluation committee member, or bidder)
  const userBid = bids.find(bid => {
    const bidderId = typeof bid.bidderId === 'object' ? bid.bidderId._id : bid.bidderId;
    return bidderProfile && bidderId === bidderProfile._id;
  });
  const canSubmitBids = biddingEligibility.canBid && !userBid;
  console.log("Bidding Eligibility", biddingEligibility);
  console.log("Bidder Profile", bidderProfile);
  console.log("Can Submit Bids", canSubmitBids);
  
  
  const canViewBids = user && (
    tender.createdBy === user._id || 
    tender.evaluationCommittee?.some(member => 
      (typeof member === 'string' ? member : member._id) === user._id
    ) ||
    userBid // User has submitted a bid for this tender
  );
  console.log("Can View Bids", canViewBids);

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/bidding/tenders')}
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{tender.title}</h1>
              <Badge className={TENDER_STATUS_COLORS[tender.status]} variant="secondary">
                {tender.status}
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground">{tender.tenderNumber}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{tender.type}</span>
              </div>
              {tender.estimatedBudget && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatAmount(tender.estimatedBudget)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <submissionStatus.icon className={`h-4 w-4 ${submissionStatus.color}`} />
                <span className={submissionStatus.color}>
                  Submission: {submissionStatus.text}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          
          <Can permission={Permissions.UPDATE_TENDER}>
            {tender.status === TenderStatus.DRAFT && (
              <Button
                variant="outline"
                onClick={() => navigate(`/bidding/tenders/${tender._id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </Can>
          
          <Can permission={Permissions.PUBLISH_TENDER}>
            {tender.status === TenderStatus.DRAFT && isAfter(new Date(tender.submissionDeadline), new Date()) && (
              <Button onClick={handlePublishTender}>
                <Send className="h-4 w-4 mr-2" />
                Publish Tender
              </Button>
            )}
          </Can>
          
          <Can permission={Permissions.EVALUATE_BID}>
            {tender.status === TenderStatus.CLOSED && tender.bidOpeningStatus === BidOpeningStatus.PENDING && (
              <Button onClick={handleOpenBids}>
                <Eye className="h-4 w-4 mr-2" />
                Open Bids
              </Button>
            )}
          </Can>
          
          {canSubmitBids ? (
            <Can permission={Permissions.SUBMIT_BID}>
              <Button onClick={() => navigate(`/bidding/tenders/${tender._id}/submit-bid`)}>
                <Send className="h-4 w-4 mr-2" />
                Submit Bid
              </Button>
            </Can>
          ) : biddingEligibility.needsBidderRegistration ? (
            <Can permission={Permissions.SUBMIT_BID}>
              <Button onClick={() => navigate('/bidding/register-bidder')}>
                <UserCheck className="h-4 w-4 mr-2" />
                Register to Bid
              </Button>
            </Can>
          ) : !biddingEligibility.canBid && user && (null)}
        </div>
      </div>


      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="clarifications">
            <MessageCircleQuestion className="h-4 w-4 mr-2" />
            Clarifications ({clarifications.length})
          </TabsTrigger>
          <TabsTrigger value="bids">
            <Award className="h-4 w-4 mr-2" />
            Bids ({bids.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Overview */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{tender.description}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline">{tender.type}</Badge>
                </div>
                
                {tender.estimatedBudget && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Estimated Budget</p>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">{formatAmount(tender.estimatedBudget)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tender.publicationDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Published</span>
                    <span className="text-sm font-medium">
                      {format(new Date(tender.publicationDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Clarification Deadline</span>
                  <div className="flex items-center gap-2">
                    <clarificationStatus.icon className={`h-4 w-4 ${clarificationStatus.color}`} />
                    <span className={`text-sm font-medium ${clarificationStatus.color}`}>
                      {format(new Date(tender.clarificationDeadline), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Submission Deadline</span>
                  <div className="flex items-center gap-2">
                    <submissionStatus.icon className={`h-4 w-4 ${submissionStatus.color}`} />
                    <span className={`text-sm font-medium ${submissionStatus.color}`}>
                      {format(new Date(tender.submissionDeadline), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Bid Opening</span>
                  <span className="text-sm font-medium">
                    {format(new Date(tender.bidOpeningDate), 'MMM d, yyyy')}
                  </span>
                </div>
                
                {tender.preBidMeetingDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pre-bid Meeting</span>
                    <span className="text-sm font-medium">
                      {format(new Date(tender.preBidMeetingDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Documents */}
          {tender.documents && tender.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Tender Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tender.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.description}</p>
                        <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tender Manager</p>
                <p className="text-sm">{displayUser(tender.tenderManager)}</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Evaluation Committee</p>
                  <Can permission={Permissions.MANAGE_TENDERS}>
                    <Dialog 
                      open={addMemberOpen} 
                      onOpenChange={(open) => {
                        setAddMemberOpen(open);
                        if (open) {
                          loadEligibleMembers();
                          setNewMemberUserId('');
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Committee Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Select Member *
                            </label>
                            {eligibleMembersLoading ? (
                              <div className="flex items-center gap-2 py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Loading eligible members...</span>
                              </div>
                            ) : eligibleMembers.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">
                                No eligible members found. All organization members may already be on the committee.
                              </p>
                            ) : (
                              <Select
                                value={newMemberUserId}
                                onValueChange={setNewMemberUserId}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {eligibleMembers.map((member) => (
                                    <SelectItem key={member._id} value={member._id}>
                                      {member.fullName} ({member.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Select a member from your organization to add to the evaluation committee.
                            </p>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setAddMemberOpen(false)}
                              disabled={addingMember}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleAddMember}
                              disabled={!newMemberUserId?.trim() || addingMember}
                            >
                              {!addingMember && <UserPlus className="h-4 w-4 mr-2" />}
                              {addingMember ? "Adding..." : "Add Member"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </Can>
                </div>
                {tender.evaluationCommittee && tender.evaluationCommittee.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tender.evaluationCommittee.map((member, index) => {
                      const memberId = typeof member === 'string' ? member : member._id;
                      return (
                        <div key={index} className="flex items-center gap-1">
                          <Badge variant="outline">
                            {displayUser(member)}
                          </Badge>
                          <Can permission={Permissions.MANAGE_TENDERS}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                              onClick={() => handleRemoveMember(memberId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Can>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No committee members added yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Requirements Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Basic Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Minimum Experience</p>
                      <p className="text-sm text-muted-foreground">Required years in industry</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{tender.eligibilityCriteria.minimumExperience}</p>
                    <p className="text-sm text-muted-foreground">years</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Minimum Turnover</p>
                      <p className="text-sm text-muted-foreground">Annual revenue requirement</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{formatAmount(tender.eligibilityCriteria.minimumTurnover / 1000000)}M</p>
                    <p className="text-sm text-muted-foreground">{formatAmount(tender.eligibilityCriteria.minimumTurnover)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Qualifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  Required Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {tender.eligibilityCriteria.requiredLicenses && tender.eligibilityCriteria.requiredLicenses.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-orange-600" />
                      <p className="font-medium">Required Licenses</p>
                    </div>
                    <div className="grid gap-2">
                      {tender.eligibilityCriteria.requiredLicenses.map((license, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded-md">
                          <CheckCircle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm">{license}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No specific licenses required</p>
                  </div>
                )}

                {tender.eligibilityCriteria.requiredCertifications && tender.eligibilityCriteria.requiredCertifications.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="h-4 w-4 text-purple-600" />
                      <p className="font-medium">Required Certifications</p>
                    </div>
                    <div className="grid gap-2">
                      {tender.eligibilityCriteria.requiredCertifications.map((cert, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 rounded-md">
                          <CheckCircle className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No specific certifications required</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Geographical Restrictions */}
          {tender.eligibilityCriteria.geographicalRestrictions && tender.eligibilityCriteria.geographicalRestrictions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-red-600" />
                  Geographical Restrictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tender.eligibilityCriteria.geographicalRestrictions.map((restriction, index) => (
                    <Badge key={index} variant="destructive" className="px-3 py-1">
                      {restriction}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Only contractors from these regions are eligible to bid
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="clarifications" className="space-y-6">
          {/* Header with deadline info */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MessageCircleQuestion className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Clarifications & Questions</p>
                    <p className="text-sm text-muted-foreground">
                      Deadline: {format(new Date(tender.clarificationDeadline), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <Can permission={Permissions.ASK_CLARIFICATION}>
                  {tender.status === TenderStatus.PUBLISHED && (
                    isAfter(new Date(tender.clarificationDeadline), new Date()) || userBid
                  ) ? (
                    <Dialog open={askQuestionOpen} onOpenChange={setAskQuestionOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <MessageCircleQuestion className="h-4 w-4 mr-2" />
                          Ask Question
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Ask Clarification Question</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Your Question *
                            </label>
                            <Textarea
                              placeholder="Type your question about this tender..."
                              value={questionText}
                              onChange={(e) => setQuestionText(e.target.value)}
                              className="min-h-[100px]"
                              disabled={submittingQuestion}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Your question will be reviewed and answered by the tender committee.
                            </p>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setAskQuestionOpen(false)}
                              disabled={submittingQuestion}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleSubmitQuestion}
                              disabled={!questionText.trim() || submittingQuestion}
                            >
                              {!submittingQuestion && <Send className="h-4 w-4 mr-2" />}
                              {submittingQuestion ? "Submitting..." : "Submit Question"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {isBefore(new Date(tender.clarificationDeadline), new Date()) 
                        ? userBid 
                          ? 'You can still ask questions as a bidder'
                          : 'Deadline passed'
                        : 'Questions allowed'
                      }
                    </Badge>
                  )}
                </Can>
              </div>
            </CardContent>
          </Card>
          
          {clarifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <MessageCircleQuestion className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">No clarifications yet</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {isAfter(new Date(tender.clarificationDeadline), new Date()) || userBid
                    ? "Be the first to ask a question about this tender"
                    : userBid 
                      ? "As a bidder, you can still ask clarifying questions"
                      : "The clarification period has ended"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {clarifications.map((clarification, index) => (
                <Card key={clarification._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Question */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                              Q
                            </div>
                            <p className="text-sm font-medium text-blue-600">Question #{index + 1}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={clarification.status === ClarificationStatus.RESPONDED ? "default" : "secondary"}
                              className={`text-xs ${
                                clarification.status === ClarificationStatus.RESPONDED 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {clarification.status === ClarificationStatus.RESPONDED ? 'Answered' : 'Pending'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(clarification.createdAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        <div className="pl-8">
                          <p className="text-sm leading-relaxed">{clarification.question}</p>
                          
                          {!clarification.answer && (
                            <Can permission={Permissions.ANSWER_CLARIFICATION}>
                              <div className="mt-4">
                                <Dialog 
                                  open={answerClarificationOpen && answeringClarificationId === clarification._id} 
                                  onOpenChange={(open) => {
                                    setAnswerClarificationOpen(open);
                                    if (open) {
                                      setAnsweringClarificationId(clarification._id!);
                                      setAnswerText('');
                                    } else {
                                      setAnsweringClarificationId(null);
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <MessageCircleQuestion className="h-4 w-4 mr-2" />
                                      Answer Question
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Answer Clarification</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="p-3 bg-muted rounded-md text-sm">
                                        <span className="font-medium">Question:</span> {clarification.question}
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium mb-2 block">
                                          Your Answer *
                                        </label>
                                        <Textarea
                                          placeholder="Type the official answer..."
                                          value={answerText}
                                          onChange={(e) => setAnswerText(e.target.value)}
                                          className="min-h-[100px]"
                                          disabled={submittingAnswer}
                                        />
                                      </div>
                                      <div className="flex items-center space-x-2 pt-2">
                                        <input 
                                          type="checkbox" 
                                          id="isPublic"
                                          checked={isAnswerPublic}
                                          onChange={(e) => setIsAnswerPublic(e.target.checked)}
                                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="isPublic" className="text-sm cursor-pointer">
                                          Make answer visible to all bidders
                                        </label>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          variant="outline" 
                                          onClick={() => setAnswerClarificationOpen(false)}
                                          disabled={submittingAnswer}
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          onClick={handleAnswerClarification}
                                          disabled={!answerText.trim() || submittingAnswer}
                                        >
                                          {!submittingAnswer && <Send className="h-4 w-4 mr-2" />}
                                          {submittingAnswer ? "Submitting..." : "Submit Answer"}
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </Can>
                          )}
                        </div>
                      </div>
                      
                      {/* Answer */}
                      {clarification.answer && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-600">
                                A
                              </div>
                              <p className="text-sm font-medium text-green-600">Official Answer</p>
                              {clarification.answeredAt && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {format(new Date(clarification.answeredAt), 'MMM d, yyyy HH:mm')}
                                </span>
                              )}
                            </div>
                            <div className="pl-8">
                              <p className="text-sm leading-relaxed">{clarification.answer}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bids" className="space-y-6">
          {canViewBids ? (
            bidsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : bids.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Award className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No bids submitted yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bidder Name</TableHead>
                        <TableHead>Total Bid Price</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bids.map((bid) => {
                        const bidderName = typeof bid.bidderId === 'object' 
                          ? bid.bidderId.companyName 
                          : 'Unknown Bidder';
                        const bidderId = typeof bid.bidderId === 'object'
                          ? bid.bidderId._id
                          : bid.bidderId;
                        
                        // Check if this is the current user's bid
                        const isUserBid = bidderProfile && (bidderId === bidderProfile._id);
                        
                        // Check if current user is in evaluation committee
                        const canViewAllBids = tender && user && (
                          tender.createdBy === user._id ||
                          tender.evaluationCommittee.includes(user._id as never)
                        );
                        
                        // Check if tender opening date has passed and bids have been officially opened
                        const isTenderOpened = tender && 
                          tender.bidOpeningStatus === BidOpeningStatus.COMPLETED;
                        
                        // Show total bid price only after tender opening
                        const showPrice = isTenderOpened;
                        
                        // Show actions if user can view this specific bid and tender is opened
                        const showActions = (isUserBid || canViewAllBids) && isTenderOpened;
                        
                        return (
                          <TableRow 
                            key={bid._id} 
                            className={isUserBid ? 'bg-blue-50 dark:bg-blue-950' : ''}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{bidderName}</span>
                                {isUserBid && (
                                  <Badge variant="secondary" className="text-xs">
                                    Your Bid
                                  </Badge>
                                )}
                                {bid.isAwarded && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    <Award className="h-3 w-3 mr-1" />
                                    Winner
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {showPrice ? (
                                <span className="font-semibold text-green-600">
                                  {formatAmount(bid.financialProposal.totalBidPrice)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  N/A
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(bid.submissionDate), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {bid.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {/* {showActions ? ( */}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/bidding/bids/${bid._id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                              {/* ) : ( */}
                                {/* <span></span>
                              )} */}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Only tender creators and evaluation committee members can view bids
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
