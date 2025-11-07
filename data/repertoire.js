import { getSupabaseClient } from '/supabase.js';

export const repertoireData = {
    async fetchRepertoire() {
        const supabaseClient = getSupabaseClient();

        // Fetch all repertoire items
        const { data, error } = await supabaseClient
            .from('repertoire')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching repertoire:', error);
            return [];
        }

        // Fetch tags for all repertoire items
        if (data.length === 0) {
            return [];
        }

        const repertoireIds = data.map(item => item.id);
        const { data: tagLinks, error: tagError } = await supabaseClient
            .from('entity_tags')
            .select('entity_id, tags(id, name)')
            .eq('entity_type', 'repertoire')
            .in('entity_id', repertoireIds);

        if (tagError) {
            console.error('Error fetching repertoire tags:', tagError);
        }

        // Map tags to repertoire items
        const tagsByRepertoireId = {};
        tagLinks?.forEach(link => {
            if (!tagsByRepertoireId[link.entity_id]) {
                tagsByRepertoireId[link.entity_id] = [];
            }
            if (link.tags) {
                tagsByRepertoireId[link.entity_id].push(link.tags);
            }
        });

        // Combine repertoire with tags
        return data.map(item => ({
            ...item,
            tags: tagsByRepertoireId[item.id] || []
        }));
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
    },

    // Tag management functions for repertoire
    async linkTagToRepertoire(repertoireId, tagId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('entity_tags')
            .insert({ entity_type: 'repertoire', entity_id: repertoireId, tag_id: tagId });

        if (error && error.code !== '23505') { // Ignore if already exists
            console.error('Error linking tag to repertoire:', error);
        }
    },

    async unlinkTagFromRepertoire(repertoireId, tagId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('entity_tags')
            .delete()
            .match({ entity_type: 'repertoire', entity_id: repertoireId, tag_id: tagId });

        if (error) {
            console.error('Error unlinking tag from repertoire:', error);
        }
    },

    async syncRepertoireTags(repertoireId, newTags) {
        // newTags is an array of tag objects: [{ id, name }, ...]
        const supabaseClient = getSupabaseClient();

        // Get current tags for this repertoire
        const { data: currentTagLinks, error: fetchError } = await supabaseClient
            .from('entity_tags')
            .select('tag_id')
            .eq('entity_type', 'repertoire')
            .eq('entity_id', repertoireId);

        if (fetchError) {
            console.error('Error fetching current tags:', fetchError);
            return;
        }

        const currentTagIds = currentTagLinks?.map(ct => ct.tag_id) || [];
        const newTagIds = newTags.map(t => t.id);

        // Remove tags that are no longer selected
        const tagsToRemove = currentTagIds.filter(id => !newTagIds.includes(id));
        for (const tagId of tagsToRemove) {
            await this.unlinkTagFromRepertoire(repertoireId, tagId);
        }

        // Add new tags
        const tagsToAdd = newTagIds.filter(id => !currentTagIds.includes(id));
        for (const tagId of tagsToAdd) {
            await this.linkTagToRepertoire(repertoireId, tagId);
        }
    }
};
