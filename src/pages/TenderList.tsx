import { useState, useEffect } from "react";
import { format, isAfter, isBefore } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Edit,
  FileText,
  Building2,
  Loader2,
  UserCheck,
  Send,
  Award,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Can } from "../components/PermissionGate";
import { Permissions } from "../constants/permissions";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from '../contexts/CurrencyContext';
import { biddingApi } from "../lib/bidding-api";
import { Bidder, Tender, TenderStatus, TenderType } from "../types/bidding";
import {
  hasConflictOfInterest,
  getBiddingEligibility,
} from "../utils/bidding-conflicts";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { getErrorMessage } from '@/utils/error-handler';
import toast from "react-hot-toast";

const TENDER_STATUS_COLORS = {
  Draft: "bg-gray-100 text-gray-800",
  Published: "bg-blue-100 text-blue-800",
  Closed: "bg-orange-100 text-orange-800",
  Awarded: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
} as const;

const TENDER_TYPE_COLORS = {
  Construction: "bg-purple-100 text-purple-800",
  Consultancy: "bg-teal-100 text-teal-800",
  Supply: "bg-indigo-100 text-indigo-800",
  Maintenance: "bg-yellow-100 text-yellow-800",
  "Design & Build": "bg-pink-100 text-pink-800",
} as const;

