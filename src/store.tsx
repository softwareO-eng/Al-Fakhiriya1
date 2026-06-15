import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockDocuments as initialDocs, mockEntities as initialEntities, Document, Entity } from './data';
import { differenceInDays, parseISO } from 'date-fns';

interface FleetState {
  documents: Document[];
  entities: Entity[];
  renewDocument: (id: string, newExpiry: string) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  addEntity: (entity: Entity) => void;
  deleteEntity: (id: string) => void;
}

const FleetContext = createContext<FleetState | null>(null);

export function FleetProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from LocalStorage
  useEffect(() => {
    const savedDocs = localStorage.getItem('fleet_documents');
    const savedEntities = localStorage.getItem('fleet_entities');
    
    if (savedDocs) {
      try { setDocuments(JSON.parse(savedDocs)); } catch (e) { setDocuments(initialDocs); }
    } else {
      setDocuments(initialDocs);
    }

    if (savedEntities) {
      try { setEntities(JSON.parse(savedEntities)); } catch (e) { setEntities(initialEntities); }
    } else {
      setEntities(initialEntities);
    }
    
    setIsLoaded(true);
  }, []);

  // Recalculate days until expiry and save to LocalStorage on changes
  useEffect(() => {
    if (!isLoaded) return;
    
    let changed = false;
    const today = new Date();
    
    const updatedDocs = documents.map(doc => {
      if (!doc.expiryDate) {
        if (doc.daysUntilExpiry !== null || doc.status !== 'no_expiry') {
          changed = true;
          return { ...doc, daysUntilExpiry: null, status: 'no_expiry' as const };
        }
        return doc;
      }

      const days = differenceInDays(parseISO(doc.expiryDate), today);
      let status: 'valid' | 'expiring_soon' | 'expired' = 'valid';
      if (days < 0) status = 'expired';
      else if (days <= 30) status = 'expiring_soon';
      
      if (doc.daysUntilExpiry !== days || doc.status !== status) {
        changed = true;
        return { ...doc, daysUntilExpiry: days, status };
      }
      return doc;
    });

    if (changed) {
      setDocuments(updatedDocs);
    }
    localStorage.setItem('fleet_documents', JSON.stringify(updatedDocs));
    localStorage.setItem('fleet_entities', JSON.stringify(entities));
  }, [documents, entities, isLoaded]);

  const renewDocument = (id: string, newExpiry: string) => {
    setDocuments(docs => docs.map(doc => 
      doc.id === id ? { ...doc, expiryDate: newExpiry } : doc
    ));
  };

  const addDocument = (doc: Document) => {
    setDocuments(docs => [...docs, doc]);
  };

  const deleteDocument = (id: string) => {
    setDocuments(docs => docs.filter(d => d.id !== id));
  };

  const addEntity = (entity: Entity) => {
    setEntities(ents => [...ents, entity]);
  };

  const deleteEntity = (id: string) => {
    setEntities(ents => ents.filter(e => e.id !== id));
    setDocuments(docs => docs.filter(d => d.entityId !== id)); // Cascade delete documents
  };

  return (
    <FleetContext.Provider value={{ documents, entities, renewDocument, addDocument, deleteDocument, addEntity, deleteEntity }}>
      {isLoaded ? children : null}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (!context) throw new Error('useFleet must be used within FleetProvider');
  return context;
}
