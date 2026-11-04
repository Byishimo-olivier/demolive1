import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Subcontractor } from '@/lib/subcontractor-api';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Props {
  subcontractor: Subcontractor | null;
  onOpenChange: (open: boolean) => void;
}

/** A subcontractor's bill of quantities, read-only, with an Excel download */
export function SubcontractorBoqDialog({ subcontractor, onOpenChange }: Props) {
  const { formatAmount } = useCurrency();
  const items = subcontractor?.boqItems ?? [];
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const download = () => {
    if (!subcontractor) return;
    const rows: Record<string, string | number>[] = items.map((item, index) => ({
      'No.': item.itemNo || index + 1,
      Description: item.description,
      Unit: item.unit ?? '',
      Quantity: item.quantity,
      'Rate (RWF)': item.rate,
      'Amount (RWF)': item.amount,
    }));
    rows.push({ 'No.': '', Description: 'Total', Unit: '', Quantity: '', 'Rate (RWF)': '', 'Amount (RWF)': total });
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [{ wch: 6 }, { wch: 50 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'BoQ');
    XLSX.writeFile(book, `BoQ - ${subcontractor.name}.xlsx`);
  };

  return (
    <Dialog open={!!subcontractor} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>BoQ · {subcontractor?.name}</DialogTitle>
          <p className="text-sm text-gray-500">{subcontractor?.trade}</p>
        </DialogHeader>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-600">
              <tr>
                <th className="px-3 py-2">No.</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2 text-right">Quantity</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item._id ?? index} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-500">{item.itemNo || index + 1}</td>
                  <td className="px-3 py-2 text-gray-900">{item.description}</td>
                  <td className="px-3 py-2 text-gray-700">{item.unit || '—'}</td>
                  <td className="px-3 py-2 text-right">{item.quantity.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{formatAmount(item.rate)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900">{formatAmount(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={5} className="px-3 py-2 text-right font-medium text-gray-700">
                  Total
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-gray-900">{formatAmount(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={download}>
            <Download className="mr-2 h-4 w-4" />
            Download Excel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
