import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usersApi, AdminStatsResponse } from '@/lib/users-api';
import { formatBytes } from '@/utils/formatters';
import { Input } from '@/components/ui/input';
import { Loader2, Database, FileText, Users, Building, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [companySortConfig, setCompanySortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const { data: rawData, isLoading: loading, error } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      try {
        const res = await usersApi.getAdminStats();
        return res.data || [];
      } catch (err) {
        toast.error('Failed to load admin stats');
        throw err;
      }
    }
  });

  const data = rawData || [];

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleCompanySort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (companySortConfig && companySortConfig.key === key && companySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setCompanySortConfig({ key, direction });
  };

  const filteredData = data.filter((user) => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const valA = (a as Record<string, unknown>)[key] as string | number;
    const valB = (b as Record<string, unknown>)[key] as string | number;
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const allCompanies = data.flatMap(user => 
    (user.companies || []).map(comp => ({
      ...comp,
      ownerName: user.fullName,
      ownerEmail: user.email
    }))
  );

  const filteredCompanies = allCompanies.filter(comp =>
    comp.name?.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
    comp.ownerName?.toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    if (!companySortConfig) return 0;
    const { key, direction } = companySortConfig;
    const valA = (a as Record<string, unknown>)[key] as string | number;
    const valB = (b as Record<string, unknown>)[key] as string | number;
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalStorage = data.reduce((sum, user) => sum + (user.totalStorageUsed || 0), 0);
  const totalDocs = data.reduce((sum, user) => sum + (user.documentCount || 0), 0);
  const totalUsers = data.length;
  const totalCompanies = data.reduce((sum, user) => sum + (user.companyCount || 0), 0);

  // Helper variables for KPI UI
  const kpis = [
    { label: 'Total Platform Storage', value: formatBytes(totalStorage), icon: Database, color: 'text-blue-600' },
    { label: 'Total Documents', value: totalDocs, icon: FileText, color: 'text-purple-600' },
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-green-600' },
    { label: 'Total Companies', value: totalCompanies, icon: Building, color: 'text-orange-600' }
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Tracking Dashboard</h1>
        <p className="text-gray-500">System overview and resource management.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{kpi.value}</p>
                </div>
                <div className="rounded-full bg-gray-50 p-3">
                  <kpi.icon className={cn("h-6 w-6", kpi.color)} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">User Resources</CardTitle>
              <div className="w-1/3 min-w-[200px]">
                <Input 
                  placeholder="Search by name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 font-medium">
                    <tr>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('fullName')}>User Info {sortConfig?.key === 'fullName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('plan')}>Plan & Sub {sortConfig?.key === 'plan' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('totalStorageUsed')}>Storage Used {sortConfig?.key === 'totalStorageUsed' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('documentCount')}>Documents {sortConfig?.key === 'documentCount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('companyCount')}>Workspaces {sortConfig?.key === 'companyCount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedData.map((user) => {
                      const storageAlert = user.totalStorageUsed > 10 * 1024 * 1024 * 1024; // example alert threshold at 10GB
                      const subAlert = user.subscriptionStatus === 'failed' || user.subscriptionStatus === 'unpaid' || user.subscriptionStatus === 'inactive' || user.subscriptionStatus === 'expired';
                      
                      return (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{user.fullName}</div>
                            <div className="text-gray-500 text-xs">{user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={cn("px-2 py-0.5 rounded text-xs font-semibold capitalize", 
                                user.plan === 'Pro' || user.plan === 'Professional' || user.plan === 'Premium' ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-700")}>
                                {user.plan || 'Free'}
                              </span>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] capitalize", 
                                subAlert ? "bg-red-100 text-red-600 font-bold" : "bg-green-100 text-green-700")}>
                                {user.subscriptionStatus || 'Active'}
                              </span>
                            </div>
                          </td>
                          <td className={cn("px-4 py-3", storageAlert ? "bg-red-50 text-red-700 font-semibold" : "")}>
                            {formatBytes(user.totalStorageUsed)}
                            {storageAlert && <AlertCircle className="inline-block w-4 h-4 ml-1 text-red-500" />}
                          </td>
                          <td className="px-4 py-3">{user.documentCount}</td>
                          <td className="px-4 py-3 group relative cursor-help">
                            {user.companyCount}
                            {user.companies?.length > 0 && (
                              <div className="absolute left-10 top-0 z-10 hidden w-48 rounded bg-gray-900 text-white p-2 text-xs shadow-lg group-hover:block">
                                <ul className="space-y-1">
                                  {user.companies.map((c, i) => (
                                    <li key={i}><span className="font-semibold">{c.name}</span> ({c.teamMemberCount} members)</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {sortedData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Registered Companies</CardTitle>
              <div className="w-1/3 min-w-[200px]">
                <Input 
                  placeholder="Search by company or owner name..." 
                  value={companySearchTerm}
                  onChange={(e) => setCompanySearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 font-medium">
                    <tr>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleCompanySort('name')}>Company {companySortConfig?.key === 'name' ? (companySortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleCompanySort('ownerName')}>Owner {companySortConfig?.key === 'ownerName' ? (companySortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleCompanySort('type')}>Type {companySortConfig?.key === 'type' ? (companySortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleCompanySort('plan')}>Plan & Sub {companySortConfig?.key === 'plan' ? (companySortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="px-4 py-3 cursor-pointer" onClick={() => handleCompanySort('teamMemberCount')}>Team Members {companySortConfig?.key === 'teamMemberCount' ? (companySortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedCompanies.map((comp) => {
                      const subAlert = comp.subscriptionStatus === 'inactive' || comp.subscriptionStatus === 'expired' || comp.subscriptionStatus === 'failed';
                      
                      return (
                        <tr key={comp._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{comp.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{comp.ownerName}</div>
                            <div className="text-gray-500 text-xs">{comp.ownerEmail}</div>
                          </td>
                          <td className="px-4 py-3">{comp.type || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={cn("px-2 py-0.5 rounded text-xs font-semibold capitalize", 
                                comp.plan === 'professional' || comp.plan === 'premium' ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-700")}>
                                {comp.plan || 'Free'}
                              </span>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] capitalize", 
                                subAlert ? "bg-red-100 text-red-600 font-bold" : "bg-green-100 text-green-700")}>
                                {comp.subscriptionStatus || 'Active'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {comp.teamMemberCount}
                          </td>
                        </tr>
                      )
                    })}
                    {sortedCompanies.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No companies found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
