import { getSupabaseClient } from './supabase'

/**
 * Fetch all content items for the current user with their tags
 * @returns {Promise<Array>} Array of content items with tags
 */
export async function fetchContent() {
  const supabase = getSupabaseClient()

  // Fetch all content items
  const { data, error } = await supabase
    .from('content')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching content:', error)
    throw error
  }

  // Fetch tags for all content items
  if (data.length === 0) {
    return []
  }

  const contentIds = data.map(item => item.id)
  const { data: tagLinks, error: tagError } = await supabase
    .from('entity_tags')
    .select('entity_id, tags(id, name)')
    .eq('entity_type', 'content')
    .in('entity_id', contentIds)

  if (tagError) {
    console.error('Error fetching content tags:', tagError)
  }

  // Map tags to content items
  const tagsByContentId = {}
  tagLinks?.forEach(link => {
    if (!tagsByContentId[link.entity_id]) {
      tagsByContentId[link.entity_id] = []
    }
    if (link.tags) {
      tagsByContentId[link.entity_id].push(link.tags.name)
    }
  })

  // Combine content with tags
  return data.map(item => ({
    ...item,
    tags: tagsByContentId[item.id] || []
  }))
}

/**
 * Search content by title
 * @param {string} searchTerm - Search term to filter content
 * @returns {Promise<Array>} Array of matching content items
 */
export async function searchContent(searchTerm) {
  const supabase = getSupabaseClient()

  // TODO: Implement content search
  // Use .ilike() to search title field

  return []
}

/**
 * Create a new content item
 * @param {Object} contentData - Content data {title, url, type, tags}
 * @returns {Promise<Object|null>} Created content item or null
 */
export async function createContent(contentData) {
  const supabase = getSupabaseClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Insert into content table
  const { data: newContent, error } = await supabase
    .from('content')
    .insert({
      title: contentData.title,
      url: contentData.url,
      type: contentData.type,
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating content:', error)
    throw error
  }

  // Handle tags if provided
  if (contentData.tags && contentData.tags.length > 0) {
    for (const tagName of contentData.tags) {
      const tag = await createTag(tagName)
      if (tag) {
        await linkContentTag(newContent.id, tag.id)
      }
    }
  }

  return newContent
}

/**
 * Update an existing content item
 * @param {number} id - Content ID
 * @param {Object} contentData - Updated content data {title, url, type, tags}
 * @returns {Promise<Object|null>} Updated content item or null
 */
export async function updateContent(id, contentData) {
  const supabase = getSupabaseClient()

  // Update content
  const { data: updatedContent, error } = await supabase
    .from('content')
    .update({
      title: contentData.title,
      url: contentData.url,
      type: contentData.type
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating content:', error)
    throw error
  }

  // Sync tags if provided
  if (contentData.tags !== undefined) {
    await syncContentTags(id, contentData.tags)
  }

  return updatedContent
}

/**
 * Delete a content item
 * @param {number} id - Content ID
 * @returns {Promise<void>}
 */
export async function deleteContent(id) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('content')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting content:', error)
    throw error
  }
}

/**
 * Fetch all tags for the current user
 * @returns {Promise<Array>} Array of tags
 */
export async function fetchTags() {
  const supabase = getSupabaseClient()

  // TODO: Implement fetching all user tags
  // Fetch tags ordered by name

  return []
}

/**
 * Search tags by name
 * @param {string} searchTerm - Search term to filter tags
 * @returns {Promise<Array>} Array of matching tags
 */
export async function searchTags(searchTerm) {
  const supabase = getSupabaseClient()

  // TODO: Implement tag search
  // Use .ilike() to search name field
  // Normalize search term (lowercase, trim)

  return []
}

/**
 * Create a new tag
 * @param {string} tagName - Tag name
 * @returns {Promise<Object|null>} Created tag or existing tag if duplicate
 */
export async function createTag(tagName) {
  const supabase = getSupabaseClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Normalize tag name
  const normalizedName = tagName.toLowerCase().trim()

  // Check if tag already exists
  const { data: existingTags, error: fetchError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('name', normalizedName)

  if (existingTags && existingTags.length > 0) {
    return existingTags[0]
  }

  // Create new tag
  const { data, error } = await supabase
    .from('tags')
    .insert({ name: normalizedName, user_id: user.id })
    .select()
    .single()

  if (error) {
    // Handle unique violation (race condition)
    if (error.code === '23505') {
      const { data: retryTags } = await supabase
        .from('tags')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('name', normalizedName)
      return retryTags && retryTags.length > 0 ? retryTags[0] : null
    }
    console.error('Error creating tag:', error)
    throw error
  }

  return data
}

/**
 * Link a tag to a content item
 * @param {number} contentId - Content ID
 * @param {number} tagId - Tag ID
 * @returns {Promise<void>}
 */
export async function linkContentTag(contentId, tagId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('entity_tags')
    .insert({ entity_type: 'content', entity_id: contentId, tag_id: tagId })

  // Ignore if already exists
  if (error && error.code !== '23505') {
    console.error('Error linking tag to content:', error)
    throw error
  }
}

/**
 * Unlink a tag from a content item
 * @param {number} contentId - Content ID
 * @param {number} tagId - Tag ID
 * @returns {Promise<void>}
 */
export async function unlinkContentTag(contentId, tagId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('entity_tags')
    .delete()
    .match({ entity_type: 'content', entity_id: contentId, tag_id: tagId })

  if (error) {
    console.error('Error unlinking tag from content:', error)
    throw error
  }
}

/**
 * Sync tags for a content item (add new, remove old)
 * @param {number} contentId - Content ID
 * @param {Array} newTagNames - Array of tag names
 * @returns {Promise<void>}
 */
export async function syncContentTags(contentId, newTagNames) {
  const supabase = getSupabaseClient()

  // Get current tags for this content
  const { data: currentTagLinks, error: fetchError } = await supabase
    .from('entity_tags')
    .select('tag_id, tags(id, name)')
    .eq('entity_type', 'content')
    .eq('entity_id', contentId)

  if (fetchError) {
    console.error('Error fetching current tags:', fetchError)
    throw fetchError
  }

  const currentTags = currentTagLinks?.map(link => ({
    id: link.tags.id,
    name: link.tags.name
  })) || []

  // Create tag objects for new tags
  const newTags = []
  for (const tagName of newTagNames) {
    const tag = await createTag(tagName)
    if (tag) {
      newTags.push(tag)
    }
  }

  const currentTagIds = currentTags.map(t => t.id)
  const newTagIds = newTags.map(t => t.id)

  // Remove tags that are no longer selected
  const tagsToRemove = currentTagIds.filter(id => !newTagIds.includes(id))
  for (const tagId of tagsToRemove) {
    await unlinkContentTag(contentId, tagId)
  }

  // Add new tags
  const tagsToAdd = newTagIds.filter(id => !currentTagIds.includes(id))
  for (const tagId of tagsToAdd) {
    await linkContentTag(contentId, tagId)
  }
}