export function TenderList() {
  const { formatAmount } = useCurrency();
  const [myTenders, setMyTenders] = useState<Tender[]>([]);
  const [publicTenders, setPublicTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("public");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenderStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TenderType | "all">("all");
  const [showOnboarding] = useState(true);
  const [bidderProfile, setBidderProfile] = useState<Bidder | null>(null);
  const [bidderProfileLoading, setBidderProfileLoading] = useState(false);

  const navigate = useNavigate();
  const { user, activeProfile, organizationProfiles } = useAuth();

  useEffect(() => {
    loadTenders();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadBidderProfile();
  }, [activeProfile]); // Load bidder profile when active profile changes

  const loadBidderProfile = async () => {
    try {
      setBidderProfileLoading(true);
      const response = await biddingApi.getBidderProfile();
      setBidderProfile(response.data);
    } catch (error) {
      // User doesn't have bidder profile - this is ok
      setBidderProfile(null);
    } finally {
      setBidderProfileLoading(false);
    }
  };

  const loadTenders = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (typeFilter !== "all") filters.type = typeFilter;

      // Load both lists in parallel
      const [publicResponse, myResponse] = await Promise.allSettled([
        biddingApi.listPublishedTenders(filters),
        biddingApi.getAllTenders(filters),
      ]);

      if (publicResponse.status === "fulfilled") {
        setPublicTenders(publicResponse.value.data);
      } else {
        console.error("Error loading public tenders:", publicResponse.reason);
        const msg = getErrorMessage(publicResponse.reason, 'Failed to load public tenders');
        toast.error(msg, { id: 'public-tenders-error' });
      }

      if (myResponse.status === "fulfilled") {
        setMyTenders(myResponse.value.data);
      } else {
        console.error("Error loading my tenders:", myResponse.reason);
        const msg = getErrorMessage(myResponse.reason, 'Failed to load my tenders');
        toast.error(msg, { id: 'my-tenders-error' });
      }
    } catch (error) {
      console.error("Error loading tenders:", error);
      const msg = getErrorMessage(error, 'Failed to load tenders');
      toast.error(msg, { id: 'load-tenders-error' });
    } finally {
      setLoading(false);
    }
  };  

  const getTimeRemaining = (deadline: string | undefined) => {
    if (!deadline) {
      return { text: "TBD", color: "text-gray-500", urgent: false };
    }

    const now = new Date();
    const deadlineDate = new Date(deadline);

    if (isNaN(deadlineDate.getTime())) {
      return { text: "Invalid", color: "text-gray-500", urgent: false };
    }

    if (isBefore(deadlineDate, now)) {
      return { text: "Expired", color: "text-red-600", urgent: true };
    }

    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      return { text: "Due today", color: "text-red-600", urgent: true };
    } else if (diffDays <= 3) {
      return {
        text: `${diffDays} days left`,
        color: "text-orange-600",
        urgent: true,
      };
    } else if (diffDays <= 7) {
      return {
        text: `${diffDays} days left`,
        color: "text-yellow-600",
        urgent: false,
      };
    } else {
      return {
        text: `${diffDays} days left`,
        color: "text-green-600",
        urgent: false,
      };
    }
  };

  const currentTenders = activeTab === "public" ? publicTenders : myTenders;

  const filteredTenders = currentTenders.filter(
    (tender) =>
      tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.tenderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewTender = (tender: Tender) => {
    navigate(`/bidding/tenders/${tender._id}`);
  };

  const handleEditTender = (tender: Tender) => {
    navigate(`/bidding/tenders/${tender._id}/edit`);
  };

  const handleCreateTender = () => {
    navigate("/bidding/tenders/create");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-muted-foreground">Loading tenders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenders</h1>
          <p className="text-muted-foreground mt-1">
            Construction project opportunities
          </p>
        </div>
        <Can permission={Permissions.CREATE_TENDER}>
          <Button onClick={handleCreateTender} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Post New Tender
          </Button>
        </Can>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as TenderStatus | "all")
              }
            >
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Awarded">Awarded</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as TenderType | "all")
              }
            >
              <SelectTrigger>
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Construction">Construction</SelectItem>
                <SelectItem value="Consultancy">Consultancy</SelectItem>
                <SelectItem value="Supply">Supply</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Design & Build">Design & Build</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              {filteredTenders.length} tender
              {filteredTenders.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tender Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="public">
            Published Tenders ({publicTenders.length})
          </TabsTrigger>
          <Can permission={Permissions.CREATE_TENDER}>
            <TabsTrigger value="mine">
              My Tenders ({myTenders.length})
            </TabsTrigger>
          </Can>
        </TabsList>
      </Tabs>

      {/* Empty State */}
      {showOnboarding &&
        publicTenders.length === 0 &&
        myTenders.length === 0 &&
        !loading && (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tenders yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by posting a project or registering to bid
              </p>

              <div className="flex gap-4 justify-center">
                <Can permission={Permissions.CREATE_TENDER}>
                  <Button
                    onClick={() =>
                      navigate("/bidding/tenders/create")
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Post Project
                  </Button>
                </Can>

                <Can permission={Permissions.SUBMIT_BID}>
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate("/bidding/register-bidder")
                    }
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Register to Bid
                  </Button>
                </Can>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Tenders Grid */}
      {filteredTenders.length === 0 && !showOnboarding ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tenders found
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Get started by creating your first tender."}
            </p>
            <Can permission={Permissions.CREATE_TENDER}>
              <Button onClick={handleCreateTender} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Tender
              </Button>
            </Can>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTenders.map((tender) => {
            const submissionTime = getTimeRemaining(tender.submissionDeadline);
            const clarificationTime = getTimeRemaining(
              tender.clarificationDeadline
            );
            const biddingEligibility = getBiddingEligibility(tender, user, organizationProfiles || [], activeProfile, bidderProfile, bidderProfileLoading);
            const conflictCheck = hasConflictOfInterest(
              tender,
              user,
              organizationProfiles,
              activeProfile
            );

            return (
              <Card
                key={tender._id}
                className="hover:shadow-lg transition-shadow duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight mb-2 truncate">
                        {tender.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={TENDER_STATUS_COLORS[tender.status]}>
                          {tender.status}
                        </Badge>
                        <Badge
                          className={TENDER_TYPE_COLORS[tender.type]}
                          variant="outline"
                        >
                          {tender.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tender.description}
                  </p>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Tender Number */}
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-gray-900">
                      {tender.tenderNumber}
                    </span>
                  </div>

                  {/* Key Dates */}
                  <div className="space-y-2 mb-4">
                    {/* Only show clarifications for "My Tenders" tab */}
                    {activeTab === "mine" && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span className="text-muted-foreground">
                            Clarifications:
                          </span>
                        </div>
                        <span className={clarificationTime.color}>
                          {clarificationTime.text}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-muted-foreground">
                          Submission:
                        </span>
                      </div>
                      <span
                        className={`${submissionTime.color} ${
                          submissionTime.urgent ? "font-medium" : ""
                        }`}
                      >
                        {submissionTime.text}
                      </span>
                    </div>

                    {/* Only show bid opening for "My Tenders" tab */}
                    {activeTab === "mine" && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">
                            Opening:
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {tender.bidOpeningDate
                            ? format(
                                new Date(tender.bidOpeningDate),
                                "MMM d, yyyy"
                              )
                            : "TBD"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Estimated Budget */}
                  {tender.estimatedBudget && (
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        Est. Budget: {formatAmount(tender.estimatedBudget)}
                      </span>
                    </div>
                  )}

                  {/* Conflict Warning */}
                  {conflictCheck.hasConflict && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-xs text-yellow-700 font-medium">
                          {conflictCheck.reason}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    {/* Bidding Actions */}
                    {tender.status === "Published" &&
                      tender.submissionDeadline &&
                      isAfter(
                        new Date(tender.submissionDeadline),
                        new Date()
                      ) && (
                        <>
                          {biddingEligibility.canBid ? (
                            <Button
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/bidding/tenders/${tender._id}`
                                )
                              }
                              className="w-full"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Submit Bid
                            </Button>
                          ) : biddingEligibility.needsBidderRegistration && !bidderProfile ? (
                            <div className="space-y-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  navigate("/bidding/register-bidder")
                                }
                                className="w-full"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Register to Bid
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  navigate(
                                    `/bidding/tenders/${tender._id}`
                                  )
                                }
                                className="w-full"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/bidding/tenders/${tender._id}`
                                )
                              }
                              className="w-full"
                              title={biddingEligibility.reason}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          )}
                        </>
                      )}

                    {(tender.status === TenderStatus.CLOSED || 
  (tender.status === "Published" && 
   tender.submissionDeadline && 
   isBefore(new Date(tender.submissionDeadline), new Date()))) && (
  <Can permission={Permissions.EVALUATE_BID}>
    <Button
      size="sm"
      onClick={() =>
        navigate(`/bidding/tenders/${tender._id}/evaluate`)
      }
      className="w-full"
      variant="outline"
    >
      <Award className="h-4 w-4 mr-2" />
      Review Bids
    </Button>
  </Can>
)}

                    {tender.status === TenderStatus.AWARDED && (
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <span className="text-sm text-green-700 font-medium">
                          Project Awarded
                        </span>
                      </div>
                    )}

                    {tender.status === "Published" &&
  tender.submissionDeadline &&
  isBefore(
    new Date(tender.submissionDeadline),
    new Date()
  ) && (
    <div className="space-y-2">
      <div className="text-center p-2 bg-gray-100 rounded-lg">
        <span className="text-sm text-gray-600">
          Bidding Closed
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleViewTender(tender)}
        className="w-full"
      >
        <Eye className="h-4 w-4 mr-2" />
        View Details
      </Button>
    </div>
  )}
                    {/* Management Actions */}
                    <Can permission={Permissions.UPDATE_TENDER}>
                      {tender.status === TenderStatus.DRAFT && (
                        <div className="space-y-2">
                          {isAfter(
                            new Date(tender.submissionDeadline),
                            new Date()
                          ) && (
                            <Button
                              size="sm"
                              onClick={() => handleViewTender(tender)}
                              className="w-full"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View & Publish
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTender(tender)}
                            className="w-full"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </Button>
                        </div>
                      )}
                    </Can>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
