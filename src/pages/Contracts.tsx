import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ContractFolderForm } from '@/components/contracts/ContractFolderForm';
import { GuaranteeFolderForm } from '@/components/contracts/GuaranteeFolderForm';
import { FileText, Shield, Plus, ArrowRight, Calendar, DollarSign, Building2, CheckCircle2 } from 'lucide-react';

export function Contracts() {
  const [isContractFormOpen, setIsContractFormOpen] = useState(false);
  const [isGuaranteeFormOpen, setIsGuaranteeFormOpen] = useState(false);

  const contractCards = [
    {
      title: 'Contract Folders',
      description: 'Manage contracts and related documents',
      icon: FileText,
      color: 'bg-blue-500',
      stats: [
        { label: 'Total', value: '24' },
        { label: 'Active', value: '18' },
        { label: 'Expiring Soon', value: '3' },
        { label: 'Expired', value: '3' }
      ],
      onClick: () => setIsContractFormOpen(true),
    },
    {
      title: 'Guarantee Folders',
      description: 'Track guarantees and bank documents',
      icon: Shield,
      color: 'bg-green-500',
      stats: [
        { label: 'Total', value: '15' },
        { label: 'Active', value: '12' },
        { label: 'Expiring Soon', value: '2' },
        { label: 'Released', value: '1' }
      ],
      onClick: () => setIsGuaranteeFormOpen(true),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-500 mt-1">
            Manage contracts and guarantees
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {contractCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`${card.color} p-3 rounded-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {card.description}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    {card.stats.map((stat, idx) => (
                      <div key={idx} className="text-center p-3">
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-sm text-gray-600">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <Button
                    className="w-full"
                    onClick={card.onClick}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ContractFolderForm
        open={isContractFormOpen}
        onOpenChange={setIsContractFormOpen}
        contract={null}
        onSuccess={() => {}}
      />

      <GuaranteeFolderForm
        open={isGuaranteeFormOpen}
        onOpenChange={setIsGuaranteeFormOpen}
        guarantee={null}
        onSuccess={() => {}}
      />
    </div>
  );
}
