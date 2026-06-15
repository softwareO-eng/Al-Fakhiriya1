import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockDocuments as initialDocs, mockEntities as initialEntities, Document, Entity } from './data';
import { differenceInDays, parseISO } from 'date-fns';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'public_session',
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  return errInfo.error;
}

interface FleetState {
  documents: Document[];
  entities: Entity[];
  renewDocument: (id: string, newExpiry: string) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  addEntity: (entity: Entity) => void;
  deleteEntity: (id: string) => void;
  user: any | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  authError: string | null;
  dbError: string | null;
}

export function computeExpiryProperties(doc: Document): Document {
  if (!doc.expiryDate) {
    return { ...doc, daysUntilExpiry: null, status: 'no_expiry' as const };
  }
  const today = new Date();
  const days = differenceInDays(parseISO(doc.expiryDate), today);
  let status: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry' = 'valid';
  if (days < 0) status = 'expired';
  else if (days <= 30) status = 'expiring_soon';
  
  return { ...doc, daysUntilExpiry: days, status };
}

const FleetContext = createContext<FleetState | null>(null);

export function FleetProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snapshot) => {
      const configData = snapshot.data();
      const hasSeeded = configData?.seeded === true;
      
      // If system has never been seeded, do it now!
      if (!hasSeeded) {
        setDoc(doc(db, 'system', 'config'), { seeded: true }).then(() => {
          console.log("Seeding database initially...");
          const migrationPromises = [];
          for (const e of initialEntities) {
            migrationPromises.push(setDoc(doc(db, 'entities', e.id), e));
          }
          for (const d of initialDocs) {
            migrationPromises.push(setDoc(doc(db, 'documents', d.id), d));
          }
          return Promise.all(migrationPromises);
        }).then(() => {
          console.log("Initial seeding complete!");
        }).catch (e => {
          console.error("Migration / Seeding failed", e);
        });
      }
    }, (error) => {
      console.error("Config check failed", error);
    });

    const unsubEntities = onSnapshot(collection(db, 'entities'), (snapshot) => {
      const ents: Entity[] = [];
      snapshot.forEach(doc => ents.push(doc.data() as Entity));
      setEntities(ents);
      setDbError(null);
    }, (error) => {
      const errMsg = handleFirestoreError(error, OperationType.LIST, 'entities');
      setDbError(errMsg);
      setIsLoaded(true);
    });

    const unsubDocs = onSnapshot(collection(db, 'documents'), (snapshot) => {
      const docs: Document[] = [];
      snapshot.forEach(doc => docs.push(doc.data() as Document));
      
      // Compute expiry properties dynamically in memory for maximum performance
      const computedDocs = docs.map(computeExpiryProperties);

      setDocuments(computedDocs);
      setIsLoaded(true);
      setDbError(null);
    }, (error) => {
      const errMsg = handleFirestoreError(error, OperationType.LIST, 'documents');
      setDbError(errMsg);
      setIsLoaded(true);
    });

    return () => {
      unsubConfig();
      unsubEntities();
      unsubDocs();
    };
  }, []);

  // Auth functions kept for context compatibility but do nothing
  const signIn = async () => {};
  const logOut = async () => {};

  const renewDocument = async (id: string, newExpiry: string) => {
    const d = documents.find(doc => doc.id === id);
    if (!d) return;
    
    try {
      await setDoc(doc(db, `documents`, id), { ...d, expiryDate: newExpiry });
    } catch (e) {
      console.error(e);
    }
  };

  const addDocument = async (docObj: Document) => {
    try {
      await setDoc(doc(db, `documents`, docObj.id), docObj);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `documents/${docObj.id}`);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await deleteDoc(doc(db, `documents`, id));
    } catch (e) {
       console.error(e);
    }
  };

  const addEntity = async (entity: Entity) => {
    try {
      await setDoc(doc(db, `entities`, entity.id), entity);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `entities/${entity.id}`);
    }
  };

  const deleteEntity = async (id: string) => {
    try {
      await deleteDoc(doc(db, `entities`, id));
      
      const relatedDocs = documents.filter(d => d.entityId === id);
      for (const d of relatedDocs) {
        await deleteDoc(doc(db, `documents`, d.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <FleetContext.Provider value={{ documents, entities, renewDocument, addDocument, deleteDocument, addEntity, deleteEntity, user: { email: 'Live Sync' }, signIn, logOut, authError: null, dbError }}>
      {isLoaded ? children : (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-neutral-400 font-medium">Loading FleetSync...</p>
        </div>
      )}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (!context) throw new Error('useFleet must be used within FleetProvider');
  return context;
}
