import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockDocuments as initialDocs, mockEntities as initialEntities, Document, Entity } from './data';
import { differenceInDays, parseISO } from 'date-fns';
import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface FleetState {
  documents: Document[];
  entities: Entity[];
  renewDocument: (id: string, newExpiry: string) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  addEntity: (entity: Entity) => void;
  deleteEntity: (id: string) => void;
  user: User | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  authError: string | null;
}

const FleetContext = createContext<FleetState | null>(null);

export function FleetProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    getRedirectResult(auth).catch((e: any) => {
      console.error("Redirect sign in error:", e);
      if (e.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setAuthError(`The domain "${domain}" is not authorized. Please add it in your Firebase Console -> Authentication -> Settings -> Authorized domains. (Wait 2-5 min after adding).`);
      } else if (e.code === 'auth/operation-not-allowed') {
        setAuthError("Google Sign-In is not enabled in Firebase Console.");
      } else {
        setAuthError(e.message || "Failed to sign in via redirect.");
      }
    });

    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setDocuments([]);
        setEntities([]);
        setIsLoaded(true);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubEntities = onSnapshot(collection(db, `users/${user.uid}/entities`), (snapshot) => {
      const ents: Entity[] = [];
      snapshot.forEach(doc => ents.push(doc.data() as Entity));
      setEntities(ents);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/entities`);
    });

    const unsubDocs = onSnapshot(collection(db, `users/${user.uid}/documents`), async (snapshot) => {
      const docs: Document[] = [];
      snapshot.forEach(doc => docs.push(doc.data() as Document));
      
      // Migration from local storage on first load if cloud is empty
      const localEnts = localStorage.getItem('fleet_entities');
      const localDocs = localStorage.getItem('fleet_documents');
      
      if (docs.length === 0 && localEnts && localDocs) {
         try {
           const parsedEnts = JSON.parse(localEnts) as Entity[];
           const parsedDocs = JSON.parse(localDocs) as Document[];
           
           if (parsedEnts.length > 0 || parsedDocs.length > 0) {
             for (const e of parsedEnts) {
               await setDoc(doc(db, `users/${user.uid}/entities`, e.id), { ...e, userId: user.uid });
             }
             for (const d of parsedDocs) {
               await setDoc(doc(db, `users/${user.uid}/documents`, d.id), { ...d, userId: user.uid });
             }
             localStorage.removeItem('fleet_entities');
             localStorage.removeItem('fleet_documents');
             console.log("Migrated local data to Firebase");
           }
         } catch(e) {
           console.error("Migration failed", e);
         }
      }

      setDocuments(docs);
      setIsLoaded(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/documents`);
    });

    return () => {
      unsubEntities();
      unsubDocs();
    };
  }, [user]);

  // Recalculate days until expiry
  useEffect(() => {
    if (!isLoaded || documents.length === 0 || !user) return;
    
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
      updatedDocs.forEach(async d => {
        try {
          await setDoc(doc(db, `users/${user.uid}/documents`, d.id), { ...d, userId: user.uid });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/documents/${d.id}`);
        }
      });
    }
  }, [documents, isLoaded, user]);

  const signIn = async () => {
    try {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (e: any) {
      console.error("Sign in error:", e);
      if (e.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setAuthError(`The domain "${domain}" is not authorized. Please add it in your Firebase Console -> Authentication -> Settings -> Authorized domains.`);
      } else {
        setAuthError(e.message || "Failed to start sign in redirect.");
      }
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const renewDocument = async (id: string, newExpiry: string) => {
    if (!user) return;
    const d = documents.find(doc => doc.id === id);
    if (!d) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/documents`, id), { ...d, expiryDate: newExpiry, userId: user.uid });
    } catch (e) {
      console.error(e);
    }
  };

  const addDocument = async (docObj: Document) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/documents`, docObj.id), { ...docObj, userId: user.uid });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/documents/${docObj.id}`);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/documents`, id));
    } catch (e) {
       console.error(e);
    }
  };

  const addEntity = async (entity: Entity) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/entities`, entity.id), { ...entity, userId: user.uid });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/entities/${entity.id}`);
    }
  };

  const deleteEntity = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/entities`, id));
      
      const relatedDocs = documents.filter(d => d.entityId === id);
      for (const d of relatedDocs) {
        await deleteDoc(doc(db, `users/${user.uid}/documents`, d.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <FleetContext.Provider value={{ documents, entities, renewDocument, addDocument, deleteDocument, addEntity, deleteEntity, user, signIn, logOut, authError }}>
      {isLoaded ? children : null}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (!context) throw new Error('useFleet must be used within FleetProvider');
  return context;
}
