import { getSupabaseClient } from '/supabase.js';
import { getLocalDateString } from '/utils.js';

export const logData = {
    async addLog(goal, entryText, contentIds = [], repertoireIds = []) {
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

        if (repertoireIds && repertoireIds.length > 0) {
            const linksToCreate = repertoireIds.map(repertoireId => ({
                log_id: newLog.id,
                repertoire_id: repertoireId
            }));
            const { error: linkError } = await supabaseClient.from('log_repertoire').insert(linksToCreate);
            if (linkError) console.error('Error linking repertoire:', linkError);
        }

        // Collect all repertoire IDs that need stats updates
        const repertoireIdsToUpdate = new Set();
        if (goal.repertoire_id) {
            repertoireIdsToUpdate.add(goal.repertoire_id);
        }
        if (repertoireIds && repertoireIds.length > 0) {
            repertoireIds.forEach(id => repertoireIdsToUpdate.add(id));
        }

        // Update stats for all affected repertoire items
        if (repertoireIdsToUpdate.size > 0) {
            for (const repId of repertoireIdsToUpdate) {
                const { error: rpcError } = await supabaseClient.rpc('update_repertoire_stats', { rep_id: repId });
                if (rpcError) {
                    console.error('Error updating repertoire stats:', rpcError);
                }
            }
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

        // Collect repertoire IDs before deleting
        const repertoireIdsToUpdate = new Set();
        if (goal.repertoire_id) {
            repertoireIdsToUpdate.add(goal.repertoire_id);
        }
        if (log.repertoire && log.repertoire.length > 0) {
            log.repertoire.forEach(rep => repertoireIdsToUpdate.add(rep.id));
        }

        const { error } = await supabaseClient.from('logs').delete().eq('id', log.id);
        if (error) {
            console.error('Error deleting log:', error);
            return false;
        }

        // Update stats for all affected repertoire items
        if (repertoireIdsToUpdate.size > 0) {
            for (const repId of repertoireIdsToUpdate) {
                const { error: rpcError } = await supabaseClient.rpc('update_repertoire_stats', { rep_id: repId });
                if (rpcError) {
                    console.error('Error updating repertoire stats:', rpcError);
                }
            }
            return true;
        }
        return false;
    },

    async fetchLogsByDateRange(startDate, endDate) {
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient
            .from('logs')
            .select('*, goals(*, topics(*)), log_content(content(*)), log_repertoire(repertoire(*))')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching logs:', error);
            return [];
        }

        // Transform data to flatten content and repertoire arrays
        return data.map(log => ({
            ...log,
            content: log.log_content?.map(lc => lc.content).filter(Boolean) || [],
            repertoire: log.log_repertoire?.map(lr => lr.repertoire).filter(Boolean) || []
        }));
    },
};
