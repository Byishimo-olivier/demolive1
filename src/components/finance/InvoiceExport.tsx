import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, FileSpreadsheet, X, Loader2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '@/lib/finance-api';
import { InvoiceStatus, InvoiceType } from '@/types';

interface InvoiceExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}

type ExportFormat = 'pdf' | 'excel' | 'csv';

interface ExportOptions {
  format: ExportFormat;
  includePaymentDetails: boolean;
  includeWorkPeriod: boolean;
  includeItemBreakdown: boolean;
}

export function InvoiceExport({ open, onOpenChange, invoice }: InvoiceExportProps) {
  const { currency, formatAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    includePaymentDetails: true,
    includeWorkPeriod: true,
    includeItemBreakdown: true,
  });

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const generateFileName = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = options.format === 'excel' ? 'xlsx' : options.format;
    return `Invoice_${invoice.invoiceNumber}_${timestamp}.${extension}`;
  };

  const exportToCSV = () => {
    const headers = invoice.type === InvoiceType.BOQ_BASED
      ? ['BOQ Item', 'Quantity', 'Rate', 'Amount']
      : ['Description', 'Quantity', 'Rate', 'Amount'];
    const rows: string[][] = [headers];

    // Add invoice header info
    rows.push(['Invoice Number:', invoice.invoiceNumber, '', '']);
    rows.push(['Type:', invoice.type, '', '']);
    rows.push(['Status:', invoice.status, '', '']);
    rows.push(['Issued:', issuedOn(), '', '']);
    rows.push(['Due:', new Date(invoice.dueDate).toLocaleDateString(), '', '']);
    rows.push(['', '', '', '']);

    if (options.includeWorkPeriod) {
      rows.push(['Work Period:', '', '', '']);
      rows.push(['Start:', new Date(invoice.workPeriod.start).toLocaleDateString(), '', '']);
      rows.push(['End:', new Date(invoice.workPeriod.end).toLocaleDateString(), '', '']);
      rows.push(['', '', '', '']);
    }

    // Add invoice items
    rows.push(headers);
    invoice.invoiceItems.forEach(item => {
      const description = itemDescription(item);

      const quantity = item.claimedQuantity || item.quantity || 0;
      const rate = item.rate || item.unitPrice || 0;

      rows.push([
        `"${description.replace(/"/g, '""')}"`,
        quantity.toString(),
        rate.toString(),
        item.amount.toString()
      ]);
    });

    // Add total
    rows.push(['', '', 'Total Amount:', (invoice.totalAmount || 0).toString()]);
    rows.push(['', '', 'Amount Paid:', (amountPaid() || 0).toString()]);
    rows.push(['', '', 'Balance:', ((invoice.totalAmount || 0) - (amountPaid() || 0)).toString()]);

    if (options.includePaymentDetails) {
      rows.push(['', '', '', '']);
      rows.push(['Payment Details:', '', '', '']);
      rows.push(['Terms:', invoice.paymentTerms, '', '']);
      rows.push(['Account:', invoice.paymentDetails.accountNumber, '', '']);
      rows.push(['Bank:', invoice.paymentDetails.bankName, '', '']);
    }

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // What a line is for: BoQ lines carry the item's description
  function itemDescription(item: { description?: string; boqItemId?: unknown }): string {
    if (item.description) return item.description;
    const ref = item.boqItemId as { description?: string } | string | undefined;
    return (ref && typeof ref === 'object' && ref.description) || (invoice.type === InvoiceType.BOQ_BASED ? 'BoQ item' : '');
  }

  // Invoices are paid in full: the whole total once marked paid
  const amountPaid = () => (invoice.status === InvoiceStatus.PAID ? invoice.totalAmount || 0 : 0);

  const issuedOn = () => new Date((invoice as any).invoiceDate || invoice.createdAt).toLocaleDateString();

  const buildPDF = () => {
    {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });

      yPos += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      // Invoice Details
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, margin, yPos);
      yPos += 7;
      doc.text(`Type: ${invoice.type}`, margin, yPos);
      yPos += 7;
      doc.text(`Status: ${invoice.status.toUpperCase()}`, margin, yPos);
      yPos += 7;
      doc.text(`Issued: ${issuedOn()}`, margin, yPos);
      yPos += 7;
      doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, margin, yPos);

      // Work Period
      if (options.includeWorkPeriod) {
        yPos += 12;
        doc.setFont('helvetica', 'bold');
        doc.text('Work Period:', margin, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        doc.text(`${new Date(invoice.workPeriod.start).toLocaleDateString()} - ${new Date(invoice.workPeriod.end).toLocaleDateString()}`, margin, yPos);
      }

      yPos += 12;

      // Invoice Items Table
      if (options.includeItemBreakdown) {
        const tableData = invoice.invoiceItems.map(item => {
          const description = itemDescription(item);

          const quantity = item.claimedQuantity || item.quantity || 0;
          const rate = item.rate || item.unitPrice || 0;

          return [
            description,
            quantity.toLocaleString(),
            formatAmount(rate),
            formatAmount(item.amount)
          ];
        });

        const headers = invoice.type === InvoiceType.BOQ_BASED
          ? ['BOQ Item', 'Quantity', 'Rate', 'Amount']
          : ['Description', 'Quantity', 'Rate', 'Amount'];

        autoTable(doc, {
          startY: yPos,
          head: [headers],
          body: tableData,
          foot: [
            [
              '',
              '',
              { content: 'Total Amount:', styles: { fontStyle: 'bold' } },
              { content: formatAmount(invoice.totalAmount || 0), styles: { fontStyle: 'bold' } }
            ],
            [
              '',
              '',
              { content: 'Amount Paid:', styles: { fontStyle: 'bold' } },
              { content: formatAmount(amountPaid() || 0), styles: { fontStyle: 'bold' } }
            ],
            [
              '',
              '',
              { content: 'Balance:', styles: { fontStyle: 'bold' } },
              { content: formatAmount((invoice.totalAmount || 0) - (amountPaid() || 0)), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
            ]
          ],
          theme: 'grid',
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontStyle: 'bold'
          },
          footStyles: {
            fillColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 9,
            cellPadding: 4,
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 25, halign: 'right' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
          },
          margin: { left: margin, right: margin },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Payment Details
      if (options.includePaymentDetails) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Details:', margin, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        doc.text(`Terms: ${invoice.paymentTerms}`, margin, yPos);
        yPos += 7;
        doc.text(`Account: ${invoice.paymentDetails.accountNumber}`, margin, yPos);
        yPos += 7;
        doc.text(`Bank: ${invoice.paymentDetails.bankName}`, margin, yPos);
        if (invoice.paymentDetails.swiftCode) {
          yPos += 7;
          doc.text(`SWIFT: ${invoice.paymentDetails.swiftCode}`, margin, yPos);
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }

      return doc;
    }
  };

  const exportToPDF = () => {
    buildPDF().save(generateFileName());
  };

  // Open the PDF with the browser's print dialog
  const printInvoice = () => {
    const doc = buildPDF();
    doc.autoPrint();
    const url = doc.output('bloburl');
    const win = window.open(url, '_blank');
    if (!win) {
      toast.error('Allow pop-ups for this site to print, or download the PDF instead');
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData: any[][] = [];

    // Invoice Header
    worksheetData.push(['INVOICE']);
    worksheetData.push([]);
    worksheetData.push(['Invoice Number:', invoice.invoiceNumber]);
    worksheetData.push(['Type:', invoice.type]);
    worksheetData.push(['Status:', invoice.status]);
    worksheetData.push(['Issued:', issuedOn()]);
    worksheetData.push(['Due:', new Date(invoice.dueDate).toLocaleDateString()]);
    worksheetData.push([]);

    if (options.includeWorkPeriod) {
      worksheetData.push(['Work Period:']);
      worksheetData.push(['Start:', new Date(invoice.workPeriod.start).toLocaleDateString()]);
      worksheetData.push(['End:', new Date(invoice.workPeriod.end).toLocaleDateString()]);
      worksheetData.push([]);
    }

    if (options.includeItemBreakdown) {
      // Headers
      const headers = invoice.type === InvoiceType.BOQ_BASED
        ? ['BOQ Item', 'Quantity', 'Rate', 'Amount']
        : ['Description', 'Quantity', 'Rate', 'Amount'];
      worksheetData.push(headers);

      // Items
      invoice.invoiceItems.forEach(item => {
        const description = itemDescription(item);

        const quantity = item.claimedQuantity || item.quantity || 0;
        const rate = item.rate || item.unitPrice || 0;

        worksheetData.push([
          description,
          quantity,
          rate,
          item.amount
        ]);
      });

      // Totals
      worksheetData.push(['', '', 'Total Amount:', invoice.totalAmount || 0]);
      worksheetData.push(['', '', 'Amount Paid:', amountPaid() || 0]);
      worksheetData.push(['', '', 'Balance:', (invoice.totalAmount || 0) - (amountPaid() || 0)]);
      worksheetData.push([]);
    }

    if (options.includePaymentDetails) {
      worksheetData.push(['Payment Details:']);
      worksheetData.push(['Terms:', invoice.paymentTerms]);
      worksheetData.push(['Account:', invoice.paymentDetails.accountNumber]);
      worksheetData.push(['Bank:', invoice.paymentDetails.bankName]);
      if (invoice.paymentDetails.swiftCode) {
        worksheetData.push(['SWIFT:', invoice.paymentDetails.swiftCode]);
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 50 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];

    // Style header
    const headerStyle = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: "center" }
    };
    if (worksheet['A1']) worksheet['A1'].s = headerStyle;

    // Format currency cells
    const currencyFormat = currency === 'USD' ? '"$"#,##0.00' : '"RWF "#,##0';
    const startRow = 10 + (options.includeWorkPeriod ? 4 : 0);
    invoice.invoiceItems.forEach((_, idx) => {
      const rowNum = startRow + idx;
      const rateCell = `C${rowNum}`;
      const amountCell = `D${rowNum}`;

      if (worksheet[rateCell]) worksheet[rateCell].z = currencyFormat;
      if (worksheet[amountCell]) worksheet[amountCell].z = currencyFormat;
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');
    XLSX.writeFile(workbook, generateFileName());
  };

  const handleExport = async () => {
    try {
      setLoading(true);

      switch (options.format) {
        case 'csv':
          exportToCSV();
          break;
        case 'pdf':
          exportToPDF();
          break;
        case 'excel':
          exportToExcel();
          break;
      }

      toast.success(`Invoice exported successfully as ${options.format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export invoice');
    } finally {
      setLoading(false);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return 'Professional formatted document';
      case 'excel':
        return 'Spreadsheet with formulas';
      case 'csv':
        return 'Simple comma-separated file';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <div className="space-y-2">
              {(['pdf', 'excel', 'csv'] as ExportFormat[]).map((format) => (
                <div
                  key={format}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    options.format === format
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => updateOption('format', format)}
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
                  id="includeWorkPeriod"
                  checked={options.includeWorkPeriod}
                  onCheckedChange={(checked) => updateOption('includeWorkPeriod', !!checked)}
                />
                <Label htmlFor="includeWorkPeriod" className="text-sm">
                  Include work period
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeItemBreakdown"
                  checked={options.includeItemBreakdown}
                  onCheckedChange={(checked) => updateOption('includeItemBreakdown', !!checked)}
                />
                <Label htmlFor="includeItemBreakdown" className="text-sm">
                  Include item breakdown
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePaymentDetails"
                  checked={options.includePaymentDetails}
                  onCheckedChange={(checked) => updateOption('includePaymentDetails', !!checked)}
                />
                <Label htmlFor="includePaymentDetails" className="text-sm">
                  Include payment details
                </Label>
              </div>
            </div>
          </div>

          {/* Preview Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Number:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total items:</span>
                  <span>{invoice.invoiceItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{formatAmount(invoice.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="font-medium">{formatAmount((invoice.totalAmount || 0) - (amountPaid() || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File name:</span>
                  <span className="text-xs font-mono">{generateFileName()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                try {
                  printInvoice();
                } catch (error) {
                  console.error('Print error:', error);
                  toast.error('Failed to prepare the invoice for printing');
                }
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
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
