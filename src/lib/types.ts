export type Role = 'owner' | 'factory1' | 'factory2' | 'salesman';

export interface Profile {
  id: string;
  username: string;
  password_plain: string;
  role: Role;
  full_name: string;
  created_at: string;
}

export interface Medicine {
  id: number;
  name: string;
  category: string;
  potency: string | null;
  price: number;
  cost: number;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  medicine_id: number;
  factory_id: 'factory1' | 'factory2';
  stock_quantity: number;
  created_at: string;
}

export interface SalesLedgerEntry {
  id: number;
  shop_name: string;
  medicine_name: string;
  potency_used: string | null;
  quantity: number;
  amount_paid: number;
  amount_pending: number;
  payment_status: 'Paid' | 'Unpaid';
  factory_source: 'factory1' | 'factory2';
  created_at: string;
}

export interface FactoryLogEntry {
  id: number;
  factory_id: 'factory1' | 'factory2';
  log_type: 'In' | 'Out';
  medicine_name: string;
  quantity: number;
  operator_name: string;
  created_at: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner / Super Admin',
  factory1: 'Factory 1 Manager',
  factory2: 'Factory 2 Manager',
  salesman: 'Senior Salesman',
};

export const FACTORY_LABELS: Record<string, string> = {
  factory1: 'Factory 1',
  factory2: 'Factory 2',
};

export function formatPKR(amount: number): string {
  return 'Rs. ' + amount.toLocaleString('en-PK');
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m}:${s} ${ampm}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}
