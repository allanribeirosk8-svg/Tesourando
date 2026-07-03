import { supabase } from '../lib/supabase';
import { Appointment, BarberProfile, Customer, DayConfig, ServiceItem } from '../types';
import { normalizePhone, normalizeTime } from '../utils/helpers';

function generateSlug(shopName: string, userId: string): string {
  const base = shopName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove caracteres especiais
    .replace(/\s+/g, '-')            // espaços viram hífens
    .replace(/-+/g, '-');            // hífens duplicados

  // Sufixo com os últimos 6 chars do userId para garantir unicidade
  const suffix = userId.replace(/-/g, '').slice(-6);
  return `${base}-${suffix}`;
}

// Define database types to fix lint errors
export const supabaseService = {
  // Helper to get current user ID
 async getUserId() {
    try {
        const result = await supabase.auth.getSession();
        const session = result?.data?.session;
        console.log('[getUserId] session exists:', !!session);
        console.log('[getUserId] userId:', session?.user?.id ?? 'NULL');
        const error = result?.error;
        const data = result?.data;
        
        if (error) {
            console.error("Error getting session in getUserId:", error);
            return null;
        }
        return data?.session?.user?.id || null;
    } catch (e) {
        console.error("Exception in getUserId:", e);
        return null;
    }
},

  // Get the first barber profile ID for public access
  async getPublicBarberId() {
    const { data, error } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
    if (error || !data) return null;
    return (data as any).id;
  },

  // Profiles
  async getProfile(targetUserId?: string) {
    try {
      const userId = targetUserId || await this.getUserId();
      if (!userId) return null;

      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error && error.code === 'PGRST116') {
        // Auto-create profile if missing
        const userResult = await supabase.auth.getUser();
        const user = userResult?.data?.user;
        const newProfile = {
          id: userId,
          name: user?.user_metadata?.name || 'Barbeiro',
          updated_at: new Date().toISOString()
        };
        await supabase.from('profiles').insert(newProfile as any);
        return {
          name: newProfile.name,
          personalPhone: '',
          shopName: 'Meu Corte',
          businessPhone: '',
          onboarding_seen: false,
          slug: ''
        } as BarberProfile;
      }
      if (error) throw error;
      if (!data) return null;

      const d = data as any;
      return {
        name: d.name,
        personalPhone: d.personal_phone || '',
        photo: d.photo,
        shopName: d.shop_name || 'Meu Corte',
        businessPhone: d.business_phone || '',
        address: d.address,
        logo: d.logo,
        description: d.description,
        instagram: d.instagram,
        website: d.website,
        onboarding_seen: d.onboarding_seen,
        slug: d.slug
      } as BarberProfile;
    } catch (err) {
      console.error('[getProfile] Erro ao carregar perfil:', err);
      return null;
    }
  },
  async updateProfile(profile: BarberProfile) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    // Busca o slug atual para não sobrescrever
    const { data: existing } = await supabase
      .from('profiles')
      .select('slug')
      .eq('id', userId)
      .maybeSingle();

    const slug = (existing as any)?.slug || generateSlug(profile.shopName || profile.name || 'barbearia', userId);

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name: profile.name,
      personal_phone: profile.personalPhone,
      photo: profile.photo,
      shop_name: profile.shopName,
      business_phone: profile.businessPhone,
      address: profile.address,
      logo: profile.logo,
      description: profile.description,
      instagram: profile.instagram,
      website: profile.website,
      onboarding_seen: profile.onboarding_seen,
      slug: slug,
      updated_at: new Date().toISOString()
    } as any);
    if (error) throw error;
  },

  // Services
  async getServices(targetUserId?: string) {
    try {
      const userId = targetUserId || await this.getUserId();
      console.log('[getServices] buscando para userId:', userId);

      if (!userId) {
        console.warn('[getServices] userId null - retornando []');
        return [];
      }

      const { data, error } = await supabase.from('services').select('*').eq('user_id', userId).order('order_index', { ascending: true });
      
      if (error) {
        console.error('[getServices] ERRO:', error);
        return [];
      }

      console.log('[getServices] dados brutos do banco:', data);
      console.log('[getServices] quantidade:', data?.length);

      if (!data) return [];

      const mapped = (data as any[]).map(s => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        duration: s.duration
      })) as ServiceItem[];
      
      console.log('[getServices] retornando:', mapped);
      return mapped;
    } catch (err) {
      console.error('[getServices] Exception:', err);
      return [];
    }
  },
  async saveServices(services: ServiceItem[]) {
    console.log('[saveServices] INICIANDO', { services });
    const userId = await this.getUserId();
    console.log('[saveServices] userId:', userId);

    if (!userId) {
      console.error('[saveServices] ERRO: userId null - usuário não autenticado');
      throw new Error('User not authenticated');
    }

    const existingIds = services.map(s => s.id);

    if (existingIds.length > 0) {
      await supabase
        .from('services')
        .delete()
        .eq('user_id', userId)
        .not('id', 'in', `(${existingIds.join(',')})`);
    } else {
      await supabase
        .from('services')
        .delete()
        .eq('user_id', userId);
    }

    const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const payload = services.map((s, index) => ({
      id: isUUID(s.id) ? s.id : crypto.randomUUID(),
      user_id: userId,
      name: s.name,
      price: s.price,
      duration: s.duration,
      order_index: index
    }));
    
    console.log('[saveServices] payload para upsert:', payload);

    const { data, error } = await supabase.from('services')
      .upsert(payload as any)
      .select();

    if (error) {
      console.error('[saveServices] ERRO no upsert:', error);
      console.error('[saveServices] error.code:', error.code);
      console.error('[saveServices] error.message:', error.message);
      console.error('[saveServices] error.details:', error.details);
      console.error('[saveServices] error.hint:', error.hint);
      throw error;
    }

    console.log('[saveServices] SUCESSO - data retornada:', data);
    return (data as any[]).map(s => ({
      id: s.id,
      name: s.name,
      price: Number(s.price),
      duration: s.duration
    })) as ServiceItem[];
  },
  async deleteService(id: string) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase.from('services').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  // Customers
  async getCustomers(targetUserId?: string) {
    try {
      const userId = targetUserId || await this.getUserId();
      if (!userId) return [];

      const { data, error } = await supabase.from('customers').select('*, customer_photos(*)').eq('user_id', userId);
      if (error) throw error;
      if (!data) return [];
      return (data as any[]).map(c => ({
        phone: c.phone,
        name: c.name,
        avatar: c.avatar,
        cutCount: c.cut_count,
        noShowCount: c.no_show_count,
        photos: (c.customer_photos || []).map((p: any) => ({
          url: p.url,
          description: p.description,
          date: p.date ? p.date.substring(0, 10) : ''
        })),
        history: [] // History can be derived from appointments if needed, or stored separately
      })) as Customer[];
    } catch (err) {
      console.error('[getCustomers] Erro ao carregar clientes:', err);
      return [];
    }
  },
  async saveCustomer(customer: Customer, targetUserId?: string) {
    const userId = targetUserId || await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    const { photos, ...rest } = customer;
    const { data, error } = await supabase.from('customers').upsert({
    user_id: userId,
    phone: customer.phone,
    name: customer.name,
    avatar: customer.avatar,
    cut_count: customer.cutCount,
    no_show_count: customer.noShowCount || 0
    } as any, { onConflict: 'phone,user_id' }).select().single();
    
    if (error) throw error;
    
    // We don't save photos here anymore to avoid duplication. 
    // Photos should be saved via addCustomerPhoto or handle separately.
    
    return data;
  },
  async addCustomerPhoto(phone: string, photo: { url: string; description: string; date: string }) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase.from('customer_photos').insert({
      user_id: userId,
      customer_phone: phone,
      url: photo.url,
      description: photo.description,
      date: photo.date
    } as any);
    
    if (error) throw error;
  },
  async updateCustomer(oldPhone: string, customer: Customer) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    const normalizedOld = normalizePhone(oldPhone);
    const normalizedNew = normalizePhone(customer.phone);

    if (normalizedOld !== normalizedNew) {
      // If phone changed, we need to handle the PK change
      // 1. Create new customer record
      const { error: insertError } = await supabase.from('customers').insert({
        user_id: userId,
        phone: customer.phone,
        name: customer.name,
        avatar: customer.avatar,
        cut_count: customer.cutCount,
        no_show_count: customer.noShowCount || 0
      } as any);
      
      if (insertError) throw insertError;

      // 2. Update photos to point to new phone
      const { error: photoError } = await (supabase.from('customer_photos') as any)
        .update({ customer_phone: customer.phone } as any)
        .eq('user_id', userId)
        .eq('customer_phone', oldPhone);
      
      if (photoError) throw photoError;

      // 3. Update appointments to point to new phone
      const { error: aptError } = await (supabase.from('appointments') as any)
        .update({ phone: customer.phone, client_name: customer.name } as any)
        .eq('user_id', userId)
        .eq('phone', oldPhone);
      
      if (aptError) throw aptError;

      // 4. Delete old customer record
      const { error: deleteError } = await (supabase.from('customers') as any)
        .delete()
        .eq('user_id', userId)
        .eq('phone', oldPhone);
      
      if (deleteError) throw deleteError;
    } else {
      // Just a normal update
      const { error } = await (supabase.from('customers') as any).update({
        name: customer.name,
        avatar: customer.avatar,
        cut_count: customer.cutCount,
        no_show_count: customer.noShowCount || 0
      } as any)
      .eq('user_id', userId)
      .eq('phone', customer.phone);
      
      if (error) throw error;

      // Also update appointments name if it changed
      const { error: aptError } = await (supabase.from('appointments') as any)
        .update({ client_name: customer.name } as any)
        .eq('user_id', userId)
        .eq('phone', customer.phone);
      
      if (aptError) throw aptError;
    }
  },
  async checkDuplicateCustomer(phone: string) {
    const userId = await this.getUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('customers')
      .select('phone, name')
      .eq('phone', phone)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  // Appointments
  async getAppointments(targetUserId?: string) {
    try {
      const userId = targetUserId || await this.getUserId();
      if (!userId) return [];

      const { data, error } = await supabase.from('appointments').select('*').eq('user_id', userId);
      if (error) throw error;
      if (!data) return [];
      return (data as any[]).map(a => ({
        id: a.id,
        date: a.date ? a.date.substring(0, 10) : '',
        time: normalizeTime(a.time),
        clientName: a.client_name,
        phone: a.phone,
        service: a.service,
        price: Number(a.price),
        duration: a.duration,
        status: a.status,
        observation: a.observation,
        createdAt: new Date(a.created_at).getTime()
      })) as Appointment[];
    } catch (err) {
      console.error('[getAppointments] Erro ao carregar agendamentos:', err);
      return [];
    }
  },
  async getAppointmentsByDate(date: string, targetUserId?: string) {
    try {
      const userId = targetUserId || await this.getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('time', { ascending: true });
      
      if (error) throw error;
      if (!data) return [];
      return (data as any[]).map(a => ({
        id: a.id,
        date: a.date ? a.date.substring(0, 10) : '',
        time: normalizeTime(a.time),
        clientName: a.client_name,
        phone: a.phone,
        service: a.service,
        price: Number(a.price),
        duration: a.duration,
        status: a.status,
        observation: a.observation,
        createdAt: new Date(a.created_at).getTime()
      })) as Appointment[];
    } catch (err) {
      console.error(`[getAppointmentsByDate] Erro ao carregar agendamentos da data ${date}:`, err);
      return [];
    }
  },
  async saveAppointment(appointment: Appointment, targetUserId?: string) {
    const userId = targetUserId || await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const dataToSave: any = {
      user_id: userId,
      date: appointment.date,
      time: normalizeTime(appointment.time),
      client_name: appointment.clientName,
      phone: appointment.phone,
      service: appointment.service,
      price: appointment.price,
      duration: appointment.duration,
      status: appointment.status,
      observation: appointment.observation
    };

    if (isUUID(appointment.id)) {
      dataToSave.id = appointment.id;
    }

    const { data, error } = await supabase.from('appointments').upsert(dataToSave).select().single();
    if (error) throw error;
    
    const a = data as any;
    return {
      id: a.id,
      date: a.date,
      time: normalizeTime(a.time),
      clientName: a.client_name,
      phone: a.phone,
      service: a.service,
      price: Number(a.price),
      duration: a.duration,
      status: a.status,
      observation: a.observation,
      createdAt: new Date(a.created_at).getTime()
    } as Appointment;
  },
  async deleteAppointment(id: string) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase.from('appointments').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  // Weekly Schedule
  async getWeeklySchedule(targetUserId?: string) {
    try {
      const userId = targetUserId || await this.getUserId();
      if (!userId) return {};

      const { data: schedule, error: sError } = await supabase.from('weekly_schedule').select('*').eq('user_id', userId);
      const { data: breaks, error: bError } = await supabase.from('weekly_breaks').select('*').eq('user_id', userId);
      if (sError || bError) throw sError || bError;

      const result: Record<number, DayConfig> = {};
      (schedule as any[])?.forEach(s => {
        result[s.day_of_week] = {
          start: normalizeTime(s.start_time),
          end: normalizeTime(s.end_time),
          isOpen: s.is_open,
          breaks: (breaks as any[])?.filter(b => b.day_of_week === s.day_of_week).map(b => normalizeTime(b.time)) || []
        };
      });
      return result;
    } catch (err) {
      console.error('[getWeeklySchedule] Erro ao carregar agenda semanal:', err);
      return {};
    }
  },
  async saveWeeklySchedule(day: number, config: DayConfig) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    const payload = {
      user_id: userId,
      day_of_week: day,
      start_time: normalizeTime(config.start),
      end_time: normalizeTime(config.end),
      is_open: config.isOpen
    };

    console.group(`[DEBUG-AGENDA] saveWeeklySchedule - dia ${day}`);
    console.log('[DEBUG-AGENDA] Payload:', payload);
    console.log(`[DEBUG-AGENDA] day_of_week: ${day}, is_open: ${config.isOpen}`);
    console.log(`[DEBUG-AGENDA] Tipo de is_open: ${typeof config.isOpen}`);
    
    const { data, error } = await supabase.from('weekly_schedule').upsert(payload as any).select();
    
    console.log('[DEBUG-AGENDA] Resposta Supabase:', {
      sucesso: !error,
      erro: error,
      dados: data
    });
    console.groupEnd();
    
    if (error) throw error;

    // Handle breaks
    const { error: delError } = await supabase.from('weekly_breaks').delete().eq('day_of_week', day).eq('user_id', userId);
    if (delError) throw delError;

    if (config.breaks && config.breaks.length > 0) {
      const { error: bError } = await supabase.from('weekly_breaks').insert(
        config.breaks.map(time => ({ user_id: userId, day_of_week: day, time: normalizeTime(time) })) as any
      );
      if (bError) throw bError;
    }
  },

  // Blocked/Unblocked Slots
  async getBlockedSlots(targetUserId?: string) {
    try {
      const userId = targetUserId || await this.getUserId();
      if (!userId) return {};

      const { data, error } = await supabase.from('blocked_slots').select('*').eq('user_id', userId);
      if (error) throw error;
      if (!data) return {};
      const result: Record<string, string[]> = {};
      (data as any[])?.forEach(s => {
        if (!result[s.date]) result[s.date] = [];
        result[s.date].push(normalizeTime(s.time));
      });
      return result;
    } catch (err) {
      console.error('[getBlockedSlots] Erro ao carregar horários bloqueados:', err);
      return {};
    }
  },
  async saveBlockedSlot(date: string, time: string, isBlocked: boolean) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    if (isBlocked) {
      await supabase.from('blocked_slots').upsert({ user_id: userId, date, time: normalizeTime(time) } as any);
    } else {
      await supabase.from('blocked_slots').delete().match({ user_id: userId, date, time: normalizeTime(time) });
    }
  },
  async getUnblockedSlots(targetUserId?: string) {
    try {
      const userId = targetUserId || await this.getUserId();
      if (!userId) return {};

      const { data, error } = await supabase.from('unblocked_slots').select('*').eq('user_id', userId);
      if (error) throw error;
      if (!data) return {};
      const result: Record<string, string[]> = {};
      (data as any[])?.forEach(s => {
        if (!result[s.date]) result[s.date] = [];
        result[s.date].push(normalizeTime(s.time));
      });
      return result;
    } catch (err) {
      console.error('[getUnblockedSlots] Erro ao carregar horários desbloqueados:', err);
      return {};
    }
  },
  async saveUnblockedSlot(date: string, time: string, isUnblocked: boolean) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User not authenticated');

    if (isUnblocked) {
      await supabase.from('unblocked_slots').upsert({ user_id: userId, date, time: normalizeTime(time) } as any);
    } else {
      await supabase.from('unblocked_slots').delete().match({ user_id: userId, date, time: normalizeTime(time) });
    }
  }
};
