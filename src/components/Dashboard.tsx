import React, { useState } from 'react';
import { Truck, Users, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Document } from '../data';
import { format, parseISO } from 'date-fns';
import { useFleet } from '../store';

export default function Dashboard({ onViewAll }: { onViewAll: () => void }) {
  const { documents, renewDocument } = useFleet();
  
  const sortedDocs = [...documents].filter(d => d.daysUntilExpiry !== null).sort((a, b) => a.daysUntilExpiry! - b.daysUntilExpiry!);
  
  const totalTrucks = new Set(documents.filter(d => d.entityType === 'Truck').map(d => d.entityId)).size || 85;
  const totalDrivers = new Set(documents.filter(d => d.entityType === 'Driver').map(d => d.entityId)).size || 92;
  const validDocs = documents.filter(d => d.status === 'valid').length;
  const expiringSoonDocs = documents.filter(d => d.status === 'expiring_soon').length;
  const expiredDocs = documents.filter(d => d.status === 'expired').length;

  const summaryData = {
    totalTrucks,
    totalDrivers,
    documents: {
      total: documents.length,
      valid: validDocs,
      expiringSoon: expiringSoonDocs,
      expired: expiredDocs,
    }
  };

  const next14Days = documents.filter(d => d.daysUntilExpiry !== null && d.daysUntilExpiry >= 0 && d.daysUntilExpiry <= 14).length;
  const days15to30 = documents.filter(d => d.daysUntilExpiry !== null && d.daysUntilExpiry > 14 && d.daysUntilExpiry <= 30).length;

  // We show up to 10 urgent documents instead of 5
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Expiry Alerts</h1>
        <p className="text-neutral-400">Quickly identify which documents need your attention.</p>
      </div>

      {/* Primary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Trucks" 
          value={summaryData.totalTrucks} 
          icon={<Truck className="text-blue-500" />} 
          trend="Active"
        />
        <StatCard 
          title="Total Drivers" 
          value={summaryData.totalDrivers} 
          icon={<Users className="text-indigo-500" />} 
          trend="Active"
        />
        <StatCard 
          title="Valid Docs" 
          value={summaryData.documents.valid} 
          icon={<CheckCircle className="text-emerald-500" />} 
          subtitle={`out of ${summaryData.documents.total}`}
        />
        <StatCard 
          title="Action Needed" 
          value={summaryData.documents.expired + summaryData.documents.expiringSoon} 
          icon={<AlertCircle className="text-rose-500" />} 
          subtitle={`${summaryData.documents.expired} expired, ${summaryData.documents.expiringSoon} expiring`}
          alert={summaryData.documents.expired > 0 || summaryData.documents.expiringSoon > 0}
        />
      </div>

      {/* Most Urgent Table */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
        <div className="p-5 md:p-6 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold text-white flex items-center">
            <Clock className="w-5 h-5 mr-2 text-neutral-400" />
            Most Urgent Expiries
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-neutral-900/50 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-6 py-4 font-medium">Entity</th>
                <th className="px-6 py-4 font-medium">Document Type</th>
                <th className="px-6 py-4 font-medium">Expiry Date</th>
                <th className="px-6 py-4 font-medium">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {sortedDocs.slice(0, 15).map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onRenew={(id) => {
                  const input = prompt('Enter new expiry date (YYYY-MM-DD):', format(new Date(), 'yyyy-MM-dd'));
                  if (input && !isNaN(Date.parse(input))) {
                    renewDocument(id, new Date(input).toISOString());
                  } else if (input) {
                    alert('Invalid date format');
                  }
                }} />
              ))}
              {sortedDocs.length === 0 && (
                <tr>
                   <td colSpan={4} className="px-6 py-8 text-center text-neutral-500 text-sm">
                      No documents in the system.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle, trend, alert }: { title: string, value: string | number, icon: React.ReactNode, subtitle?: string, trend?: string, alert?: boolean }) {
  return (
    <div className={`p-6 bg-neutral-950 border rounded-xl flex flex-col ${alert ? 'border-rose-500/30 shadow-[0_0_15px_-3px_rgba(244,63,94,0.1)]' : 'border-neutral-800'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
          {icon}
        </div>
        {trend && <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">{trend}</span>}
      </div>
      <div>
        <h4 className="text-neutral-400 text-sm font-medium mb-1">{title}</h4>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        {subtitle && <p className={`text-xs mt-2 ${alert ? 'text-rose-400 font-medium' : 'text-neutral-500'}`}>{subtitle}</p>}
      </div>
    </div>
  );
}

function DocumentRow({ doc, onRenew }: { doc: Document, onRenew: (id: string) => void }) {
  const hasNoExpiry = doc.daysUntilExpiry === null;
  const isExpired = !hasNoExpiry && doc.daysUntilExpiry! < 0;
  const isUrgent = !hasNoExpiry && doc.daysUntilExpiry! >= 0 && doc.daysUntilExpiry! <= 14;
  const isWarning = !hasNoExpiry && doc.daysUntilExpiry! > 14 && doc.daysUntilExpiry! <= 30;
  
  let statusColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  let statusText = "Valid";
  
  if (hasNoExpiry) {
    statusColor = "text-neutral-400 bg-neutral-500/10 border-neutral-500/20";
    statusText = "No Expiry";
  } else if (isExpired) {
    statusColor = "text-rose-400 bg-rose-400/10 border-rose-400/20";
    statusText = `Expired ${Math.abs(doc.daysUntilExpiry!)}d ago`;
  } else if (isUrgent) {
    statusColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
    statusText = `Expires in ${doc.daysUntilExpiry}d`;
  } else if (isWarning) {
    statusColor = "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    statusText = `Expires in ${doc.daysUntilExpiry}d`;
  }

  return (
    <tr className="hover:bg-neutral-800/20 transition-colors group">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className={`p-1.5 rounded-md mr-3 ${doc.entityType === 'Truck' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
            {doc.entityType === 'Truck' ? <Truck size={16} /> : <Users size={16} />}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{doc.entityName}</div>
            <div className="text-xs text-neutral-500">{doc.entityId}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-neutral-300 font-medium">{doc.type}</div>
        <div className="text-xs text-neutral-500">ID: {doc.id}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">
        {hasNoExpiry ? 'N/A' : doc.expiryDate ? format(parseISO(doc.expiryDate), 'MMM dd, yyyy') : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
            {statusText}
          </span>
          {!hasNoExpiry && (
            <button 
              onClick={() => onRenew(doc.id)} 
              className="opacity-0 group-hover:opacity-100 transition-opacity text-sm text-indigo-400 hover:text-indigo-300 font-medium ml-4 border border-indigo-500/30 px-3 py-1 rounded hover:bg-indigo-500/10 cursor-pointer"
            >
              Renew
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
