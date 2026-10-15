import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isAfter } from "date-fns";
import { useCurrency } from '../contexts/CurrencyContext';
import {
  ArrowLeft,
  Trash2,
  Calculator,
  FileText,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  X,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { MultiStepForm } from "../components/ui/multi-step-form";
import { biddingApi } from "../lib/bidding-api";
import type { Tender, SubmitBidDTO } from "../types/bidding";
import { UnitOfMeasurement } from "../types";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getErrorMessage } from '@/utils/error-handler';
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const manualBoqItemSchema = z.object({
  description: z.string().min(1, "Item description is required"),
  unit: z.nativeEnum(UnitOfMeasurement),
  quantity: z.number().min(0, "Quantity must be positive"),
  unitRate: z.number().min(0, "Unit rate must be positive"),
});

const bidSchema = z
  .object({
    // Technical Proposal
    methodology: z
      .string()
      .min(50, "Methodology must be at least 50 characters"),
    workPlan: z.string().min(50, "Work plan must be at least 50 characters"),
    teamStructure: z
      .string()
      .min(30, "Team structure must be at least 30 characters"),
    equipmentList: z
      .string()
      .min(30, "Equipment list must be at least 30 characters"),
    projectSchedule: z
      .string()
      .min(30, "Project schedule must be at least 30 characters"),

    // Financial Proposal
    totalBidPrice: z.string().min(1, "Total bid price is required"),
    materials: z.string().min(1, "Materials cost is required"),
    labor: z.string().min(1, "Labor cost is required"),
    equipment: z.string().min(1, "Equipment cost is required"),
    overheads: z.string().min(1, "Overheads cost is required"),
    profit: z.string().min(1, "Profit is required"),

    // BoQ Options (at least one must be provided)
    boqOption: z.enum(["manual", "document"], {
      required_error: "Please select a BoQ option",
    }),
    manualBoqItems: z.array(manualBoqItemSchema).optional(),
  })
  .refine(
    (data) => {
      // If manual option is selected, must have at least one BoQ item
      if (data.boqOption === "manual") {
        return data.manualBoqItems && data.manualBoqItems.length > 0;
      }
      // If document option is selected, validation will happen on the backend for uploaded BoQ document
      return true;
    },
    {
      message: "Please add at least one BoQ item when using manual entry",
      path: ["manualBoqItems"],
    }
  );

type BidFormData = z.infer<typeof bidSchema>;

const BID_SUBMISSION_STEPS = [
  {
    id: 1,
    title: "Technical Proposal",
    description: "Methodology and approach",
  },
  { id: 2, title: "Financial Proposal", description: "Pricing and costs" },
  { id: 3, title: "Documents", description: "Supporting files" },
];

