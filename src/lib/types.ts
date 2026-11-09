/**
 * Tipos compartidos en todo el proyecto (portal público, comprobantes, panel administrativo y API).
 */

export interface RaffleSettings {
  raffle_badge?: string;
  raffle_name: string;
  raffle_description: string;
  ticket_price: number;
  prizes: string;
  draw_date: string;
  bank_alias: string;
  bank_cbu: string;
  bank_name: string;
  bank_holder: string;
  contact_phone: string;
  contact_phone_secondary: string;
  reserve_hours: number;
  public_reservations_enabled: boolean;
  max_numbers_per_order?: number;
  max_pending_numbers_per_phone?: number;
  rules_terms: string;
}

export interface RaffleStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
}

export interface NumberItem {
  number: number;
  status: string;
}

export interface ReservationOrderSummary {
  code: string;
  private_token: string;
  buyer_name: string;
  buyer_phone: string;
  payment_method: 'transfer' | 'cash' | string;
  payment_status: string;
  numbers: number[];
  unit_price: number;
  total_amount: number;
  expires_at: string;
}

export interface DashboardMetrics {
  total_numbers: number;
  available_numbers: number;
  reserved_numbers: number;
  sold_numbers: number;
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  expired_orders: number;
  money_collected_total: number;
  money_collected_cash: number;
  money_collected_transfer: number;
  money_pending: number;
  remaining_potential: number;
  expiring_soon_count: number;
  current_ticket_price: number;
}

export interface RecentOrder {
  id: number;
  code: string;
  buyer_name: string;
  buyer_phone: string;
  payment_method: string;
  payment_status: string;
  numbers_count: number;
  numbers?: number[];
  total_amount: number;
  private_token?: string;
  is_direct_sale: boolean;
  created_at: string;
}

export interface OrderItem {
  id: number;
  code: string;
  buyer_name: string;
  buyer_phone: string;
  payment_method: string;
  payment_status: string;
  unit_price: number;
  numbers_count: number;
  total_amount: number;
  numbers: number[];
  private_token: string;
  expires_at: string;
  paid_at: string | null;
  confirmed_by_admin: string | null;
  is_direct_sale: boolean;
  notes: string | null;
  created_at: string;
}

export interface BuyerOrder {
  id: number;
  code: string;
  buyer_name: string;
  payment_status: string;
  payment_method: string;
  numbers_count: number;
  total_amount: number;
  numbers: number[];
  private_token: string;
  is_direct_sale?: boolean;
  created_at: string;
}

export interface BuyerItem {
  id: number;
  name: string;
  all_names: string[];
  phone: string;
  created_at: string;
  total_orders: number;
  total_numbers: number;
  paid_numbers: number[];
  pending_numbers: number[];
  active_numbers: number[];
  total_paid_amount: number;
  total_pending_amount: number;
  orders: BuyerOrder[];
}

export interface BatchConfirmResultItem {
  order_id: number;
  code?: string;
  buyer_name?: string;
  status: 'confirmed' | 'rejected';
  reason?: string;
}
