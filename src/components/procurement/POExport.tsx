import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileText, FileSpreadsheet, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PurchaseOrder } from "@/lib/procurement-api";

interface POExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder;
}

type ExportFormat = "pdf" | "excel" | "csv";

interface ExportOptions {
  format: ExportFormat;
  includeSupplierDetails: boolean;
  includeSpecialInstructions: boolean;
  includeItemBreakdown: boolean;
}

export function POExport({ open, onOpenChange, purchaseOrder }: POExportProps) {
  // Purchase orders are always issued in Rwandan francs (the agreed workflow), whatever the display setting
  const { formatAmount: formatIn } = useCurrency();
  const currency = 'RWF' as const;
  const formatAmount = (amount: number) => formatIn(amount, currency);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: "pdf",
    includeSupplierDetails: true,
    includeSpecialInstructions: true,
    includeItemBreakdown: true,
  });

  const updateOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const generateFileName = () => {
    const timestamp = new Date().toISOString().split("T")[0];
    const extension = options.format === "excel" ? "xlsx" : options.format;
    return `PO_${purchaseOrder.poNumber}_${timestamp}.${extension}`;
  };

  const exportToCSV = () => {
    const headers = [
      "Material",
      "Unit",
      "Quantity",
      "Unit Price",
      "Category",
      "Total",
    ];
    const rows: string[][] = [headers];

    // Add PO header info
    rows.push(["PO Number:", purchaseOrder.poNumber, "", "", "", ""]);
    rows.push([
      "Order Date:",
      new Date(
        purchaseOrder.orderDate || purchaseOrder.createdAt
      ).toLocaleDateString(),
      "",
      "",
      "",
      "",
    ]);
    rows.push([
      "Delivery Date:",
      new Date(purchaseOrder.deliveryDate).toLocaleDateString(),
      "",
      "",
      "",
      "",
    ]);
    rows.push(["Payment Terms:", purchaseOrder.paymentTerms, "", "", "", ""]);
    rows.push(["Status:", isApproved ? "APPROVED" : "DRAFT (not approved)", "", "", "", ""]);
    if (isApproved && purchaseOrder.approval?.signature) {
      const sig = purchaseOrder.approval.signature;
      rows.push([
        "Approved by:",
        `${sig.signerName}${sig.signerTitle ? `, ${sig.signerTitle}` : ""}`,
        purchaseOrder.approval.approvedAt ? new Date(purchaseOrder.approval.approvedAt).toLocaleString() : "",
        "",
        "",
        "",
      ]);
    }
    rows.push(["", "", "", "", "", ""]);

    if (options.includeSupplierDetails) {
      rows.push(["Supplier Details:", "", "", "", "", ""]);
      rows.push([
        `"${purchaseOrder.supplierDetails.replace(/"/g, '""')}"`,
        "",
        "",
        "",
        "",
        "",
      ]);
      rows.push(["", "", "", "", "", ""]);
    }

    // Add material items
    rows.push(headers);
    purchaseOrder.materialList.forEach((item) => {
      const row = [
        `"${item.materialName.replace(/"/g, '""')}"`,
        item.unit,
        item.quantity.toString(),
        item.unitPrice.toString(),
        item.category,
        (item.quantity * item.unitPrice).toString(),
      ];
      rows.push(row);
    });

    // Add total
    rows.push([
      "",
      "",
      "",
      "",
      "Grand Total:",
      purchaseOrder.totalCost.toString(),
    ]);

    if (
      options.includeSpecialInstructions &&
      purchaseOrder.specialInstructions
    ) {
      rows.push(["", "", "", "", "", ""]);
      rows.push(["Special Instructions:", "", "", "", "", ""]);
      rows.push([
        `"${purchaseOrder.specialInstructions.replace(/"/g, '""')}"`,
        "",
        "",
        "",
        "",
        "",
      ]);
    }

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = generateFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isApproved = purchaseOrder.status === "Approved";

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("PURCHASE ORDER", pageWidth / 2, yPos, { align: "center" });

      yPos += 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");

      // PO Details
      doc.text(`PO Number: ${purchaseOrder.poNumber}`, margin, yPos);
      yPos += 7;
      doc.text(
        `Order Date: ${new Date(
          purchaseOrder.orderDate || purchaseOrder.createdAt
        ).toLocaleDateString()}`,
        margin,
        yPos
      );
      yPos += 7;
      doc.text(
        `Delivery Date: ${new Date(
          purchaseOrder.deliveryDate
        ).toLocaleDateString()}`,
        margin,
        yPos
      );
      yPos += 7;
      doc.text(`Payment Terms: ${purchaseOrder.paymentTerms}`, margin, yPos);
      yPos += 7;
      doc.setFont("helvetica", "bold");
      doc.text(`Status: ${isApproved ? "APPROVED" : "DRAFT (not approved)"}`, margin, yPos);
      doc.setFont("helvetica", "normal");

      // Supplier Details
      if (options.includeSupplierDetails) {
        yPos += 12;
        doc.setFont("helvetica", "bold");
        doc.text("Supplier Details:", margin, yPos);
        yPos += 7;
        doc.setFont("helvetica", "normal");
        const supplierLines = doc.splitTextToSize(
          purchaseOrder.supplierDetails,
          pageWidth - 28
        );
        doc.text(supplierLines, margin, yPos);
        yPos += supplierLines.length * 7 + 10;
      } else {
        yPos += 12;
      }

      // Materials Table
      if (options.includeItemBreakdown) {
        const tableData = purchaseOrder.materialList.map((item) => [
          item.materialName,
          item.unit,
          item.quantity.toLocaleString(),
          formatAmount(item.unitPrice),
          item.category,
          formatAmount(item.quantity * item.unitPrice),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [
            ["Material", "Unit", "Quantity", "Unit Price", "Category", "Total"],
          ],
          body: tableData,
          foot: [
            [
              "",
              "",
              "",
              "",
              { content: "Grand Total:", styles: { fontStyle: "bold" } },
              {
                content: formatAmount(purchaseOrder.totalCost),
                styles: { fontStyle: "bold" },
              },
            ],
          ],
          theme: "grid",
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontStyle: "bold",
          },
          footStyles: {
            fillColor: [240, 240, 240],
            fontStyle: "bold",
          },
          styles: {
            fontSize: 9,
            cellPadding: 4,
          },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 15 },
            2: { cellWidth: 20, halign: "right" },
            3: { cellWidth: 25, halign: "right" },
            4: { cellWidth: 30 },
            5: { cellWidth: 30, halign: "right" },
          },
          margin: { left: margin, right: margin },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Special Instructions
      if (
        options.includeSpecialInstructions &&
        purchaseOrder.specialInstructions
      ) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Special Instructions:", margin, yPos);
        yPos += 7;
        doc.setFont("helvetica", "normal");
        const instructionLines = doc.splitTextToSize(
          purchaseOrder.specialInstructions,
          pageWidth - 28
        );
        doc.text(instructionLines, margin, yPos);
      }

      // Approval and signature
      if (isApproved && purchaseOrder.approval?.signature) {
        const sig = purchaseOrder.approval.signature;
        yPos += 16;
        if (yPos > 235) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Approved by:", margin, yPos);
        doc.setFont("helvetica", "normal");
        try {
          doc.addImage(sig.image, "PNG", margin, yPos + 3, 60, 22);
        } catch {
          // An unreadable image still leaves the written approval below
        }
        doc.line(margin, yPos + 27, margin + 70, yPos + 27);
        doc.text(`${sig.signerName}${sig.signerTitle ? `, ${sig.signerTitle}` : ""}`, margin, yPos + 33);
        if (purchaseOrder.approval.approvedAt) {
          doc.setFontSize(10);
          doc.text(`Signed on ${new Date(purchaseOrder.approval.approvedAt).toLocaleString()}`, margin, yPos + 39);
          doc.setFontSize(12);
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        // Not yet approved: mark every page as a draft
        if (!isApproved) {
          const pageHeight = doc.internal.pageSize.getHeight();
          const GState = (doc as any).GState;
          if (GState) doc.setGState(new GState({ opacity: 0.12 }));
          doc.setFont("helvetica", "bold");
          doc.setFontSize(110);
          doc.setTextColor(200, 30, 30);
          doc.text("DRAFT", pageWidth / 2, pageHeight / 2, { align: "center", angle: 45 });
          if (GState) doc.setGState(new GState({ opacity: 1 }));
          doc.setTextColor(0, 0, 0);
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin,
          doc.internal.pageSize.getHeight() - 10,
          { align: "right" }
        );
      }

      doc.save(generateFileName());
    } catch (error) {
      console.error("PDF export error:", error);
      throw error;
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData: any[][] = [];

    // PO Header
    worksheetData.push(["PURCHASE ORDER"]);
    worksheetData.push([]);
    worksheetData.push(["PO Number:", purchaseOrder.poNumber]);
    worksheetData.push([
      "Order Date:",
      new Date(
        purchaseOrder.orderDate || purchaseOrder.createdAt
      ).toLocaleDateString(),
    ]);
    worksheetData.push([
      "Delivery Date:",
      new Date(purchaseOrder.deliveryDate).toLocaleDateString(),
    ]);
    worksheetData.push(["Payment Terms:", purchaseOrder.paymentTerms]);
    worksheetData.push(["Status:", isApproved ? "APPROVED" : "DRAFT (not approved)"]);
    if (isApproved && purchaseOrder.approval?.signature) {
      const sig = purchaseOrder.approval.signature;
      worksheetData.push([
        "Approved by:",
        `${sig.signerName}${sig.signerTitle ? `, ${sig.signerTitle}` : ""}`,
        purchaseOrder.approval.approvedAt ? new Date(purchaseOrder.approval.approvedAt).toLocaleString() : "",
      ]);
    }
    worksheetData.push([]);

    if (options.includeSupplierDetails) {
      worksheetData.push(["Supplier Details:"]);
      worksheetData.push([purchaseOrder.supplierDetails]);
      worksheetData.push([]);
    }

    if (options.includeItemBreakdown) {
      // Material headers
      worksheetData.push([
        "Material",
        "Unit",
        "Quantity",
        "Unit Price",
        "Category",
        "Total",
      ]);

      // Materials
      purchaseOrder.materialList.forEach((item) => {
        worksheetData.push([
          item.materialName,
          item.unit,
          item.quantity,
          item.unitPrice,
          item.category,
          item.quantity * item.unitPrice,
        ]);
      });

      // Total
      worksheetData.push([
        "",
        "",
        "",
        "",
        "Grand Total:",
        purchaseOrder.totalCost,
      ]);
      worksheetData.push([]);
    }

    if (
      options.includeSpecialInstructions &&
      purchaseOrder.specialInstructions
    ) {
      worksheetData.push(["Special Instructions:"]);
      worksheetData.push([purchaseOrder.specialInstructions]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 40 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
    ];

    // Style header
    const headerStyle = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: "center" },
    };
    if (worksheet["A1"]) worksheet["A1"].s = headerStyle;

    // Format currency cells
    const currencyFormat = '"RWF "#,##0';
    purchaseOrder.materialList.forEach((_, idx) => {
      const rowNum = 10 + (options.includeSupplierDetails ? 3 : 0) + idx;
      const priceCell = `D${rowNum}`;
      const totalCell = `F${rowNum}`;

      if (worksheet[priceCell]) worksheet[priceCell].z = currencyFormat;
      if (worksheet[totalCell]) worksheet[totalCell].z = currencyFormat;
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
    XLSX.writeFile(workbook, generateFileName());
  };

  const handleExport = async () => {
    try {
      setLoading(true);

      switch (options.format) {
        case "csv":
          exportToCSV();
          break;
        case "pdf":
          exportToPDF();
          break;
        case "excel":
          exportToExcel();
          break;
      }

      toast.success(
        `Purchase order exported successfully as ${options.format.toUpperCase()}`
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export purchase order");
    } finally {
      setLoading(false);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "excel":
      case "csv":
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: ExportFormat) => {
    switch (format) {
      case "pdf":
        return "Professional formatted document";
      case "excel":
        return "Spreadsheet with formulas";
      case "csv":
        return "Simple comma-separated file";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Purchase Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <div className="space-y-2">
              {(["pdf", "excel", "csv"] as ExportFormat[]).map((format) => (
                <div
                  key={format}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    options.format === format
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                  onClick={() => updateOption("format", format)}
                >
                  <div className="flex items-center gap-3">
                    {getFormatIcon(format)}
                    <div className="flex-1">
                      <div className="font-medium uppercase">{format}</div>
                      <div className="text-sm text-muted-foreground">
                        {getFormatDescription(format)}
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                      {options.format === format && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSupplierDetails"
                  checked={options.includeSupplierDetails}
                  onCheckedChange={(checked) =>
                    updateOption("includeSupplierDetails", !!checked)
                  }
                />
                <Label htmlFor="includeSupplierDetails" className="text-sm">
                  Include supplier details
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeItemBreakdown"
                  checked={options.includeItemBreakdown}
                  onCheckedChange={(checked) =>
                    updateOption("includeItemBreakdown", !!checked)
                  }
                />
                <Label htmlFor="includeItemBreakdown" className="text-sm">
                  Include material item breakdown
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSpecialInstructions"
                  checked={options.includeSpecialInstructions}
                  onCheckedChange={(checked) =>
                    updateOption("includeSpecialInstructions", !!checked)
                  }
                />
                <Label htmlFor="includeSpecialInstructions" className="text-sm">
                  Include special instructions
                </Label>
              </div>
            </div>
          </div>

          {/* Preview Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PO Number:</span>
                  <span className="font-medium">{purchaseOrder.poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total items:</span>
                  <span>{purchaseOrder.materialList.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total cost:</span>
                  <span className="font-medium">
                    {formatAmount(purchaseOrder.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File name:</span>
                  <span className="text-xs font-mono">
                    {generateFileName()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Download className="mr-2 h-4 w-4" />
              Export {options.format.toUpperCase()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
