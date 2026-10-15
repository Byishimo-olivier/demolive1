import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  FileText,
  DollarSign,
  Award,
  Calendar,
  Building2,
  Star,
  CheckCircle,
  Clock,
  Download,
  Edit3,
  AlertTriangle,
  Loader2,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getFileUrl } from '../lib/utils';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Can } from '../components/PermissionGate';
import { Permissions } from '../constants/permissions';
import { biddingApi } from '../lib/bidding-api';
import type { Bid, SubmitTechnicalScoreDTO } from '../types/bidding';
import { BidStatus, BidEvaluationStatus } from '../types/bidding';
import { useCurrency } from '../contexts/CurrencyContext';


const BID_STATUS_COLORS = {
  Draft: 'bg-gray-100 text-gray-800',
  Submitted: 'bg-blue-100 text-blue-800',
  'Under Evaluation': 'bg-yellow-100 text-yellow-800',
  Evaluated: 'bg-purple-100 text-purple-800',
  Awarded: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Withdrawn: 'bg-orange-100 text-orange-800'
} as const;

export function BidDetails() {
  const { formatAmount } = useCurrency();
  const { bidId } = useParams<{ bidId: string }>();
  const navigate = useNavigate();
  
  const [bid, setBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [awarding, setAwarding] = useState(false);
  
  // Evaluation form state
  const [technicalScore, setTechnicalScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (bidId) {
      loadBidDetails();
    }
  }, [bidId]);

  const loadBidDetails = async () => {
    if (!bidId) return;
    
    try {
      setLoading(true);
      const response = await biddingApi.getBid(bidId);
      setBid(response.data);
    } catch (error) {
      console.error('Error loading bid details:', error);
      toast.error('Failed to load bid details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTechnicalScore = async () => {
    if (!bid || !technicalScore || !maxScore) return;

    try {
      setSubmittingScore(true);
      const scoreData: SubmitTechnicalScoreDTO = {
        score: parseFloat(technicalScore),
        maxScore: parseFloat(maxScore),
        comments: comments.trim()
      };
      
      await biddingApi.submitTechnicalScore(bid._id, scoreData);
      toast.success('Technical score submitted successfully');
      setEvaluationDialogOpen(false);
      setTechnicalScore('');
      setComments('');
      
      // Reload bid details to show updated evaluation
      loadBidDetails();
    } catch (error) {
      console.error('Error submitting technical score:', error);
      toast.error('Failed to submit technical score');
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleAwardTender = async () => {
    if (!bid) return;

    try {
      setAwarding(true);
      await biddingApi.awardTender(bid._id);
      toast.success('Tender awarded successfully');
      setAwardDialogOpen(false);
      
      // Reload bid details to show awarded status
      loadBidDetails();
    } catch (error) {
      console.error('Error awarding tender:', error);
      toast.error('Failed to award tender');
    } finally {
      setAwarding(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-muted-foreground">Loading bid details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h3 className="text-lg font-semibold">Bid not found</h3>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const bidderName = typeof bid.bidderId === 'object' 
    ? bid.bidderId.companyName 
    : 'Unknown Bidder';

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{bid.bidNumber}</h1>
              <Badge className={BID_STATUS_COLORS[bid.status as keyof typeof BID_STATUS_COLORS]}>
                {bid.status}
              </Badge>
              {bid.isAwarded && (
                <Badge className="bg-green-100 text-green-800">
                  <Award className="h-3 w-3 mr-1" />
                  Winner
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{bidderName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Submitted {format(new Date(bid.submissionDate), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Can permission={Permissions.EVALUATE_BID}>
            {bid.status === BidStatus.UNDER_EVALUATION && 
             bid.evaluation.status === BidEvaluationStatus.TECHNICAL_REVIEW && (
              <Dialog open={evaluationDialogOpen} onOpenChange={setEvaluationDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Evaluate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Technical Evaluation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Technical Score *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max={maxScore}
                          value={technicalScore}
                          onChange={(e) => setTechnicalScore(e.target.value)}
                          placeholder="Enter score"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Maximum Score *
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={maxScore}
                          onChange={(e) => setMaxScore(e.target.value)}
                          placeholder="100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Comments
                      </label>
                      <Textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Add evaluation comments..."
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEvaluationDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmitTechnicalScore}
                        disabled={!technicalScore || !maxScore || submittingScore}
                      >
                        {submittingScore ? 'Submitting...' : 'Submit Score'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </Can>

          <Can permission={Permissions.AWARD_BID}>
            {bid.status === BidStatus.UNDER_EVALUATION && !bid.isAwarded && (
              <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Award className="h-4 w-4 mr-2" />
                    Award Tender
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Award Tender</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p>Are you sure you want to award this tender to <strong>{bidderName}</strong>?</p>
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          This action cannot be undone. All other bids will be marked as rejected.
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAwardDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAwardTender}
                        disabled={awarding}
                      >
                        {awarding ? 'Awarding...' : 'Confirm Award'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </Can>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financial Summary */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <DollarSign className="h-5 w-5 text-green-600" />
      Financial Summary
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {bid.isSealed && (!bid.sealedUntil || new Date(bid.sealedUntil) > new Date()) ? (
      <div className="text-center py-6">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
        <p className="text-sm text-muted-foreground">Financial details are sealed until bid opening</p>
        {bid.sealedUntil && (
          <p className="text-xs text-muted-foreground mt-1">
            Opens on: {format(new Date(bid.sealedUntil), 'MMM d, yyyy HH:mm')}
          </p>
        )}
      </div>
    ) : (
      <>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-muted-foreground">Total Bid Price</p>
          <p className="text-3xl font-bold text-green-600">
            {formatAmount(bid.financialProposal?.totalBidPrice || 0)}
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Materials</span>
            <span className="font-medium">{formatAmount(bid.financialProposal?.priceBreakdown?.materials || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Labor</span>
            <span className="font-medium">{formatAmount(bid.financialProposal?.priceBreakdown?.labor || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Equipment</span>
            <span className="font-medium">{formatAmount(bid.financialProposal?.priceBreakdown?.equipment || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Overheads</span>
            <span className="font-medium">{formatAmount(bid.financialProposal?.priceBreakdown?.overheads || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Profit</span>
            <span className="font-medium">{formatAmount(bid.financialProposal?.priceBreakdown?.profit || 0)}</span>
          </div>
        </div>
      </>
    )}
  </CardContent>
</Card>

        {/* Evaluation Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              Evaluation Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Status</span>
                <Badge variant="outline">
                  {bid.evaluation?.status || 'Pending'}
                </Badge>
              </div>
            </div>
            
            {bid.evaluation?.technicalScore !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Technical Score</span>
                  <span className="font-bold text-lg">
                    {bid.evaluation.technicalScore} / {bid.evaluation.technicalMaxScore || 100}
                  </span>
                </div>
                {bid.evaluation.technicalComments && (
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {bid.evaluation.technicalComments}
                  </p>
                )}
              </div>
            )}
            
            {bid.evaluation?.evaluatedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Evaluated {format(new Date(bid.evaluation.evaluatedAt), 'MMM d, yyyy HH:mm')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Award Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Award Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bid.isAwarded ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Tender Awarded</span>
                </div>
                {bid.awardDate && (
                  <p className="text-sm text-muted-foreground">
                    Awarded on {format(new Date(bid.awardDate), 'MMM d, yyyy')}
                  </p>
                )}
                {bid.contractValue && (
                  <div>
                    <p className="text-sm text-muted-foreground">Contract Value</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatAmount(bid.contractValue)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Awaiting evaluation results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Technical Proposal */}
      {bid.technicalProposal && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Technical Proposal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {bid.technicalProposal.methodology && (
              <div>
                <h4 className="font-medium mb-2">Methodology</h4>
                <div 
                  className="prose prose-sm max-w-none text-muted-foreground bg-muted/50 p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: bid.technicalProposal.methodology }}
                />
              </div>
            )}
            
            {bid.technicalProposal.workPlan && (
              <div>
                <h4 className="font-medium mb-2">Work Plan</h4>
                <div 
                  className="prose prose-sm max-w-none text-muted-foreground bg-muted/50 p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: bid.technicalProposal.workPlan }}
                />
              </div>
            )}
            
            <div className="grid gap-6 md:grid-cols-2">
              {bid.technicalProposal.teamStructure && (
                <div>
                  <h4 className="font-medium mb-2">Team Structure</h4>
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground bg-muted/50 p-4 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: bid.technicalProposal.teamStructure }}
                  />
                </div>
              )}
              
              {bid.technicalProposal.equipmentList && (
                <div>
                  <h4 className="font-medium mb-2">Equipment List</h4>
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground bg-muted/50 p-4 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: bid.technicalProposal.equipmentList }}
                  />
                </div>
              )}
            </div>
            
            {bid.technicalProposal.projectSchedule && (
              <div>
                <h4 className="font-medium mb-2">Project Schedule</h4>
                <div 
                  className="prose prose-sm max-w-none text-muted-foreground bg-muted/50 p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: bid.technicalProposal.projectSchedule }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
{((bid.technicalProposal?.documents?.length || 0) > 0 ||
  (bid.financialProposal?.documents?.length || 0) > 0 ||
  (bid.otherDocuments?.length || 0) > 0) && (
  <Card className="mt-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-gray-600" />
        Documents
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-6 md:grid-cols-3">
        {(bid.technicalProposal?.documents || []).length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Technical Documents</h4>
            <div className="space-y-2">
              {(bid.technicalProposal?.documents || []).map((doc, index) => {
                const fileName = doc.filePath?.split('/').pop() || `Document ${index + 1}`;
                return (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.description || fileName}</p>
                      <p className="text-xs text-muted-foreground">{doc.documentType || 'Technical'}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(getFileUrl(doc.filePath), '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!(bid.isSealed && (!bid.sealedUntil || new Date(bid.sealedUntil) > new Date())) && (bid.financialProposal?.documents || []).length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Financial Documents</h4>
            <div className="space-y-2">
              {(bid.financialProposal?.documents || []).map((doc, index) => {
                const fileName = doc.filePath?.split('/').pop() || `Document ${index + 1}`;
                return (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.description || fileName}</p>
                      <p className="text-xs text-muted-foreground">{doc.documentType || 'Financial'}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(getFileUrl(doc.filePath), '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(bid.otherDocuments || []).length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Other Documents</h4>
            <div className="space-y-2">
              {(bid.otherDocuments || []).map((doc, index) => {
                const fileName = doc.filePath?.split('/').pop() || `Document ${index + 1}`;
                return (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.description || fileName}</p>
                      <p className="text-xs text-muted-foreground">{doc.documentType || 'Other'}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(getFileUrl(doc.filePath), '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)}

      {/* BoQ Items */}
      {bid.financialProposal?.boqItems && bid.financialProposal.boqItems.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Bill of Quantities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Rate</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bid.financialProposal.boqItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatAmount(item.unitRate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatAmount(item.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
