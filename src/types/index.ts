export type EntityType = 'PF' | 'PJ'

export type UserRole = 'owner' | 'admin' | 'member'

export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  created_at: string
}

export interface Entity {
  id: string
  name: string
  type: EntityType
  document: string // CPF ou CNPJ
  owner_id: string
  created_at: string
}

export interface EntityMember {
  id: string
  entity_id: string
  user_id: string
  role: UserRole
  invited_at: string
  accepted_at?: string
}

export interface BankAccount {
  id: string
  entity_id: string
  name: string
  bank_name: string
  bank_code?: string
  account_number?: string
  agency?: string
  initial_balance: number
  current_balance: number
  color?: string
  created_at: string
}

export type TransactionType = 'credit' | 'debit'
export type TransactionStatus = 'pending' | 'reconciled' | 'ignored'

export interface Transaction {
  id: string
  bank_account_id: string
  entity_id: string
  date: string
  description: string
  amount: number
  type: TransactionType
  category_id?: string
  status: TransactionStatus
  ofx_id?: string
  notes?: string
  created_at: string
  category?: Category
}

export interface Category {
  id: string
  entity_id?: string
  name: string
  color: string
  icon?: string
  type: TransactionType | 'both'
  is_system: boolean
}

export interface ReconciliationSuggestion {
  transaction_id: string
  suggested_category_id: string
  suggested_description: string
  confidence: number
  reasoning: string
}

export interface DashboardFilters {
  period_start: string
  period_end: string
  bank_account_id?: string
}

export interface DashboardSummary {
  total_income: number
  total_expenses: number
  balance: number
  transactions_count: number
}

export interface CategoryExpense {
  category_id: string
  category_name: string
  category_color: string
  total: number
  percentage: number
}

export interface ChartDataPoint {
  date: string
  income: number
  expenses: number
}
