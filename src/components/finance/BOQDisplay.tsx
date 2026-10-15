import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type BoQ } from '@/lib/finance-api';
import { Calculator, Edit, Trash2, FileText } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface BOQDisplayProps {
  boq: BoQ;
  onEdit: () => void;
  onDelete: () => void;
}

export function BOQDisplay({ boq, onEdit, onDelete }: BOQDisplayProps) {
  const { formatAmount } = useCurrency();
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bill of Quantities
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(boq.createdAt).toLocaleDateString()} | 
                Last updated: {new Date(boq.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right mr-4">
                <div className="text-2xl font-bold text-green-600">
                  {formatAmount(boq.grandTotal)}
                </div>
                <div className="text-sm text-muted-foreground">Grand Total</div>
              </div>
              <Button onClick={onEdit} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button onClick={onDelete} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {boq.sections.map((section, sectionIndex) => (
          <Card key={section._id || sectionIndex} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm">
                    {section.sectionName}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calculator className="h-4 w-4" />
                    Subtotal: {formatAmount(section.subTotal || 0)}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 text-sm font-medium text-muted-foreground w-2/5">Description</th>
                      <th className="py-2 text-sm font-medium text-muted-foreground text-center">Unit</th>
                      <th className="py-2 text-sm font-medium text-muted-foreground text-right">Quantity</th>
                      <th className="py-2 text-sm font-medium text-muted-foreground text-right">Rate</th>
                      <th className="py-2 text-sm font-medium text-muted-foreground text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, itemIndex) => (
                      <tr key={item._id || itemIndex} className="border-b last:border-b-0">
                        <td className="py-3 text-sm">
                          <div className="max-w-xs">
                            {item.description}
                          </div>
                        </td>
                        <td className="py-3 text-sm text-center">
                          <Badge variant="outline" className="text-xs">
                            {item.unit}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm text-right font-mono">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="py-3 text-sm text-right font-mono">
                          {formatAmount(item.rate)}
                        </td>
                        <td className="py-3 text-sm text-right font-mono font-medium">
                          {formatAmount(item.amount || (item.quantity * item.rate))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-t-2">
                      <td colSpan={4} className="py-3 text-sm font-medium text-right">
                        Section Total:
                      </td>
                      <td className="py-3 text-sm font-bold text-right">
                        {formatAmount(section.subTotal || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Project Total</h3>
              <p className="text-sm text-muted-foreground">
                {boq.sections.length} section{boq.sections.length !== 1 ? 's' : ''} • {' '}
                {boq.sections.reduce((total, section) => total + section.items.length, 0)} total items
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                {formatAmount(boq.grandTotal)}
              </div>
              <div className="text-sm text-muted-foreground">Grand Total</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
