export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface LoanProduct {
  id: string;
  name: string;
  description: string;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  term_months: number[];
  requirements: string[];
  eligibility_criteria: any;
  created_at: string;
  updated_at: string;
}

export interface LoanApplication {
  id: string;
  user_id: string;
  loan_product_id: string;
  amount: number;
  purpose: string;
  term_months: number;
  status: 'pending' | 'approved' | 'rejected';
  monthly_income: number;
  employment_status: string;
  interest_rate: number;
  total_amount: number;
  monthly_payment: number;
  disbursement_date: string | null;
  next_payment_date: string | null;
  created_at: string;
}

export interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCheck {
  id: string;
  user_id: string;
  credit_score: number;
  bureau_reference: string;
  check_date: string;
  valid_until: string;
  created_at: string;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  payment_method: string;
  status: 'pending' | 'paid' | 'late';
  late_fee: number;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  status: 'pending' | 'completed';
  reward_amount: number;
  reward_paid: boolean;
  referral_code: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  address: string;
  phone: string;
  date_of_birth: string;
  employment_status: string;
  monthly_income: number;
  credit_score: number | null;
  kyc_status: 'pending' | 'verified' | 'rejected';
  preferred_language: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
  };
  created_at: string;
  is_admin: boolean;
}

export interface AdminState {
  isAdmin: boolean;
  profile: UserProfile | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  message: string;
  is_support: boolean;
  created_at: string;
}