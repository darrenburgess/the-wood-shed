import { getSupabaseClient } from '/supabase.js';

export const repertoireData = {
    async fetchRepertoire() {
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient.from('repertoire').select('*');
        if (error) { console.error('Error fetching repertoire:', error); return []; }
        return data;
    },

    async createRepertoire(title, artist) {
        const supabaseClient = getSupabaseClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;
        const { data, error } = await supabaseClient.from('repertoire')
            .insert({
                title,
                artist,
                user_id: user.id,
            })
            .select()
            .single();
        if (error) { console.error('Error creating repertoire tune:', error); return null; }
        return data;
    },

    async updateRepertoire(id, title, artist) {
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient.from('repertoire').update({ title, artist }).eq('id', id).select().single();
        if (error) { console.error('Error updating repertoire tune:', error); return null; }
        return data;
    },

    async updateRepertoireProgress(id, progress) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient.from('repertoire').update({ progress }).eq('id', id);
        if (error) console.error('Error updating repertoire progress:', error);
    },

    async deleteRepertoire(id) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient.from('repertoire').delete().eq('id', id);
        if (error) console.error('Error deleting repertoire tune:', error);
    },

    async linkRepertoireToGoal(goalId, repertoireId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient.from('goals').update({ repertoire_id: repertoireId }).eq('id', goalId);
        if (error) console.error('Error linking repertoire to goal:', error);
    },

    async unlinkRepertoireFromGoal(goalId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient.from('goals').update({ repertoire_id: null }).eq('id', goalId);
        if (error) console.error('Error unlinking repertoire from goal:', error);
    },

    async searchRepertoire(searchTerm) {
        const supabaseClient = getSupabaseClient();
        if (!searchTerm || searchTerm.length < 2) return [];
        const { data, error } = await supabaseClient
            .from('repertoire')
            .select('id, title, artist')
            .ilike('title', `%${searchTerm}%`)
            .limit(10);
        if (error) { console.error('Error searching repertoire:', error); return []; }
        return data;
    },

    async linkRepertoireToLog(logId, repertoireId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('log_repertoire')
            .insert({ log_id: logId, repertoire_id: repertoireId });
        if (error && error.code !== '23505') { // Ignore if already exists
            console.error('Error linking repertoire to log:', error);
        }
    },

    async unlinkRepertoireFromLog(logId, repertoireId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('log_repertoire')
            .delete()
            .match({ log_id: logId, repertoire_id: repertoireId });
        if (error) {
            console.error('Error unlinking repertoire from log:', error);
        }
    }
};
