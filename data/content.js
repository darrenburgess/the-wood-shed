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

    // Tag management functions
    async searchTags(searchTerm) {
        const supabaseClient = getSupabaseClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user || !searchTerm) return [];

        const { data, error } = await supabaseClient
            .from('tags')
            .select('id, name')
            .eq('user_id', user.id)
            .ilike('name', `%${searchTerm}%`)
            .order('name')
            .limit(10);

        if (error) {
            console.error('Error searching tags:', error);
            return [];
        }
        return data || [];
    },

    async createTag(tagName) {
        const supabaseClient = getSupabaseClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabaseClient
            .from('tags')
            .insert({ name: tagName.toLowerCase().trim(), user_id: user.id })
            .select()
            .single();

        if (error) {
            // If tag already exists, fetch it
            if (error.code === '23505') { // unique violation
                const { data: existingTag } = await supabaseClient
                    .from('tags')
                    .select('id, name')
                    .eq('user_id', user.id)
                    .eq('name', tagName.toLowerCase().trim())
                    .single();
                return existingTag;
            }
            console.error('Error creating tag:', error);
            return null;
        }
        return data;
    },

    async linkTagToContent(contentId, tagId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('content_tags')
            .insert({ content_id: contentId, tag_id: tagId });

        if (error && error.code !== '23505') { // Ignore if already exists
            console.error('Error linking tag to content:', error);
        }
    },

    async unlinkTagFromContent(contentId, tagId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('content_tags')
            .delete()
            .match({ content_id: contentId, tag_id: tagId });

        if (error) {
            console.error('Error unlinking tag from content:', error);
        }
    },

    async syncContentTags(contentId, newTags) {
        // newTags is an array of tag objects: [{ id, name }, ...]
        const supabaseClient = getSupabaseClient();

        // Get current tags for this content
        const { data: currentTagLinks, error: fetchError } = await supabaseClient
            .from('content_tags')
            .select('tag_id')
            .eq('content_id', contentId);

        if (fetchError) {
            console.error('Error fetching current tags:', fetchError);
            return;
        }

        const currentTagIds = currentTagLinks?.map(ct => ct.tag_id) || [];
        const newTagIds = newTags.map(t => t.id);

        // Remove tags that are no longer selected
        const tagsToRemove = currentTagIds.filter(id => !newTagIds.includes(id));
        for (const tagId of tagsToRemove) {
            await this.unlinkTagFromContent(contentId, tagId);
        }

        // Add new tags
        const tagsToAdd = newTagIds.filter(id => !currentTagIds.includes(id));
        for (const tagId of tagsToAdd) {
            await this.linkTagToContent(contentId, tagId);
        }
    },
};
