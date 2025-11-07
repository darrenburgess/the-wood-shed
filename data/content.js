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

        // Fetch all content items
        const { data, error } = await supabaseClient
            .from('content')
            .select('*')
            .order('created_at', { descending: true });

        if (error) {
            console.error('Error fetching content library:', error);
            return [];
        }

        // Fetch tags for all content items
        if (data.length === 0) {
            return [];
        }

        const contentIds = data.map(item => item.id);
        const { data: tagLinks, error: tagError } = await supabaseClient
            .from('entity_tags')
            .select('entity_id, tags(id, name)')
            .eq('entity_type', 'content')
            .in('entity_id', contentIds);

        if (tagError) {
            console.error('Error fetching content tags:', tagError);
        }

        // Map tags to content items
        const tagsByContentId = {};
        tagLinks?.forEach(link => {
            if (!tagsByContentId[link.entity_id]) {
                tagsByContentId[link.entity_id] = [];
            }
            if (link.tags) {
                tagsByContentId[link.entity_id].push(link.tags);
            }
        });

        // Combine content with tags
        return data.map(item => ({
            ...item,
            tags: tagsByContentId[item.id] || []
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

        const normalizedSearch = searchTerm.toLowerCase().trim();

        const { data, error } = await supabaseClient
            .from('tags')
            .select('id, name')
            .eq('user_id', user.id)
            .ilike('name', `%${normalizedSearch}%`)
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

        const normalizedName = tagName.toLowerCase().trim();

        // First, check if tag already exists (exact match since we normalize)
        const { data: existingTags, error: fetchError } = await supabaseClient
            .from('tags')
            .select('id, name')
            .eq('user_id', user.id)
            .eq('name', normalizedName);

        if (existingTags && existingTags.length > 0) {
            return existingTags[0];
        }

        // If no existing tag, create new one
        const { data, error } = await supabaseClient
            .from('tags')
            .insert({ name: normalizedName, user_id: user.id })
            .select()
            .single();

        if (error) {
            // If tag already exists (race condition), fetch it
            if (error.code === '23505') { // unique violation
                const { data: retryTags } = await supabaseClient
                    .from('tags')
                    .select('id, name')
                    .eq('user_id', user.id)
                    .eq('name', normalizedName);
                return retryTags && retryTags.length > 0 ? retryTags[0] : null;
            }
            console.error('Error creating tag:', error);
            return null;
        }
        return data;
    },

    async linkTagToContent(contentId, tagId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('entity_tags')
            .insert({ entity_type: 'content', entity_id: contentId, tag_id: tagId });

        if (error && error.code !== '23505') { // Ignore if already exists
            console.error('Error linking tag to content:', error);
        }
    },

    async unlinkTagFromContent(contentId, tagId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('entity_tags')
            .delete()
            .match({ entity_type: 'content', entity_id: contentId, tag_id: tagId });

        if (error) {
            console.error('Error unlinking tag from content:', error);
        }
    },

    async syncContentTags(contentId, newTags) {
        // newTags is an array of tag objects: [{ id, name }, ...]
        const supabaseClient = getSupabaseClient();

        // Get current tags for this content
        const { data: currentTagLinks, error: fetchError } = await supabaseClient
            .from('entity_tags')
            .select('tag_id')
            .eq('entity_type', 'content')
            .eq('entity_id', contentId);

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
