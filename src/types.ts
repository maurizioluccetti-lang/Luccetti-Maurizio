export type TransactionType = 'Agio' | 'Corrispettivo';

export type TransactionCategory = 
  | 'Mooney'
  | 'Lotto'
  | 'Gratta e Vinci'
  | 'Sisal'
  | '4%'
  | '10%'
  | '22%'
  | 'Altro';

export interface Transaction {
  id?: string;
  date: string; // ISO YYYY-MM-DD
  category: TransactionCategory;
  type: TransactionType;
  grossAmount: number;
  netAmount?: number;
  ivaRate?: number;
  isVentilato?: boolean;
  isArt74?: boolean;
  notes?: string;
  uid: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
}
