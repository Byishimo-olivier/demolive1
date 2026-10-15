import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { type BoQ } from '@/lib/finance-api';
import { Download, FileText, FileSpreadsheet, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BOQExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boq: BoQ;
}

type ExportFormat = 'pdf' | 'excel' | 'csv';

interface ExportOptions {
  format: ExportFormat;
  includeTotals: boolean;
  groupBySections: boolean;
}

export function BOQExport({ open, onOpenChange, boq }: BOQExportProps) {
  const { currency, formatAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeTotals: true,
    groupBySections: true,
  });

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const generateFileName = () => {
    const projectName = boq.projectId || 'project';
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = options.format === 'excel' ? 'xlsx' : options.format;
    return `BOQ_${projectName}_${timestamp}.${extension}`;
  };

  const exportToCSV = () => {
    const headers = ['Section', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount'];
    const rows: string[][] = [headers];

    boq.sections.forEach(section => {
      section.items.forEach(item => {
        const row = [
          section.sectionName,
          `"${item.description.replace(/"/g, '""')}"`, // Escape quotes in CSV
          item.unit,
          item.quantity.toString(),
          formatAmount(item.rate),
          formatAmount(item.amount || (item.quantity * item.rate))
        ];

        rows.push(row);
      });

      if (options.includeTotals) {
        const totalRow = ['', 'Section Total', '', '', '', formatAmount(section.subTotal || 0)];
        rows.push(totalRow);
      }
    });

    if (options.includeTotals) {
      const grandTotalRow = ['', 'Grand Total', '', '', '', formatAmount(boq.grandTotal)];
      rows.push(grandTotalRow);
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

  const exportToPDF = () => {
    try {
      console.log('Starting PDF export...');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPosition = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill of Quantities', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Project: ${boq.projectId}`, margin, yPosition);
      
      yPosition += 8;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
      
      yPosition += 15;

      // Table data preparation
      const tableData: any[][] = [];
      let grandTotal = 0;

      boq.sections.forEach((section, sectionIndex) => {
        if (options.groupBySections && sectionIndex > 0) {
          // Add spacing between sections
          tableData.push(['', '', '', '', '', '']);
        }

        section.items.forEach(item => {
          const amount = item.amount || (item.quantity * item.rate);
          tableData.push([
            options.groupBySections ? section.sectionName : section.sectionName,
            item.description,
            item.unit,
            item.quantity.toLocaleString(),
            formatAmount(item.rate),
            formatAmount(amount)
          ]);
        });

        if (options.includeTotals && options.groupBySections) {
          const sectionTotal = section.subTotal || 0;
          tableData.push([
            '',
            { content: 'Section Total', styles: { fontStyle: 'bold' } },
            '',
            '',
            '',
            { content: formatAmount(sectionTotal), styles: { fontStyle: 'bold' } }
          ]);
          grandTotal += sectionTotal;
        }
      });

      if (options.includeTotals) {
        // Add grand total row
        tableData.push([
          '',
          { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
          '',
          '',
          '',
          { content: formatAmount(boq.grandTotal), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }
        ]);
      }

      console.log('Table data prepared:', tableData.length, 'rows');

      // Generate table
      autoTable(doc, {
        head: [['Section', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount']],
        body: tableData,
        startY: yPosition,
        theme: 'striped',
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Section
          1: { cellWidth: 60 }, // Description
          2: { cellWidth: 15 }, // Unit
          3: { cellWidth: 20, halign: 'right' }, // Quantity
          4: { cellWidth: 25, halign: 'right' }, // Rate
          5: { cellWidth: 30, halign: 'right' }, // Amount
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          // Add page numbers
          const pageCount = doc.getNumberOfPages();
          const currentPage = doc.getCurrentPageInfo().pageNumber;
          doc.setFontSize(10);
          doc.text(
            `Page ${currentPage} of ${pageCount}`,
            pageWidth - margin,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
          );
        }
      });

      console.log('AutoTable generated successfully');
      doc.save(generateFileName());
      console.log('PDF saved successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      throw error;
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (options.groupBySections) {
      // Create separate worksheets for each section
      boq.sections.forEach((section, index) => {
        const worksheetData: any[][] = [];
        
        // Add headers
        worksheetData.push(['Description', 'Unit', 'Quantity', 'Rate', 'Amount']);
        
        // Add section items
        section.items.forEach(item => {
          const amount = item.amount || (item.quantity * item.rate);
          worksheetData.push([
            item.description,
            item.unit,
            item.quantity,
            item.rate,
            amount
          ]);
        });

        // Add section total if enabled
        if (options.includeTotals) {
          worksheetData.push(['', '', '', 'Section Total:', section.subTotal || 0]);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Set column widths
        worksheet['!cols'] = [
          { wch: 40 }, // Description
          { wch: 10 }, // Unit
          { wch: 12 }, // Quantity
          { wch: 15 }, // Rate
          { wch: 15 }, // Amount
        ];

        // Style headers
        const headerStyle = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "428BCA" } },
          alignment: { horizontal: "center" }
        };

        // Apply header styling
        ['A1', 'B1', 'C1', 'D1', 'E1'].forEach(cell => {
          if (!worksheet[cell]) worksheet[cell] = { t: 's', v: '' };
          worksheet[cell].s = headerStyle;
        });

        // Add currency formatting to Rate and Amount columns
        const currencyFormat = currency === 'USD' ? '"$"#,##0.00' : '"RWF "#,##0';
        section.items.forEach((_, itemIndex) => {
          const rowNum = itemIndex + 2; // +2 because of header and 0-based index
          
          // Format Rate column (D)
          const rateCell = `D${rowNum}`;
          if (!worksheet[rateCell]) worksheet[rateCell] = { t: 'n', v: 0 };
          worksheet[rateCell].z = currencyFormat;
          
          // Format Amount column (E)
          const amountCell = `E${rowNum}`;
          if (!worksheet[amountCell]) worksheet[amountCell] = { t: 'n', v: 0 };
          worksheet[amountCell].z = currencyFormat;
        });

        const sheetName = section.sectionName.replace(/[[\]\\\/\?*:]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Add summary sheet if totals are included
      if (options.includeTotals) {
        const summaryData: any[][] = [];
        summaryData.push(['Section', 'Total Amount']);
        
        boq.sections.forEach(section => {
          summaryData.push([section.sectionName, section.subTotal || 0]);
        });
        
        summaryData.push(['GRAND TOTAL', boq.grandTotal]);

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
        
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      }
    } else {
      // Single worksheet with all data
      const worksheetData: any[][] = [];
      
      // Add headers
      worksheetData.push(['Section', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount']);
      
      // Add all items
      boq.sections.forEach(section => {
        section.items.forEach(item => {
          const amount = item.amount || (item.quantity * item.rate);
          worksheetData.push([
            section.sectionName,
            item.description,
            item.unit,
            item.quantity,
            item.rate,
            amount
          ]);
        });

        // Add section totals if enabled
        if (options.includeTotals) {
          worksheetData.push([
            '',
            'Section Total',
            '',
            '',
            '',
            section.subTotal || 0
          ]);
        }
      });

      // Add grand total if enabled
      if (options.includeTotals) {
        worksheetData.push([
          '',
          'GRAND TOTAL',
          '',
          '',
          '',
          boq.grandTotal
        ]);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 20 }, // Section
        { wch: 40 }, // Description
        { wch: 10 }, // Unit
        { wch: 12 }, // Quantity
        { wch: 15 }, // Rate
        { wch: 15 }, // Amount
      ];

      // Style headers
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "428BCA" } },
        alignment: { horizontal: "center" }
      };

      ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(cell => {
        if (!worksheet[cell]) worksheet[cell] = { t: 's', v: '' };
        worksheet[cell].s = headerStyle;
      });

      XLSX.utils.book_append_sheet(workbook, worksheet, 'BOQ');
    }

    // Save the file
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

      toast.success(`BOQ exported successfully as ${options.format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export BOQ');
    } finally {
      setLoading(false);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return 'Professional formatted document';
      case 'excel':
        return 'Spreadsheet with formulas and formatting';
      case 'csv':
        return 'Simple comma-separated values file';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export BOQ
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
                  id="includeTotals"
                  checked={options.includeTotals}
                  onCheckedChange={(checked) => updateOption('includeTotals', !!checked)}
                />
                <Label htmlFor="includeTotals" className="text-sm">
                  Include section totals and grand total
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="groupBySections"
                  checked={options.groupBySections}
                  onCheckedChange={(checked) => updateOption('groupBySections', !!checked)}
                />
                <Label htmlFor="groupBySections" className="text-sm">
                  Group items by sections
                </Label>
              </div>
            </div>
          </div>

          {/* Preview Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total sections:</span>
                  <span>{boq.sections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total items:</span>
                  <span>{boq.sections.reduce((total, section) => total + section.items.length, 0)}</span>
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
