const { supabase, isSupabaseConfigured } = require('../config/supabase');

class SupabaseService {
  constructor() {
    this.client = supabase;
    this.isConfigured = isSupabaseConfigured();
  }

  // ==================== AUTH ====================
  
  async signUp(email, password, userData) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    
    if (error) throw error
    return data
  }

  async signIn(email, password) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

  async signOut() {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { error } = await this.client.auth.signOut()
    if (error) throw error
  }

  async getCurrentUser() {
    if (!this.isConfigured) return null
    
    const { data: { user } } = await this.client.auth.getUser()
    return user
  }

  // ==================== USERS ====================
  
  async createUser(userData) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client
      .from('users')
      .insert([userData])
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getUser(userId) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  }

  async updateUser(userId, updates) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // ==================== PATIENTS ====================
  
  async createPatient(patientData) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client
      .from('patients')
      .insert([patientData])
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getPatients(filters = {}) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    let query = this.client.from('patients').select('*')
    
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }

  async getPatient(patientId) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()
    
    if (error) throw error
    return data
  }

  async updatePatient(patientId, updates) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client
      .from('patients')
      .update(updates)
      .eq('id', patientId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // ==================== TESTS ====================
  
  async createTest(testData) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client
      .from('tests')
      .insert([testData])
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getTests(patientId) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client
      .from('tests')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================
  
  subscribeToPatients(callback) {
    if (!this.isConfigured) return null
    
    return this.client
      .channel('patients-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'patients' },
        callback
      )
      .subscribe()
  }

  unsubscribe(subscription) {
    if (subscription && this.client) {
      this.client.removeChannel(subscription)
    }
  }

  // ==================== STORAGE ====================
  
  async uploadFile(bucket, path, file) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file)
    
    if (error) throw error
    return data
  }

  async getFileUrl(bucket, path) {
    if (!this.isConfigured) throw new Error('Supabase not configured')
    
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  }
}

module.exports = new SupabaseService();
