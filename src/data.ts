import { addDays, subDays } from 'date-fns';

export type EntityType = 'Truck' | 'Driver';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
}

export interface Document {
  id: string;
  name: string;
  type: string; // e.g., 'Istamara', 'Driving Licence'
  entityId: string;
  entityName: string;
  entityType: EntityType;
  issueDate: string;
  expiryDate: string | null;
  status: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';
  daysUntilExpiry: number | null;
}

const today = new Date();

export const mockEntities: Entity[] = [
  { id: 'TRK-101', name: 'Truck 101 (Volvo FMX)', type: 'Truck' },
  { id: 'TRK-102', name: 'Truck 102 (Mercedes Actros)', type: 'Truck' },
  { id: 'TRK-103', name: 'Truck 103 (Scania R500)', type: 'Truck' },
  { id: 'TRK-104', name: 'Truck 104 (MAN TGS)', type: 'Truck' },
  { id: 'DRV-001', name: 'John Doe', type: 'Driver' },
  { id: 'DRV-002', name: 'Ali Khan', type: 'Driver' },
  { id: 'DRV-003', name: 'Mike Smith', type: 'Driver' },
];

export const mockDocuments: Document[] = [
  {
    id: 'DOC-001',
    name: 'Truck 101 - Istamara',
    type: 'Istamara',
    entityId: 'TRK-101',
    entityName: 'Truck 101 (Volvo FMX)',
    entityType: 'Truck',
    issueDate: subDays(today, 300).toISOString(),
    expiryDate: addDays(today, 15).toISOString(),
    status: 'expiring_soon',
    daysUntilExpiry: 15,
  },
  {
    id: 'DOC-002',
    name: 'Truck 102 - 5th Wheel Expiry',
    type: '5th Wheel',
    entityId: 'TRK-102',
    entityName: 'Truck 102 (Mercedes Actros)',
    entityType: 'Truck',
    issueDate: subDays(today, 350).toISOString(),
    expiryDate: subDays(today, 5).toISOString(),
    status: 'expired',
    daysUntilExpiry: -5,
  },
  {
    id: 'DOC-003',
    name: 'John Doe - Driving Licence',
    type: 'Driving Licence',
    entityId: 'DRV-001',
    entityName: 'John Doe',
    entityType: 'Driver',
    issueDate: subDays(today, 400).toISOString(),
    expiryDate: addDays(today, 2).toISOString(),
    status: 'expiring_soon',
    daysUntilExpiry: 2,
  },
  {
    id: 'DOC-004',
    name: 'Truck 103 - Insurance',
    type: 'Insurance',
    entityId: 'TRK-103',
    entityName: 'Truck 103 (Scania R500)',
    entityType: 'Truck',
    issueDate: subDays(today, 200).toISOString(),
    expiryDate: addDays(today, 120).toISOString(),
    status: 'valid',
    daysUntilExpiry: 120,
  },
  {
    id: 'DOC-005',
    name: 'Ali Khan - Medical Fitness',
    type: 'Medical Fitness Certificate',
    entityId: 'DRV-002',
    entityName: 'Ali Khan',
    entityType: 'Driver',
    issueDate: subDays(today, 360).toISOString(),
    expiryDate: subDays(today, 1).toISOString(),
    status: 'expired',
    daysUntilExpiry: -1,
  },
  {
    id: 'DOC-006',
    name: 'Truck 104 - Safety Sticker',
    type: 'Safety Sticker',
    entityId: 'TRK-104',
    entityName: 'Truck 104 (MAN TGS)',
    entityType: 'Truck',
    issueDate: subDays(today, 100).toISOString(),
    expiryDate: addDays(today, 45).toISOString(),
    status: 'valid',
    daysUntilExpiry: 45,
  },
  {
    id: 'DOC-007',
    name: 'Mike Smith - HSE Certificate',
    type: 'HSE Certificate',
    entityId: 'DRV-003',
    entityName: 'Mike Smith',
    entityType: 'Driver',
    issueDate: subDays(today, 150).toISOString(),
    expiryDate: addDays(today, 25).toISOString(),
    status: 'expiring_soon',
    daysUntilExpiry: 25,
  },
];

export const complianceData = [
  { name: 'Jan', compliance: 95 },
  { name: 'Feb', compliance: 96 },
  { name: 'Mar', compliance: 92 },
  { name: 'Apr', compliance: 90 },
  { name: 'May', compliance: 88 },
  { name: 'Jun', compliance: 85 }, // Current dip due to expiring docs
];
