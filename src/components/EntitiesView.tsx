import React, { useState } from 'react';
import { useFleet } from '../store';
import { EntityType, Entity } from '../data';
import { Truck, Users, Plus, FolderOpen, AlertCircle, Trash2 } from 'lucide-react';

interface EntitiesViewProps {
  type: EntityType;
  onSelectEntity: (entity: Entity) => void;
}

export default function EntitiesView({ type, onSelectEntity }: EntitiesViewProps) {
  const { entities, documents, addEntity, deleteEntity } = useFleet();
  const [isAdding, setIsAdding] = useState(false);
  const [newEntityId, setNewEntityId] = useState('');
  const [newEntityName, setNewEntityName] = useState('');

  const filteredEntities = entities.filter(e => e.type === type);

  const handleAdd = (e: React.FormEvent) => {
  
    e.preventDefault();
    if (!newEntityId || !newEntityName) return;
    addEntity({
      id: newEntityId,
      name: newEntityName,
      type
    });
    setIsAdding(false);
    setNewEntityId('');
    setNewEntityName('');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {type === 'Truck' ? 'Truck Fleet' : 'Drivers'}
          </h1>
          <p className="text-sm text-neutral-400">
            Select {type === 'Truck' ? 'a truck' : 'a driver'} to view their documents.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
        >
          {isAdding ? 'Cancel' : <><Plus className="h-4 w-4 mr-2" /> Add {type}</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-medium text-white mb-4">Add New {type}</h2>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-neutral-400 mb-1">{type} ID / Number</label>
              <input 
                required
                type="text" 
                placeholder={type === 'Truck' ? 'e.g. TRK-205' : 'e.g. DRV-015'}
                value={newEntityId}
                onChange={(e) => setNewEntityId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-neutral-400 mb-1">{type} Name / Model</label>
              <input 
                required
                type="text" 
                placeholder={type === 'Truck' ? 'e.g. Scania R500' : 'e.g. Jane Doe'}
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors cursor-pointer">
              Save {type}
            </button>
          </form>
        </div>
      )}

      {/* Grid of Folders */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2.5">
        {filteredEntities.map(entity => {
          const entityDocs = documents.filter(d => d.entityId === entity.id);
          const urgentDocs = entityDocs.filter(d => d.daysUntilExpiry <= 30).length;
          
          return (
            <div 
              key={entity.id}
              onClick={() => onSelectEntity(entity)}
              className="group bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 rounded-lg p-2.5 cursor-pointer transition-all hover:shadow-md hover:shadow-indigo-500/5 flex flex-col justify-between min-h-[125px] relative"
            >
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <div className={`p-1.5 rounded ${type === 'Truck' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                      {type === 'Truck' ? <Truck size={14} /> : <Users size={14} />}
                    </div>
                    {urgentDocs > 0 && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete ${entity.name}? All its documents will also be removed.`)) {
                        deleteEntity(entity.id);
                      }
                    }}
                    className="p-1 text-neutral-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="Delete Entity"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                
                <h3 className="text-xs font-bold text-white truncate" title={entity.name}>
                  {entity.name}
                </h3>
                <p className="text-[10px] text-neutral-500 truncate mt-0.5" title={entity.id}>
                  {entity.id}
                </p>
              </div>
              
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-900 text-[10px] text-neutral-400">
                <div className="flex items-center min-w-0">
                  <FolderOpen size={11} className="mr-1 opacity-70 flex-shrink-0" />
                  <span className="truncate">{entityDocs.length} Docs</span>
                </div>
                {urgentDocs > 0 && (
                  <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded font-medium">
                    {urgentDocs} alert
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {filteredEntities.length === 0 && (
          <div className="col-span-full py-12 text-center text-neutral-500">
            No {type}s found. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
