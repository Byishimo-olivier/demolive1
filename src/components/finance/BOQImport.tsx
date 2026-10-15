import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, X, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { financeApi, BoQCategory, type CreateOrUpdateBoQDTO } from '@/lib/finance-api';
import { UnitOfMeasurement } from '@/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

interface BOQImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

interface ParsedRow {
  section: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
}

export function BOQImport({ open, onOpenChange, projectId, onSuccess }: BOQImportProps) {
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please upload a valid Excel or CSV file');
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      setLoading(true);
      setErrors([]);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const allRows: ParsedRow[] = [];
      const parseErrors: string[] = [];

      // Process all sheets (for multi-section BOQs)
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip empty sheets
        if (jsonData.length === 0) return;

        // Find header row (look for "Description", "Quantity", "Rate", etc.)
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          if (Array.isArray(row) && row.some((cell) =>
            typeof cell === 'string' &&
            (cell.toLowerCase().includes('description') || cell.toLowerCase().includes('item'))
          )) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          if(sheetName === "Summary") {
            return;
          }
          parseErrors.push(`Sheet "${sheetName}": Could not find header row`);
          return;
        }

        const headers = jsonData[headerRowIndex].map((h: any) =>
          String(h || '').toLowerCase().trim()
        );

        // Find column indices
        const descCol = headers.findIndex((h) => h.includes('description') || h.includes('item'));
        const unitCol = headers.findIndex((h) => h.includes('unit'));
        const qtyCol = headers.findIndex((h) => h.includes('quantity') || h.includes('qty'));
        const rateCol = headers.findIndex((h) => h.includes('rate') || h.includes('price'));
        const sectionCol = headers.findIndex((h) => h.includes('section'));

        if (descCol === -1 || unitCol === -1 || qtyCol === -1 || rateCol === -1) {
          parseErrors.push(`Sheet "${sheetName}": Missing required columns (Description, Unit, Quantity, Rate)`);
          return;
        }

        // Parse data rows
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const description = String(row[descCol] || '').trim();

          // Skip rows without description or totals rows
          if (!description ||
              description.toLowerCase().includes('total') ||
              description.toLowerCase().includes('subtotal')) {
            continue;
          }

          const unit = String(row[unitCol] || '').trim();
          const quantity = parseFloat(row[qtyCol]) || 0;
          const rateValue = String(row[rateCol] || '').replace(/[$,]/g, '');
          const rate = parseFloat(rateValue) || 0;
          const section = sectionCol !== -1 ? String(row[sectionCol] || '').trim() : sheetName;

          if (quantity <= 0 || rate < 0) {
            parseErrors.push(`Row ${i + 1}: Invalid quantity or rate`);
            continue;
          }

          allRows.push({
            section,
            description,
            unit,
            quantity,
            rate
          });
        }
      });

      setParsedData(allRows);
      setErrors(parseErrors);

      if (allRows.length === 0) {
        toast.error('No valid data found in file');
      } else {
        toast.success(`Parsed ${allRows.length} items from file`);
      }
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error(getErrorMessage(error, 'Failed to parse file'));
      setErrors(['Failed to parse file. Please check the format.']);
    } finally {
      setLoading(false);
    }
  };

  const mapUnitOfMeasurement = (unit: string): UnitOfMeasurement => {
    const normalized = unit.toLowerCase().trim();
    const mapping: Record<string, UnitOfMeasurement> = {
      'm': UnitOfMeasurement.METER,
      'meter': UnitOfMeasurement.METER,
      'meters': UnitOfMeasurement.METER,
      'm²': UnitOfMeasurement.SQUARE_METER,
      'm2': UnitOfMeasurement.SQUARE_METER,
      'sqm': UnitOfMeasurement.SQUARE_METER,
      'm³': UnitOfMeasurement.CUBIC_METER,
      'm3': UnitOfMeasurement.CUBIC_METER,
      'cum': UnitOfMeasurement.CUBIC_METER,
      'kg': UnitOfMeasurement.KILOGRAM,
      'kilogram': UnitOfMeasurement.KILOGRAM,
      'l': UnitOfMeasurement.LITER,
      'liter': UnitOfMeasurement.LITER,
      'pc': UnitOfMeasurement.PIECE,
      'piece': UnitOfMeasurement.PIECE,
      'pcs': UnitOfMeasurement.PIECE,
      'unit': UnitOfMeasurement.UNIT,
      'ton': UnitOfMeasurement.TON,
      'hour': UnitOfMeasurement.HOUR,
      'day': UnitOfMeasurement.DAY,
      'week': UnitOfMeasurement.WEEK,
      'month': UnitOfMeasurement.MONTH,
      'bag': UnitOfMeasurement.BAG,
      'bundle': UnitOfMeasurement.BUNDLE,
      'set': UnitOfMeasurement.SET,
      'box': UnitOfMeasurement.BOX,
    };

    return mapping[normalized] || UnitOfMeasurement.UNIT;
  };

  const mapSectionName = (section: string): BoQCategory => {
    const normalized = section.toLowerCase().trim();

    if (normalized.includes('excavat')) return BoQCategory.EXCAVATION;
    if (normalized.includes('foundation')) return BoQCategory.FOUNDATION;
    if (normalized.includes('wall')) return BoQCategory.WALLING;
    if (normalized.includes('plaster')) return BoQCategory.PLASTERING;
    if (normalized.includes('paint')) return BoQCategory.PAINTING;
    if (normalized.includes('it') || normalized.includes('information')) return BoQCategory.IT;
    if (normalized.includes('mep') || normalized.includes('mechanical') || normalized.includes('electrical')) return BoQCategory.MEP;
    if (normalized.includes('landscape') || normalized.includes('garden')) return BoQCategory.LANDSCAPE;
    if (normalized.includes('general')) return BoQCategory.GENERAL;

    return BoQCategory.OTHER;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error(getErrorMessage(new Error('No data to import'), 'No data to import'));
      return;
    }

    try {
      setLoading(true);

      // Group by section
      const sectionMap = new Map<string, typeof parsedData>();
      parsedData.forEach((row) => {
        const existing = sectionMap.get(row.section) || [];
        existing.push(row);
        sectionMap.set(row.section, existing);
      });

      // Build BOQ structure
      const boqData: CreateOrUpdateBoQDTO = {
        projectId,
        sections: Array.from(sectionMap.entries()).map(([sectionName, rows]) => ({
          sectionName: mapSectionName(sectionName),
          items: rows.map((row) => ({
            description: row.description,
            unit: mapUnitOfMeasurement(row.unit),
            quantity: row.quantity,
            rate: row.rate,
          })),
        })),
      };

      await financeApi.createBoQ(boqData);
      toast.success('BOQ imported successfully');
      onSuccess();
      onOpenChange(false);

      // Reset state
      setFile(null);
      setParsedData([]);
      setErrors([]);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(getErrorMessage(error, 'Failed to import BOQ'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    onOpenChange(false);
  };

  const groupedData = parsedData.reduce((acc, row) => {
    if (!acc[row.section]) acc[row.section] = [];
    acc[row.section].push(row);
    return acc;
  }, {} as Record<string, ParsedRow[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import BOQ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-3">
            <Label>Upload File</Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={loading}
              />
              {file && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {file.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Supported formats: Excel (.xlsx, .xls) or CSV (.csv)
            </p>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Card className="border-yellow-500 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  Warnings ({errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-yellow-700">
                  {errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li className="font-medium">...and {errors.length - 5} more</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Preview ({parsedData.length} items in {Object.keys(groupedData).length} sections)
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {Object.entries(groupedData).map(([section, rows]) => (
                    <div key={section}>
                      <h4 className="font-medium mb-2">{section} ({rows.length} items)</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.slice(0, 3).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="max-w-xs truncate">{row.description}</TableCell>
                              <TableCell>{row.unit}</TableCell>
                              <TableCell className="text-right">{row.quantity.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{formatAmount(row.rate)}</TableCell>
                              <TableCell className="text-right">{formatAmount(row.quantity * row.rate)}</TableCell>
                            </TableRow>
                          ))}
                          {rows.length > 3 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                                ...and {rows.length - 3} more items
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={loading || parsedData.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Import BOQ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
