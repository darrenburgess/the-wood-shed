import { getSupabaseClient } from '/supabase.js';

export const contentData = {
    async searchContent(searchTerm) {
        const supabaseClient = getSupabaseClient();
        if (!searchTerm || searchTerm.length < 2) return [];
        const { data, error } = await supabaseClient
            .from('content')
            .select('id, title')
            .ilike('title', `%${searchTerm}%`)
            .limit(10);
        if (error) console.error('Error searching content:', error);
        return data || [];
    },

    async fetchContentLibrary() {
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient
            .from('content')
            .select('*, content_tags(tags(id, name))')
            .order('created_at', { descending: true });

        if (error) {
            console.error('Error fetching content library:', error);
            return [];
        }

        // Transform the data to flatten tags array
        return data.map(item => ({
            ...item,
            tags: item.content_tags?.map(ct => ct.tags).filter(Boolean) || []
        }));
    },

    async createContent(title, url, type) {
        const supabaseClient = getSupabaseClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        const { data: newContent, error } = await supabaseClient
            .from('content')
            .insert({ title, url, type, user_id: user.id })
            .select()
            .single();

        if (error) {
            console.error('Error creating content:', error);
            return null;
        }
        return newContent;
    },

    async updateContent(contentId, title, url, type) {
        const supabaseClient = getSupabaseClient();
        const { data: updatedContent, error } = await supabaseClient
            .from('content')
            .update({ title, url, type })
            .eq('id', contentId)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating content:', error);
            return null;
        }
        return updatedContent;
    },

    async deleteContent(contentId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('content')
            .delete()
            .eq('id', contentId);

        if (error) {
            console.error('Error deleting content:', error);
        }
    },

    async linkContentToGoal(goalId, contentId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('goal_content')
            .insert({ goal_id: goalId, content_id: contentId });

        if (error) {
            console.error('Error linking content to goal:', error);
        }
    },

    async unlinkContentFromGoal(goalId, contentId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('goal_content')
            .delete()
            .match({ goal_id: goalId, content_id: contentId });

        if (error) {
            console.error('Error unlinking content from goal:', error);
        }
    },

    async linkContentToLog(logId, contentId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('log_content')
            .insert({ log_id: logId, content_id: contentId });

        if (error) {
            console.error('Error linking content to log:', error);
        }
    },

    async unlinkContentFromLog(logId, contentId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('log_content')
            .delete()
            .match({ log_id: logId, content_id: contentId });

        if (error) {
            console.error('Error unlinking content from log:', error);
        }
    },
};
