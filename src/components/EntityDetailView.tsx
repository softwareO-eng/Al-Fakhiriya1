import React, { useState, useRef } from 'react';
import { useFleet } from '../store';
import { Entity, Document } from '../data';
import { Truck, Users, Plus, ArrowLeft, Trash2, Edit2, ShieldAlert, UploadCloud, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface EntityDetailViewProps {
  entity: Entity;
  onBack: () => void;
}

export default function EntityDetailView({ entity, onBack }: EntityDetailViewProps) {
  const { documents, renewDocument, deleteDocument, addDocument, deleteEntity } = useFleet();
  const [isAdding, setIsAdding] = useState(false);
  const [scanProgress, setScanProgress] = useState<{current: number, total: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const entityDocs = documents
    .filter(d => d.entityId === entity.id)
    .sort((a, b) => {
      if (a.daysUntilExpiry === null) return 1; // push no-expiry to bottom
      if (b.daysUntilExpiry === null) return -1;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });

  const TRUCK_DOC_TYPES = [
    'Istamara (Vehicle Registration)',
    'Melem Card (Fuel / Toll)',
    '5th Wheel Expiry',
    'King Pin Expiry',
    'Safety Sticker',
    'Insurance',
    'MVDI (Inspection)'
  ];

  const DRIVER_DOC_TYPES = [
    'Driving Licence',
    'Medical Fitness Certificate',
    'HSE Certificate',
    'Driver Card',
    'Company ID',
    'Criminal Clearance Certificate'
  ];

  const suggestedTypes = entity.type === 'Truck' ? TRUCK_DOC_TYPES : DRIVER_DOC_TYPES;

  const [newType, setNewType] = useState(suggestedTypes[0]);
  const [isCustomType, setIsCustomType] = useState(false);
  const [customType, setCustomType] = useState('');
  const [newIssueDate, setNewIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newExpiryDate, setNewExpiryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hasExpiry, setHasExpiry] = useState(true);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;

    setScanProgress({ current: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setScanProgress({ current: i + 1, total: files.length });
      
      try {
        const reader = new FileReader();
        const base64data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        const response = await fetch('/api/extract-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64data,
            mimeType: file.type,
            entityType: entity.type
          })
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Extraction failed');
        }
        
        const data = await response.json();
        
        let finalType = 'Unknown Document';
        if (data.type) {
          const match = suggestedTypes.find(t => t.toLowerCase() === data.type.toLowerCase() || t.toLowerCase().includes(data.type.toLowerCase()));
          if (match) {
            finalType = match;
          } else {
            finalType = data.type;
          }
        }
        
        const issueDate = data.issueDate ? new Date(data.issueDate).toISOString() : new Date().toISOString();
        const hasExpiry = !data.hasNoExpiry && !!data.expiryDate;
        const expiryDate = hasExpiry ? new Date(data.expiryDate).toISOString() : null;
        
        addDocument({
          id: `DOC-${Math.floor(Math.random() * 10000)}`,
          name: `${entity.name} - ${finalType}`,
          type: finalType,
          entityId: entity.id,
          entityName: entity.name,
          entityType: entity.type,
          issueDate,
          expiryDate,
          status: hasExpiry ? 'valid' : 'no_expiry',
          daysUntilExpiry: hasExpiry ? 0 : null,
        } as Document);

      } catch (error: any) {
        console.error('OCR Error:', error);
        alert(`Failed to extract document data automatically for ${file.name}.`);
      }
    }

    setScanProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsAdding(false);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const typeToSave = isCustomType ? customType : newType;
    if (!typeToSave) return;

    const documentPayload: Document = {
      id: `DOC-${Math.floor(Math.random() * 10000)}`,
      name: `${entity.name} - ${typeToSave}`,
      type: typeToSave,
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      issueDate: newIssueDate ? new Date(newIssueDate).toISOString() : new Date().toISOString(),
      expiryDate: hasExpiry ? new Date(newExpiryDate).toISOString() : null,
      status: hasExpiry ? 'valid' : 'no_expiry',
      daysUntilExpiry: hasExpiry ? 0 : null,
    };

    addDocument(documentPayload);

    setIsAdding(false);
    setNewType(suggestedTypes[0]);
    setIsCustomType(false);
    setCustomType('');
    setHasExpiry(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-full bg-neutral-900">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center text-sm font-medium text-neutral-400 hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} className="mr-1" /> Back to {entity.type}s
          </button>
          <div className="flex items-center">
            <div className={`p-3 rounded-lg mr-4 ${entity.type === 'Truck' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
              {entity.type === 'Truck' ? <Truck size={28} /> : <Users size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white mb-1">{entity.name}</h1>
                <button 
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${entity.name}? All its documents will also be removed.`)) {
                      deleteEntity(entity.id);
                      onBack();
                    }
                  }}
                  className="p-1.5 text-neutral-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                  title={`Delete ${entity.type}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <span className="text-sm px-2 py-1 bg-neutral-800 text-neutral-300 rounded font-medium">ID: {entity.id}</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors cursor-pointer"
        >
          {isAdding ? 'Cancel' : <><Plus className="h-4 w-4 mr-2" /> Add Document</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 sm:p-6 mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Add Document for {entity.name}</h2>
            
            <div className="relative">
              <input 
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                className="hidden"
                id="doc-upload"
              />
              <label 
                htmlFor="doc-upload"
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                  scanProgress 
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' 
                    : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                {scanProgress ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> {scanProgress.current}/{scanProgress.total} Auto-Saving...</>
                ) : (
                  <><UploadCloud size={16} className="mr-2" /> Bulk Upload AI Scan</>
                )}
              </label>
            </div>
          </div>

          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className={`md:col-span-2 flex flex-col sm:flex-row gap-4`}>
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-400 mb-1">Document Type</label>
                <select 
                  value={isCustomType ? 'other' : newType}
                  onChange={(e) => {
                    if (e.target.value === 'other') {
                      setIsCustomType(true);
                      setNewType('');
                    } else {
                      setIsCustomType(false);
                      setNewType(e.target.value);
                    }
                  }}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {suggestedTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="other">Other (Custom)...</option>
                </select>
              </div>
              {isCustomType && (
                <div className="flex-1 animate-in fade-in">
                   <label className="block text-sm font-medium text-neutral-400 mb-1">Custom Name</label>
                   <input 
                    required
                    type="text" 
                    placeholder="Enter document name"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Issue Date (Optional)</label>
              <input 
                type="date" 
                value={newIssueDate}
                onChange={(e) => setNewIssueDate(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-neutral-400">Expiry Date</label>
                <label className="flex items-center text-xs text-neutral-500 cursor-pointer hover:text-white transition-colors">
                  <input type="checkbox" checked={!hasExpiry} onChange={() => setHasExpiry(!hasExpiry)} className="mr-1.5 accent-indigo-500" />
                  No Expiry
                </label>
              </div>
              <input 
                required={hasExpiry}
                disabled={!hasExpiry}
                type="date" 
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                className={`w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:invert ${!hasExpiry ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
            <div className="md:col-span-4 flex justify-end mt-2">
              <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors cursor-pointer">
                Save Document
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile styling for cards, desktop for table */}
      <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
        {entityDocs.length === 0 ? (
          <div className="p-12 pl-6 flex-1 flex flex-col items-center justify-center text-center text-neutral-500">
             <ShieldAlert className="h-10 w-10 mx-auto text-neutral-700 mb-3" />
             No documents configured for this {entity.type.toLowerCase()}.
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
             <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-neutral-900/50 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Document Setup</th>
                  <th className="px-6 py-4 font-medium">Expiry Timeline</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 overflow-y-auto">
                {entityDocs.map((doc) => {
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
                    <tr key={doc.id} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-neutral-200">{doc.type}</div>
                        <div className="text-xs text-neutral-500 mt-1">ID: {doc.id}</div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-col">
                            <span className={`text-sm font-medium ${hasNoExpiry ? 'text-neutral-500' : 'text-neutral-200'}`}>
                              {hasNoExpiry ? 'Lifetime / N/A' : doc.expiryDate ? format(parseISO(doc.expiryDate), 'MMM dd, yyyy') : 'N/A'}
                            </span>
                            <div className="mt-1.5 flex items-center">
                              <span className={`px-2.5 py-0.5 text-[11px] font-medium rounded-full border ${statusColor}`}>
                                {statusText}
                              </span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2">
                          {!hasNoExpiry && (
                            <button 
                              onClick={() => {
                                const newDate = prompt(`Renewing ${doc.type}. Enter new Expiry Date (YYYY-MM-DD):`, format(new Date(), 'yyyy-MM-dd'));
                                if (newDate && !isNaN(Date.parse(newDate))) {
                                  renewDocument(doc.id, new Date(newDate).toISOString());
                                } else if (newDate) {
                                  alert('Invalid Date');
                                }
                              }}
                              className="px-3 py-1.5 bg-neutral-800 hover:bg-indigo-600 border border-neutral-700 hover:border-indigo-500 transition-colors rounded text-sm text-neutral-300 hover:text-white flex items-center font-medium cursor-pointer"
                            >
                              <Edit2 size={14} className="mr-2" />
                              Renew
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${doc.type}?`)) {
                                deleteDocument(doc.id);
                              }
                            }}
                            className="p-1.5 text-neutral-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                            aria-label="Delete document"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
