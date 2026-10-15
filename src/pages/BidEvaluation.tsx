import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  FileText, 
  DollarSign, 
  Star,
  Award,
  Eye,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Can } from '../components/PermissionGate';
import { Permissions } from '../constants/permissions';
import { biddingApi } from '../lib/bidding-api';
import type { Tender, Bid } from '../types/bidding';
import { useCurrency } from '../contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

const scoreSchema = z.object({
  score: z.number().min(0).max(100),
  maxScore: z.number().min(1).max(100).default(100),
  comments: z.string().optional(),
});

type ScoreFormData = z.infer<typeof scoreSchema>;

const BID_STATUS_COLORS = {
  Draft: 'bg-gray-100 text-gray-800',
  Submitted: 'bg-blue-100 text-blue-800',
  'Under Review': 'bg-yellow-100 text-yellow-800',
  Evaluated: 'bg-purple-100 text-purple-800',
  Awarded: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800'
} as const;

export function BidEvaluation() {
  const { formatAmount } = useCurrency();
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [awarding, setAwarding] = useState(false);

  const scoreForm = useForm<ScoreFormData>({
    resolver: zodResolver(scoreSchema),
    defaultValues: {
      score: 0,
      maxScore: 100,
      comments: ''
    }
  });

  useEffect(() => {
    if (tenderId) {
      loadTenderAndBids();
    }
  }, [tenderId]);

  const loadTenderAndBids = async () => {
    if (!tenderId) return;

    try {
      setLoading(true);
      const [tenderResponse, bidsResponse] = await Promise.all([
        biddingApi.getTenderById(tenderId),
        biddingApi.getBidsForTender(tenderId)
      ]);
      
      setTender(tenderResponse.data);
      setBids(bidsResponse.data);
      
      if (bidsResponse.data.length > 0) {
        setSelectedBid(bidsResponse.data[0]);
      }
    } catch (error) {
      console.error('Error loading tender and bids:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBids = async () => {
    if (!tenderId) return;

    try {
      await biddingApi.openBidsForTender(tenderId);
      toast.success('Bids opened successfully');
      loadTenderAndBids();
    } catch (error) {
      console.error('Error opening bids:', error);
      toast.error(getErrorMessage(error, 'Failed to open bids'));
    }
  };

  const handleSubmitScore = async (data: ScoreFormData) => {
  if (!selectedBid) return;

  try {
    setSubmittingScore(true);
    await biddingApi.submitTechnicalScore(selectedBid._id, {
      score: data.score,
      maxScore: data.maxScore,
      comments: data.comments
    });
    toast.success('Technical score submitted successfully');
    loadTenderAndBids();
    scoreForm.reset();
  } catch (error) {
    console.error('Error submitting score:', error);
    toast.error(getErrorMessage(error, 'Failed to submit technical score'));
  } finally {
    setSubmittingScore(false);
  }
};

  const handleAwardBid = async (bidId: string) => {
    try {
      setAwarding(true);
      await biddingApi.awardTender(bidId, tenderId!);
      toast.success('Tender awarded successfully');
      loadTenderAndBids();
    } catch (error) {
      console.error('Error awarding tender:', error);
      toast.error(getErrorMessage(error, 'Failed to award tender'));
    } finally {
      setAwarding(false);
    }
  };

  const calculateRanking = (bid: Bid) => {
  if (
    !bid.evaluation?.technicalScore ||
    !bid.financialProposal ||
    typeof bid.financialProposal.totalBidPrice !== 'number'
  ) {
    return 0;
  }

    // Simple ranking: 70% technical, 30% financial (lower price is better)
    const techWeight = 0.7;
    const finWeight = 0.3;
    
    const techScore = (bid.evaluation.technicalScore / 100) * techWeight;
    
    // Normalize financial score (assuming lowest price gets highest score)
    const allPrices = bids
      .filter(b => b.financialProposal?.totalBidPrice)
      .map(b => b.financialProposal!.totalBidPrice);
    
    const minPrice = Math.min(...allPrices);
    const finScore = allPrices.length > 0 ? (minPrice / bid.financialProposal.totalBidPrice) * finWeight : 0;
    
    return (techScore + finScore) * 100;
  };

  const sortedBids = [...bids].sort((a, b) => calculateRanking(b) - calculateRanking(a));

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-muted-foreground">Loading evaluation data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tender not found</h2>
          <p className="text-muted-foreground mb-4">The tender you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/bidding/tenders')}>
            Back to Tenders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/bidding/tenders/${tender._id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tender
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bid Evaluation</h1>
        <p className="text-muted-foreground">{tender.title}</p>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-sm text-muted-foreground">Tender Number: {tender.tenderNumber}</span>
          <Badge className="bg-purple-100 text-purple-800">Evaluation</Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 mb-6">
        <Can permission={Permissions.EVALUATE_BID}>
          {tender.status === 'Closed' && (
            <Button onClick={handleOpenBids}>
              <Eye className="h-4 w-4 mr-2" />
              Open Bids for Evaluation
            </Button>
          )}
        </Can>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {bids.length} bid{bids.length !== 1 ? 's' : ''} received
        </div>
      </div>

      {bids.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bids submitted</h3>
            <p className="text-muted-foreground text-center">
              No bids have been submitted for this tender yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Bids List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Submitted Bids ({bids.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {sortedBids.map((bid, index) => (
                    <div
                      key={bid._id}
                      className={`p-4 cursor-pointer border-l-4 hover:bg-gray-50 transition-colors ${
                        selectedBid?._id === bid._id 
                          ? 'bg-blue-50 border-l-blue-500' 
                          : 'border-l-transparent'
                      }`}
                      onClick={() => setSelectedBid(bid)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            #{index + 1}
                          </span>
                          {bid.status === 'Awarded' && (
                            <Award className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <Badge className={BID_STATUS_COLORS[bid.status]}>
                          {bid.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        Bidder: {typeof bid.bidderId === 'object' ? bid.bidderId.companyName : bid.bidderId}
                      </div>
                      
                      {bid.financialProposal?.totalBidPrice && (
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            {formatAmount(bid.financialProposal.totalBidPrice)}
                          </span>
                        </div>
                      )}
                      
                      {bid.evaluation?.technicalScore !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>Tech Score: {bid.evaluation.technicalScore}/100</span>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        Ranking Score: {calculateRanking(bid).toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bid Details */}
          <div className="lg:col-span-2">
            {selectedBid ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="financial">Financial</TabsTrigger>
                  <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <Card>
                    <CardHeader>
                      <CardTitle>Bid Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Bid Status */}
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <div className="mt-1">
                          <Badge className={BID_STATUS_COLORS[selectedBid.status]}>
                            {selectedBid.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Bidder Info */}
                      <div>
                        <Label className="text-sm font-medium">Bidder ID</Label>
                        <p className="mt-1 text-sm text-gray-900">
  {typeof selectedBid.bidderId === 'object' 
    ? selectedBid.bidderId.companyName 
    : selectedBid.bidderId}
</p>
                      </div>

                      {/* Submission Date */}
                      <div>
                        <Label className="text-sm font-medium">Submitted On</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-gray-900">
                            {format(new Date(selectedBid.submissionDate), 'PPp')}
                          </span>
                        </div>
                      </div>

                      {/* Documents */}
                      {selectedBid.documents && selectedBid.documents.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Documents</Label>
                          <div className="space-y-2">
                            {selectedBid.documents.map((doc, index) => (
                              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{doc.name || `Document ${index + 1}`}</span>
                                </div>
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="technical">
                  <Card>
                    <CardHeader>
                      <CardTitle>Technical Proposal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {selectedBid.technicalProposal ? (
                        <>
                          <div>
                            <Label className="text-sm font-medium">Methodology</Label>
                            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                              {selectedBid.technicalProposal.methodology}
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Timeline (Days)</Label>
                            <p className="mt-1 text-sm text-gray-900">
                              {selectedBid.technicalProposal.timeline}
                            </p>
                          </div>

                          {selectedBid.technicalProposal.keyPersonnel && (
                            <div>
                              <Label className="text-sm font-medium">Key Personnel</Label>
                              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                                {selectedBid.technicalProposal.keyPersonnel}
                              </p>
                            </div>
                          )}

                          {selectedBid.technicalProposal.equipment && (
                            <div>
                              <Label className="text-sm font-medium">Equipment & Resources</Label>
                              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                                {selectedBid.technicalProposal.equipment}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">No technical proposal provided.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="financial">
                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Proposal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {selectedBid.financialProposal ? (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <Label className="text-sm font-medium">Materials Cost</Label>
                              <p className="mt-1 text-lg font-semibold text-gray-900">
                                {formatAmount(selectedBid.financialProposal.materialsCode || 0)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Labor Cost</Label>
                              <p className="mt-1 text-lg font-semibold text-gray-900">
                                {formatAmount(selectedBid.financialProposal.laborCost || 0)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Equipment Cost</Label>
                              <p className="mt-1 text-lg font-semibold text-gray-900">
                                {formatAmount(selectedBid.financialProposal.equipmentCost || 0)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Overheads</Label>
                              <p className="mt-1 text-lg font-semibold text-gray-900">
                                {formatAmount(selectedBid.financialProposal.overheads || 0)}
                              </p>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <Label className="text-sm font-medium">Total Bid Price</Label>
                            <p className="mt-1 text-2xl font-bold text-green-600">
                              {formatAmount(selectedBid.financialProposal.totalBidPrice || 0)}
                            </p>
                          </div>

                          {selectedBid.financialProposal.paymentTerms && (
                            <div>
                              <Label className="text-sm font-medium">Payment Terms</Label>
                              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                                {selectedBid.financialProposal.paymentTerms}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">No financial proposal provided.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="evaluation">
                  <div className="space-y-6">
                    {/* Current Evaluation */}
                    {selectedBid.evaluation && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Current Evaluation
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Technical Score</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Star className="h-5 w-5 text-yellow-500" />
                              <span className="text-lg font-semibold">
                                {selectedBid.evaluation.technicalScore}/100
                              </span>
                            </div>
                          </div>

                          {selectedBid.evaluation?.technicalComments && (
  <div>
    <Label className="text-sm font-medium">Comments</Label>
    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
      {selectedBid.evaluation.technicalComments}
    </p>
  </div>
)}

                         <div>
  <Label className="text-sm font-medium">Evaluated By</Label>
  <p className="mt-1 text-sm text-gray-900">
    {selectedBid.evaluation?.evaluatedBy || 'Unknown'}
  </p>
</div>

                          {selectedBid.evaluation?.evaluatedAt && (
  <div>
    <Label className="text-sm font-medium">Evaluation Date</Label>
    <p className="mt-1 text-sm text-gray-900">
      {format(new Date(selectedBid.evaluation.evaluatedAt), 'PPp')}
    </p>
  </div>
)}
                        </CardContent>
                      </Card>
                    )}

                    {/* Evaluation Form */}
                    <Can permission={Permissions.EVALUATE_BID}>
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            {selectedBid.evaluation ? 'Update Evaluation' : 'Submit Evaluation'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={scoreForm.handleSubmit(handleSubmitScore)} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <Label htmlFor="score">Technical Score</Label>
                                <Input
                                  id="score"
                                  type="number"
                                  min="0"
                                  max={scoreForm.watch('maxScore')}
                                  {...scoreForm.register('score', { valueAsNumber: true })}
                                  className="mt-1"
                                />
                                {scoreForm.formState.errors.score && (
                                  <p className="text-sm text-red-600 mt-1">
                                    {scoreForm.formState.errors.score.message}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor="maxScore">Maximum Score</Label>
                                <Input
                                  id="maxScore"
                                  type="number"
                                  min="1"
                                  max="100"
                                  {...scoreForm.register('maxScore', { valueAsNumber: true })}
                                  className="mt-1"
                                />
                                {scoreForm.formState.errors.maxScore && (
                                  <p className="text-sm text-red-600 mt-1">
                                    {scoreForm.formState.errors.maxScore.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          
                            <div>
                              <Label htmlFor="comments">Evaluation Comments (Optional)</Label>
                              <Textarea
                                id="comments"
                                {...scoreForm.register('comments')}
                                rows={4}
                                className="mt-1"
                                placeholder="Provide detailed evaluation comments..."
                              />
                            </div>
                          
                            <Button type="submit" disabled={submittingScore}>
                              {submittingScore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              {selectedBid.evaluation ? 'Update Evaluation' : 'Submit Evaluation'}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    </Can>

                    {/* Award Actions */}
                    <Can permission={Permissions.AWARD_BID}>
                      {selectedBid.evaluation && selectedBid.status !== 'Awarded' && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-yellow-500" />
                              Award Tender
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-start gap-4">
                              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-700 mb-4">
                                  This action will award the tender to this bidder and notify all participants. 
                                  This action cannot be undone.
                                </p>
                                <Button 
                                  onClick={() => handleAwardBid(selectedBid._id)}
                                  disabled={awarding}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {awarding ? 'Awarding...' : 'Award This Bid'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Can>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a bid to view details and evaluation.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
