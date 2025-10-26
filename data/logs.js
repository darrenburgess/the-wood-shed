import { getSupabaseClient } from '/supabase.js';
import { getLocalDateString } from '/utils.js';

export const logData = {
    async addLog(goal, entryText, contentIds = []) {
        const supabaseClient = getSupabaseClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        const { data: newLog, error: logError } = await supabaseClient
            .from('logs')
            .insert({
                goal_id: goal.id,
                entry: entryText,
                date: getLocalDateString(),
                user_id: user.id
            })
            .select('*')
            .single();

        if (logError) {
            console.error('Error creating log:', logError);
            return { newLog: null, statsUpdated: false };
        }

        if (contentIds && contentIds.length > 0) {
            const linksToCreate = contentIds.map(contentId => ({
                log_id: newLog.id,
                content_id: contentId
            }));
            const { error: linkError } = await supabaseClient.from('log_content').insert(linksToCreate);
            if (linkError) console.error('Error linking content:', linkError);
        }

        if (goal.repertoire_id) {
            await supabaseClient.rpc('update_repertoire_stats', { rep_id: goal.repertoire_id });
            return { newLog, statsUpdated: true };
        }

        return { newLog, statsUpdated: false };
    },
    
    async updateLog(logId, newEntry) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('logs')
            .update({ entry: newEntry })
            .eq('id', logId);
        if (error) console.error('Error updating log:', error);
    },

    async deleteLog(log, goal) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient.from('logs').delete().eq('id', log.id);
        if (error) {
            console.error('Error deleting log:', error);
            return false;
        }

        if (goal.repertoire_id) {
            await supabaseClient.rpc('update_repertoire_stats', { rep_id: goal.repertoire_id });
            return true;
        }
        return false;
    },

    async fetchLogsByDateRange(startDate, endDate) {
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient
            .from('logs')
            .select('*, goals(*, topics(*))')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching logs:', error);
            return [];
        }
        return data;
    },
};
