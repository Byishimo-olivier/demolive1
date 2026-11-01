import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as z from "zod";
import { projectApi } from "../lib/project-api";
import { financeApi } from "../lib/finance-api";
import type { Project, ProjectFormData } from "../types";
import { UserRole } from "../types";
import { humanizeLabel, getFileUrl } from "../lib/utils";
import { getErrorMessage } from "../utils/error-handler";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

/* eslint-disable @typescript-eslint/no-explicit-any */

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  projectDescription: z
    .string()
    .min(10, "Project description must be at least 10 characters"),
  status: z.string().min(1, "Status is required"),
  type: z.enum(["Capital", "Maintenance"], {
    required_error: "Project type is required",
  }),
  progress: z
    .number()
    .min(0, "Progress must be at least 0")
    .max(100, "Progress cannot exceed 100"),
  budget: z.number().min(0, "Budget must be a positive number"),
  clientName: z.string().max(200).optional(),
  contractAmount: z.number().min(0, "Contract amount must be a positive number").optional(),
  contactName: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.union([z.string().email("Enter a valid email"), z.literal("")]).optional(),
  description: z.string().optional(),
});

type ProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess: () => void;
};

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ email: string; role: UserRole }>>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // With finance budgets, the project budget is their category total (updated automatically)
  const [budgetCalculated, setBudgetCalculated] = useState(false);

  useEffect(() => {
    if (!open || !project?._id) {
      setBudgetCalculated(false);
      return;
    }
    let cancelled = false;
    financeApi
      .getBudget(project._id)
      .then((res: any) => {
        const data = res?.data;
        // The API answers with a placeholder (no _id) when the project has no budget yet
        if (!cancelled) setBudgetCalculated(Array.isArray(data) ? data.some((b: any) => b?._id) : !!data?._id);
      })
      .catch(() => !cancelled && setBudgetCalculated(false));
    return () => {
      cancelled = true;
    };
  }, [open, project?._id]);
  const [fileDescription, setFileDescription] = useState<string>("");

  type ProjectDoc = { filePath: string; description?: string };
  const [existingDocuments, setExistingDocuments] = useState<ProjectDoc[]>(
    project
      ? (project.documents ?? []).map((d) => ({
          filePath: (d as any).filePath || (d as any),
          description: (d as any).description || "",
        }))
      : []
  );

  const form = useForm<Omit<ProjectFormData, 'team'>>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
      ? {
          name: project.name,
          projectDescription: project.projectDescription,
          status: project.status,
          type: project.type,
          progress: project.progress,
          budget: project.budget,
          clientName: project.clientName || "",
          contractAmount: project.contractAmount || 0,
          contactName: project.contactName || "",
          contactPhone: project.contactPhone || "",
          contactEmail: project.contactEmail || "",
          description: project.projectDescription,
        }
      : {
          name: "",
          projectDescription: "",
          status: "Planning",
          type: "Capital",
          progress: 0,
          budget: 0,
          clientName: "",
          contractAmount: 0,
          contactName: "",
          contactPhone: "",
          contactEmail: "",
          description: "",
        },
  });

  // Reset form whenever the selected project changes
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        projectDescription: project.projectDescription,
        status: project.status,
        type: project.type,
        progress: project.progress,
        budget: project.budget,
        clientName: project.clientName || "",
        contractAmount: project.contractAmount || 0,
        contactName: project.contactName || "",
        contactPhone: project.contactPhone || "",
        contactEmail: project.contactEmail || "",
        description: project.projectDescription,
      });

      setExistingDocuments(
        (project.documents ?? []).map((d) => ({
          filePath: (d as any).filePath || (d as any),
          description: (d as any).description || "",
        }))
      );
      setTeamMembers([]);
    } else {
      // Reset to empty fields when creating new project
      form.reset({
        name: "",
        projectDescription: "",
        status: "Planning",
        type: "Capital",
        progress: 0,
        budget: 0,
        clientName: "",
        contractAmount: 0,
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        description: "",
      });
      setExistingDocuments([]);
      setSelectedFile(null);
      setFileDescription("");
      setTeamMembers([]);
    }
  }, [project, form]);

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { email: '', role: 'site_engineer' as UserRole }]);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index: number, field: 'email' | 'role', value: string) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setTeamMembers(updated);
  };

  const onSubmit = async (data: Omit<ProjectFormData, 'team'>) => {
    console.log("Form submitted with data:", data);
    try {
      setIsSubmitting(true);
      const formData: any = {
        ...data,
        description: fileDescription,
        documents: existingDocuments,
      };

      if (selectedFile) {
        formData.file = selectedFile;
      }
      // A calculated budget is kept in sync by the server
      if (budgetCalculated) {
        delete formData.budget;
      }

      console.log("Sending data to API:", formData);

      let projectId: string;

      if (project) {
        const updatedRes = await projectApi.updateProject(project._id, formData);
        projectId = updatedRes.data._id;
        toast.success("Project updated successfully");
      } else {
        const createRes = await projectApi.createProject(formData);
        projectId = createRes.data._id;
        toast.success("Project created successfully");
      }

      // Send invitations for team members
      const validTeamMembers = teamMembers.filter(tm => tm.email.trim() && tm.role);
      if (validTeamMembers.length > 0) {
        let sent = 0;
        for (const member of validTeamMembers) {
          try {
            const res = await projectApi.invite({
              projectId,
              email: member.email.trim(),
              role: member.role,
            });
            if (res?.data?.emailSent === false) {
              toast.error(`Invitation for ${member.email} saved, but the email could not be sent. Invite them again from the project's team to get a link to share.`);
            } else {
              sent++;
            }
          } catch (err) {
            console.error("Failed to invite user", err);
            toast.error(`${member.email}: ${getErrorMessage(err, "Failed to invite")}`);
          }
        }
        if (sent > 0) {
          toast.success(`Sent ${sent} invitation(s)`);
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error(`Failed to ${project ? "update" : "create"} project`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {project ? "Edit Project" : "Create New Project"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Capital">Capital</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Planning">Planning</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Client &amp; contract</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. City of Kigali" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contractAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract amount (RWF)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact person</FormLabel>
                        <FormControl>
                          <Input placeholder="Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+250…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Contact email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        disabled={budgetCalculated}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    {budgetCalculated && (
                      <p className="text-xs text-muted-foreground">
                        Calculated automatically: the total of the budget categories in Finance → Budget.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="progress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="projectDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Team Members (Optional)</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTeamMember}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>

                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You can add team members later
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Email"
                          value={member.email}
                          onChange={(e) => updateTeamMember(index, 'email', e.target.value)}
                          className="flex-1"
                        />
                        <Select
                          value={member.role}
                          onValueChange={(value) => updateTeamMember(index, 'role', value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(UserRole).map(([key, value]) => (
                              <SelectItem key={key} value={value}>
                                {humanizeLabel(key)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeamMember(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File upload section */}
              <div className="space-y-2">
                <h4 className="font-medium">Project Documents</h4>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setSelectedFile(file || null);
                  }}
                />
                {selectedFile && (
                  <div className="space-y-2">
                    <Input
                      placeholder="File description"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Existing documents */}
              {existingDocuments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Existing Documents</h4>
                  <ul className="space-y-2">
                    {existingDocuments.map((doc, idx) => {
                      const filename =
                        doc.filePath.split("/").pop() || doc.filePath;
                      const downloadUrl = getFileUrl(doc.filePath);
                      return (
                        <li
                          key={idx}
                          className="flex items-center justify-between bg-muted/50 p-2 rounded"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {doc.description || filename}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="secondary" size="sm">
                              <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Download
                              </a>
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {project ? "Updating..." : "Creating..."}
                </>
              ) : project ? (
                "Update Project"
              ) : (
                "Create Project"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
