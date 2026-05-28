import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kufdjzdlsggkwaprabqe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmRqemRsc2dna3dhcHJhYnFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMDIzOTUsImV4cCI6MjA5NTU3ODM5NX0.K6xXcMyCEAAAaIBL5bvGkE78key6uqukpClQB7evuGg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const signUp = (email, password, name) =>
  supabase.auth.signUp({ email, password, options: { data: { name } } })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ── Data helpers ──────────────────────────────────────────────────────────────
export const db = {
  // Profile
  getProfile: (userId) =>
    supabase.from('profiles').select('*').eq('id', userId).single(),

  upsertProfile: (profile) =>
    supabase.from('profiles').upsert(profile),

  // Transactions
  getTransactions: (userId, sharedKey) => {
    let q = supabase.from('transactions').select('*').order('date', { ascending: false })
    if (sharedKey) return q.or(`user_id.eq.${userId},shared_key.eq.${sharedKey}`)
    return q.eq('user_id', userId)
  },

  addTransaction: (tx) =>
    supabase.from('transactions').insert(tx).select().single(),

  deleteTransaction: (id) =>
    supabase.from('transactions').delete().eq('id', id),

  // Bills
  getBills: (userId, sharedKey) => {
    let q = supabase.from('bills').select('*').order('due_day')
    if (sharedKey) return q.or(`user_id.eq.${userId},shared_key.eq.${sharedKey}`)
    return q.eq('user_id', userId)
  },

  addBill: (bill) =>
    supabase.from('bills').insert(bill).select().single(),

  updateBill: (id, updates) =>
    supabase.from('bills').update(updates).eq('id', id),

  deleteBill: (id) =>
    supabase.from('bills').delete().eq('id', id),

  // Goals
  getGoals: (userId, sharedKey) => {
    let q = supabase.from('goals').select('*').order('created_at')
    if (sharedKey) return q.or(`user_id.eq.${userId},shared_key.eq.${sharedKey}`)
    return q.eq('user_id', userId)
  },

  addGoal: (goal) =>
    supabase.from('goals').insert(goal).select().single(),

  updateGoal: (id, updates) =>
    supabase.from('goals').update(updates).eq('id', id).select().single(),

  deleteGoal: (id) =>
    supabase.from('goals').delete().eq('id', id),
}
