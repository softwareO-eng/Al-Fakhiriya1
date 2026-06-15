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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredEntities.map(entity => {
          const entityDocs = documents.filter(d => d.entityId === entity.id);
          const urgentDocs = entityDocs.filter(d => d.daysUntilExpiry <= 30).length;
          
          return (
            <div 
              key={entity.id}
              onClick={() => onSelectEntity(entity)}
              className="group bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${type === 'Truck' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                  {type === 'Truck' ? <Truck size={24} /> : <Users size={24} />}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete ${entity.name}? All its documents will also be removed.`)) {
                        deleteEntity(entity.id);
                      }
                    }}
                    className="p-2 text-neutral-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                    aria-label="Delete Entity"
                  >
                    <Trash2 size={16} />
                  </button>
                  {urgentDocs > 0 && (
                    <div className="flex items-center space-x-1 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full animate-pulse">
                      <AlertCircle size={12} />
                      <span>{urgentDocs} Urgent</span>
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1 truncate">{entity.name}</h3>
              <p className="text-sm text-neutral-500 mb-4">{entity.id}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800/50 text-sm text-neutral-400">
                <div className="flex items-center">
                  <FolderOpen size={16} className="mr-2 opacity-70" />
                  <span>{entityDocs.length} Documents</span>
                </div>
                <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
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