export function BidSubmission() {
  const { formatAmount } = useCurrency();
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();

  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bidderProfile, setBidderProfile] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Document states
  const [technicalDocs, setTechnicalDocs] = useState<File[]>([]);
  const [financialDocs, setFinancialDocs] = useState<
    {
      file: File;
      documentType: string;
      description?: string;
    }[]
  >([]);
  const [cashFlowDoc, setCashFlowDoc] = useState<File | null>(null);
  const [otherDocs, setOtherDocs] = useState<File[]>([]);

  const form = useForm<BidFormData>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      methodology: "",
      workPlan: "",
      teamStructure: "",
      equipmentList: "",
      projectSchedule: "",
      totalBidPrice: "",
      materials: "",
      labor: "",
      equipment: "",
      overheads: "",
      profit: "",
      boqOption: "manual",
      manualBoqItems: [],
    },
  });

  const {
    fields: boqItems,
    append: addBoqItem,
    remove: removeBoqItem,
  } = useFieldArray({
    control: form.control,
    name: "manualBoqItems",
  });

  const watchedValues = form.watch([
    "materials",
    "labor",
    "equipment",
    "overheads",
    "profit",
  ]);
  const boqOption = form.watch("boqOption");
  const watchedBoqItems = form.watch("manualBoqItems");

  // Auto-calculate total bid price
  useEffect(() => {
    const [materials, labor, equipment, overheads, profit] = watchedValues;
    const total = [materials, labor, equipment, overheads, profit]
      .map((val) => parseFloat(val) || 0)
      .reduce((sum, val) => sum + val, 0);

    const currentTotal = parseFloat(form.getValues("totalBidPrice") || "0");

    // Only update if the calculated total is different from current value
    if (total !== currentTotal) {
      form.setValue("totalBidPrice", total.toString(), {
        shouldValidate: false,
      });
    }
  }, [watchedValues]);

  useEffect(() => {
    if (tenderId) {
      loadData();
    }
  }, [tenderId]);

  const loadData = async () => {
    if (!tenderId) return;

    try {
      setLoading(true);

      // Load tender details
      const tenderResponse = await biddingApi.getTenderById(tenderId);
      setTender(tenderResponse.data);

      // Check if user has bidder profile
      try {
        const bidderResponse = await biddingApi.getBidderProfile();
        setBidderProfile(bidderResponse.data);
      } catch (error) {
        // User doesn't have bidder profile
        setBidderProfile(null);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error(getErrorMessage(error, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = (
    files: FileList | null,
    setDocs: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    if (files) {
      setDocs((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const removeDocument = (
    index: number,
    setDocs: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    setDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinancialDocumentUpload = (files: FileList | null) => {
    if (files) {
      const newDocs = Array.from(files).map((file) => ({
        file,
        documentType: boqOption === "document" ? "BOQ" : "",
        description: "",
      }));
      setFinancialDocs((prev) => [...prev, ...newDocs]);
    }
  };

  const removeFinancialDocument = (index: number) => {
    setFinancialDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFinancialDocumentType = (index: number, documentType: string) => {
    setFinancialDocs((prev) =>
      prev.map((doc, i) => (i === index ? { ...doc, documentType } : doc))
    );
  };

  const updateFinancialDocumentDescription = (
    index: number,
    description: string
  ) => {
    setFinancialDocs((prev) =>
      prev.map((doc, i) => (i === index ? { ...doc, description } : doc))
    );
  };

  const onSubmit = async (data: BidFormData) => {
    if (!tender || !bidderProfile) return;

    try {
      setSubmitting(true);


      const bidData: SubmitBidDTO = {
        tenderId: tender._id,
        bidderId: bidderProfile._id,
        technicalProposal: {
          methodology: data.methodology,
          workPlan: data.workPlan,
          teamStructure: data.teamStructure,
          equipmentList: data.equipmentList,
          projectSchedule: data.projectSchedule,
          documents: technicalDocs.length > 0 ? technicalDocs : undefined,
        },
        financialProposal: {
          totalBidPrice: parseFloat(data.totalBidPrice),
          // Add BoQ data based on user's choice
          ...(data.boqOption === "manual" &&
          data.manualBoqItems &&
          data.manualBoqItems.length > 0
            ? { manualBoqItems: data.manualBoqItems }
            : {}),
          priceBreakdown: {
            materials: parseFloat(data.materials),
            labor: parseFloat(data.labor),
            equipment: parseFloat(data.equipment),
            overheads: parseFloat(data.overheads),
            profit: parseFloat(data.profit),
          },
          cashFlowProjection: cashFlowDoc || undefined,
          documents:
            financialDocs.length > 0
              ? financialDocs.map((docData) => docData.file)
              : undefined,
          documentMetadata:
            financialDocs.length > 0
              ? financialDocs.map((doc) => ({
                  documentType: doc.documentType,
                  description: doc.description || "",
                }))
              : undefined,
        },
        otherDocuments: otherDocs.length > 0 ? otherDocs : undefined,
      };

      await biddingApi.submitBid(bidData);
      toast.success("Bid submitted successfully");
      navigate(`/bidding/tenders/${tender._id}`);
    } catch (error) {
      console.error("Error submitting bid:", error);
      toast.error(getErrorMessage(error, "Failed to submit bid"));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitBid = () => {
    if (!tender) return false;

    const now = new Date();
    const submissionDeadline = new Date(tender.submissionDeadline);

    return tender.status === "Published" && isAfter(submissionDeadline, now);
  };

  const nextStep = () => {
    if (currentStep < BID_SUBMISSION_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCurrentStepData = () => {
    return BID_SUBMISSION_STEPS.find((step) => step.id === currentStep);
  };

  const isStepComplete = (stepNumber: number) => {
    const formData = form.getValues();

    switch (stepNumber) {
      case 1: // Technical Proposal
        return (
          formData.methodology?.length >= 50 &&
          formData.workPlan?.length >= 50 &&
          formData.teamStructure?.length >= 30 &&
          formData.equipmentList?.length >= 30 &&
          formData.projectSchedule?.length >= 30
        );

      case 2: {
        // Financial Proposal + BoQ
        const hasBasicFinancials =
          formData.materials &&
          formData.labor &&
          formData.equipment &&
          formData.overheads &&
          formData.profit;
        const hasBoQ =
          formData.boqOption === "manual"
            ? formData.manualBoqItems && formData.manualBoqItems.length > 0
            : true;
        return hasBasicFinancials && hasBoQ;
      }
      case 3: // Documents
        return true; // Documents are optional

      default:
        return false;
    }
  };

  const canProceedToNext = () => {
    return isStepComplete(currentStep);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-muted-foreground">
              Loading tender information...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h3 className="text-lg font-semibold">Tender not found</h3>
          <Button
            onClick={() => navigate("/bidding/tenders")}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
        </div>
      </div>
    );
  }

  if (!bidderProfile) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <div className="space-y-2">
              <p className="font-semibold">Bidder Registration Required</p>
              <p>
                You need to register as a bidder before you can submit bids.
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => navigate("/bidding/register-bidder")}
                >
                  Register as Bidder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/bidding/tenders")}
                >
                  Back to Tenders
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canSubmitBid()) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <div className="space-y-2">
              <p className="font-semibold">Bid Submission Not Available</p>
              <p>
                {tender.status !== "Published"
                  ? "This tender is not currently published."
                  : "The bid submission deadline has passed."}
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/bidding/tenders/${tender._id}`)
                }
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tender Details
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(`/bidding/tenders/${tender._id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tender
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Bid</h1>
          <p className="text-muted-foreground">
            {tender.title} • {tender.tenderNumber}
          </p>
        </div>
      </div>

      {/* Deadline Warning */}
      <Alert className="mb-6">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex justify-between items-center">
            <span>
              Submission deadline:{" "}
              <strong>
                {format(
                  new Date(tender.submissionDeadline),
                  "MMM d, yyyy h:mm a"
                )}
              </strong>
            </span>
            <Badge variant="outline">
              {Math.ceil(
                (new Date(tender.submissionDeadline).getTime() -
                  new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              )}{" "}
              days left
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <MultiStepForm
          steps={BID_SUBMISSION_STEPS}
          currentStep={currentStep}
          onNext={nextStep}
          onPrevious={prevStep}
          onCancel={() => navigate(`/bidding/tenders/${tender._id}`)}
          onSubmit={form.handleSubmit(onSubmit)}
          isSubmitting={submitting}
          canSubmit={canSubmitBid()}
          submitLabel="Submit Bid"
          cancelLabel="Back to Tender"
          nextDisabled={!canProceedToNext()}
        >
          {/* Step 1: Technical Proposal */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Approach</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="methodology"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Methodology *</FormLabel>
                        <FormControl>
                          <RichTextEditor
          value={field.value}
          onChange={field.onChange}
          placeholder="Describe your technical approach..."
        />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Plan *</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Detail your work plan and execution strategy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teamStructure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Structure *</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Describe your team structure and key personnel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="equipmentList"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipment List *</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="List major equipment and tools"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectSchedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Schedule *</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Outline your project timeline and milestones"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Financial Proposal */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Price Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="materials"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Materials Cost *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="labor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Labor Cost *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="equipment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipment Cost *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="overheads"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overheads *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profit *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="totalBidPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Total Bid Price * (Auto-calculated)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              readOnly
                              className="font-semibold text-lg bg-muted"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal (Materials + Labor + Equipment):</span>
                        <span>
                          {formatAmount(
                            (parseFloat(form.watch("materials")) || 0) +
                            (parseFloat(form.watch("labor")) || 0) +
                            (parseFloat(form.watch("equipment")) || 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overheads:</span>
                        <span>
                          {formatAmount(parseFloat(form.watch("overheads")) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Profit:</span>
                        <span>
                          {formatAmount(parseFloat(form.watch("profit")) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-base pt-2 border-t">
                        <span>Total Bid Price:</span>
                        <span className="text-green-600">
                          {formatAmount(parseFloat(form.watch("totalBidPrice")) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bill of Quantities (BoQ) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Bill of Quantities (BoQ) *
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose how you want to provide your BoQ - either by entering
                    items manually or uploading a BoQ document.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="boqOption"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BoQ Option *</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                {...field}
                                value="manual"
                                checked={field.value === "manual"}
                                className="w-4 h-4"
                              />
                              <span>Manual Entry</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                {...field}
                                value="document"
                                checked={field.value === "document"}
                                className="w-4 h-4"
                              />
                              <span>Upload BoQ Document</span>
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {boqOption === "manual" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">BoQ Items</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            addBoqItem({
                              description: "",
                              unit: UnitOfMeasurement.PIECE,
                              quantity: 0,
                              unitRate: 0,
                            })
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>

                      {boqItems.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>
                            No BoQ items added yet. Click "Add Item" to start.
                          </p>
                        </div>
                      )}

                      {boqItems.map((item, index) => (
                        <Card key={item.id} className="p-4">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <FormField
                              control={form.control}
                              name={`manualBoqItems.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Item description"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`manualBoqItems.${index}.unit`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit *</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select unit" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.values(UnitOfMeasurement).map(
                                        (unit) => (
                                          <SelectItem key={unit} value={unit}>
                                            {unit}
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`manualBoqItems.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`manualBoqItems.${index}.unitRate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit Rate *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeBoqItem(index)}
                                className="w-full"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Total:
                            </span>
                            <span className="font-medium">
                              $
                              {(
                                (form.watch(
                                  `manualBoqItems.${index}.quantity`
                                ) || 0) *
                                (form.watch(
                                  `manualBoqItems.${index}.unitRate`
                                ) || 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                        </Card>
                      ))}

                      {boqItems.length > 0 && (
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex justify-between font-semibold">
                            <span>Total BoQ Amount:</span>
                            <span className="text-green-600">
                              $
                              {boqItems
                                .reduce((total, item, index) => {
                                  const quantity =
                                    form.watch(
                                      `manualBoqItems.${index}.quantity`
                                    ) || 0;
                                  const rate =
                                    form.watch(
                                      `manualBoqItems.${index}.unitRate`
                                    ) || 0;
                                  return total + quantity * rate;
                                }, 0)
                                .toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {boqOption === "document" && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Upload your BoQ document in the Financial Documents
                        section on the next step.
                      </p>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-800">
                          <Info className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Remember to upload your BoQ document as a "BOQ" type
                            in the Financial Documents section.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Technical Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Technical Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      type="file"
                      multiple
                      onChange={(e) =>
                        handleDocumentUpload(e.target.files, setTechnicalDocs)
                      }
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload methodology, work plans, team CVs, equipment
                      specifications
                    </p>
                  </div>

                  {technicalDocs.length > 0 && (
                    <div className="space-y-2">
                      {technicalDocs.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              removeDocument(index, setTechnicalDocs)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Financial Documents
                    {boqOption === "document" && (
                      <Badge variant="outline" className="ml-2">
                        BoQ Required
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {boqOption === "document" && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <Info className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Please upload at least one document and mark its type
                          as "BOQ" to meet the BoQ requirement.
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">
                      Financial Documents
                    </label>
                    <Input
                      type="file"
                      multiple
                      onChange={(e) =>
                        handleFinancialDocumentUpload(e.target.files)
                      }
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload detailed BOQ, price breakdown, bonds, and other
                      financial documents
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Cash Flow Projection
                    </label>
                    <Input
                      type="file"
                      onChange={(e) =>
                        setCashFlowDoc(e.target.files?.[0] || null)
                      }
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload cash flow projection document
                    </p>
                  </div>

                  {financialDocs.length > 0 && (
                    <div className="space-y-4">
                      <label className="text-sm font-medium">
                        Uploaded Financial Documents ({financialDocs.length})
                      </label>
                      {financialDocs.map((fileData, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {fileData.file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(fileData.file.size / 1024 / 1024).toFixed(
                                    2
                                  )}{" "}
                                  MB
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeFinancialDocument(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="text-sm font-medium">
                                  Document Type *
                                </label>
                                <Select
                                  value={fileData.documentType}
                                  onValueChange={(value) =>
                                    updateFinancialDocumentType(index, value)
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select document type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="BOQ">
                                      BOQ (Bill of Quantities)
                                    </SelectItem>
                                    <SelectItem value="PRICE_BREAKDOWN">
                                      Price Breakdown
                                    </SelectItem>
                                    <SelectItem value="CASH_FLOW">
                                      Cash Flow
                                    </SelectItem>
                                    <SelectItem value="BOND">Bond</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="text-sm font-medium">
                                  Description (Optional)
                                </label>
                                <Input
                                  className="mt-1"
                                  placeholder="Document description"
                                  value={fileData.description || ""}
                                  onChange={(e) =>
                                    updateFinancialDocumentDescription(
                                      index,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>

                            {fileData.documentType === "BOQ" && (
                              <div className="p-2 bg-green-50 rounded border border-green-200">
                                <div className="flex items-center gap-2 text-green-800">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    BoQ requirement satisfied
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {cashFlowDoc && (
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Cash Flow: {cashFlowDoc.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(cashFlowDoc.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setCashFlowDoc(null)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Other Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Additional Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      type="file"
                      multiple
                      onChange={(e) =>
                        handleDocumentUpload(e.target.files, setOtherDocs)
                      }
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Any additional supporting documents
                    </p>
                  </div>

                  {otherDocs.length > 0 && (
                    <div className="space-y-2">
                      {otherDocs.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeDocument(index, setOtherDocs)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </MultiStepForm>
      </Form>
    </div>
  );
}
