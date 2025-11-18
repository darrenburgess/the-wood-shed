import { getSupabaseClient } from './supabase'
import { getTodayDateET } from './dateUtils'

export { getTodayDateET }

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

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching tags:', error)
    throw error
  }

  return data || []
}

/**
 * Search tags by name
 * @param {string} searchTerm - Search term to filter tags
 * @returns {Promise<Array>} Array of matching tags
 */
export async function searchTags(searchTerm) {
  const supabase = getSupabaseClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Normalize search term
  const normalizedTerm = searchTerm.toLowerCase().trim()

  if (!normalizedTerm) {
    return []
  }

  const { data, error } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', user.id)
    .ilike('name', `%${normalizedTerm}%`)
    .order('name', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error searching tags:', error)
    throw error
  }

  return data || []
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

// ============================================================================
// REPERTOIRE FUNCTIONS
// ============================================================================

/**
 * Fetch all repertoire items for the current user with their tags
 * @returns {Promise<Array>} Array of repertoire items with tags
 */
export async function fetchRepertoire() {
  const supabase = getSupabaseClient()

  // Fetch all repertoire items
  const { data, error } = await supabase
    .from('repertoire')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching repertoire:', error)
    throw error
  }

  // Fetch tags for all repertoire items
  if (data.length === 0) {
    return []
  }

  const repertoireIds = data.map(item => item.id)
  const { data: tagLinks, error: tagError } = await supabase
    .from('entity_tags')
    .select('entity_id, tags(id, name)')
    .eq('entity_type', 'repertoire')
    .in('entity_id', repertoireIds)

  if (tagError) {
    console.error('Error fetching repertoire tags:', tagError)
  }

  // Map tags to repertoire items
  const tagsByRepertoireId = {}
  tagLinks?.forEach(link => {
    if (!tagsByRepertoireId[link.entity_id]) {
      tagsByRepertoireId[link.entity_id] = []
    }
    if (link.tags) {
      tagsByRepertoireId[link.entity_id].push(link.tags.name)
    }
  })

  // Combine repertoire with tags
  return data.map(item => ({
    ...item,
    tags: tagsByRepertoireId[item.id] || []
  }))
}

/**
 * Create a new repertoire item
 * @param {Object} repertoireData - Repertoire data {title, composer, tags}
 * @returns {Promise<Object|null>} Created repertoire item or null
 */
export async function createRepertoire(repertoireData) {
  const supabase = getSupabaseClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Insert into repertoire table (note: using 'artist' column name in DB)
  const { data: newRepertoire, error } = await supabase
    .from('repertoire')
    .insert({
      title: repertoireData.title,
      composer: repertoireData.composer,
      practice_count: 0,
      last_practiced: null,
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating repertoire:', error)
    throw error
  }

  // Handle tags if provided
  if (repertoireData.tags && repertoireData.tags.length > 0) {
    for (const tagName of repertoireData.tags) {
      const tag = await createTag(tagName)
      if (tag) {
        await linkRepertoireTag(newRepertoire.id, tag.id)
      }
    }
  }

  return newRepertoire
}

/**
 * Update an existing repertoire item
 * @param {number} id - Repertoire ID
 * @param {Object} repertoireData - Updated repertoire data {title, composer, tags}
 * @returns {Promise<Object|null>} Updated repertoire item or null
 */
export async function updateRepertoire(id, repertoireData) {
  const supabase = getSupabaseClient()

  // Update repertoire (note: using 'artist' column name in DB)
  const { data: updatedRepertoire, error } = await supabase
    .from('repertoire')
    .update({
      title: repertoireData.title,
      composer: repertoireData.composer
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating repertoire:', error)
    throw error
  }

  // Sync tags if provided
  if (repertoireData.tags !== undefined) {
    await syncRepertoireTags(id, repertoireData.tags)
  }

  return updatedRepertoire
}

/**
 * Delete a repertoire item
 * @param {number} id - Repertoire ID
 * @returns {Promise<void>}
 */
export async function deleteRepertoire(id) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('repertoire')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting repertoire:', error)
    throw error
  }
}

/**
 * Link a tag to a repertoire item
 * @param {number} repertoireId - Repertoire ID
 * @param {number} tagId - Tag ID
 * @returns {Promise<void>}
 */
export async function linkRepertoireTag(repertoireId, tagId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('entity_tags')
    .insert({ entity_type: 'repertoire', entity_id: repertoireId, tag_id: tagId })

  // Ignore if already exists
  if (error && error.code !== '23505') {
    console.error('Error linking tag to repertoire:', error)
    throw error
  }
}

/**
 * Unlink a tag from a repertoire item
 * @param {number} repertoireId - Repertoire ID
 * @param {number} tagId - Tag ID
 * @returns {Promise<void>}
 */
export async function unlinkRepertoireTag(repertoireId, tagId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('entity_tags')
    .delete()
    .match({ entity_type: 'repertoire', entity_id: repertoireId, tag_id: tagId })

  if (error) {
    console.error('Error unlinking tag from repertoire:', error)
    throw error
  }
}

/**
 * Sync tags for a repertoire item (add new, remove old)
 * @param {number} repertoireId - Repertoire ID
 * @param {Array} newTagNames - Array of tag names
 * @returns {Promise<void>}
 */
export async function syncRepertoireTags(repertoireId, newTagNames) {
  const supabase = getSupabaseClient()

  // Get current tags for this repertoire
  const { data: currentTagLinks, error: fetchError } = await supabase
    .from('entity_tags')
    .select('tag_id, tags(id, name)')
    .eq('entity_type', 'repertoire')
    .eq('entity_id', repertoireId)

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
    await unlinkRepertoireTag(repertoireId, tagId)
  }

  // Add new tags
  const tagsToAdd = newTagIds.filter(id => !currentTagIds.includes(id))
  for (const tagId of tagsToAdd) {
    await linkRepertoireTag(repertoireId, tagId)
  }
}

// ============================================================================
// REPERTOIRE STATS FUNCTIONS
// ============================================================================

/**
 * Update repertoire statistics based on linked logs
 * This function calculates practice_count and last_practiced from all logs
 * linked to this repertoire (both directly via log_repertoire and indirectly via goals)
 * @param {number} repertoireId - Repertoire ID
 * @returns {Promise<void>}
 */
export async function updateRepertoireStats(repertoireId) {
  const supabase = getSupabaseClient()

  try {
    // Collect all unique log IDs from both sources
    const allLogIds = new Set()

    // 1. Get log IDs from direct log_repertoire links
    const { data: directLinks, error: directError } = await supabase
      .from('log_repertoire')
      .select('log_id')
      .eq('repertoire_id', repertoireId)

    if (directError) {
      console.error('Error fetching direct log links:', directError)
      throw directError
    }

    directLinks?.forEach(link => {
      if (link.log_id) {
        allLogIds.add(link.log_id)
      }
    })

    // 2. Get log IDs from goals with this repertoire
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id')
      .eq('repertoire_id', repertoireId)

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      throw goalsError
    }

    if (goals && goals.length > 0) {
      const goalIds = goals.map(g => g.id)
      const { data: goalLogIds, error: goalLogsError } = await supabase
        .from('logs')
        .select('id')
        .in('goal_id', goalIds)

      if (goalLogsError) {
        console.error('Error fetching goal logs:', goalLogsError)
        throw goalLogsError
      }

      goalLogIds?.forEach(log => {
        allLogIds.add(log.id)
      })
    }

    // 3. Get actual log data for all unique log IDs
    let practiceCount = 0
    let lastPracticed = null

    if (allLogIds.size > 0) {
      const logIdsArray = Array.from(allLogIds)
      const { data: logs, error: logsError } = await supabase
        .from('logs')
        .select('id, date')
        .in('id', logIdsArray)
        .order('date', { ascending: false })

      if (logsError) {
        console.error('Error fetching logs:', logsError)
        throw logsError
      }

      practiceCount = logs?.length || 0
      lastPracticed = logs && logs.length > 0 ? logs[0].date : null
    }

    // Update the repertoire record
    const { error: updateError } = await supabase
      .from('repertoire')
      .update({
        practice_count: practiceCount,
        last_practiced: lastPracticed
      })
      .eq('id', repertoireId)

    if (updateError) {
      console.error('Error updating repertoire stats:', updateError)
      throw updateError
    }

    return { practiceCount, lastPracticed }
  } catch (error) {
    console.error(`Failed to update stats for repertoire ${repertoireId}:`, error)
    // Don't throw - we want other operations to continue even if stats update fails
    return null
  }
}

/**
 * Recalculate statistics for all repertoire items
 * This is a migration/maintenance function to fix existing data
 * @returns {Promise<Object>} Summary of the operation {total, successful, failed, errors}
 */
export async function recalculateAllRepertoireStats() {
  const supabase = getSupabaseClient()

  console.log('Starting recalculation of all repertoire stats...')

  // Fetch all repertoire IDs
  const { data: repertoireItems, error } = await supabase
    .from('repertoire')
    .select('id, title')
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching repertoire items:', error)
    throw error
  }

  const total = repertoireItems.length
  let successful = 0
  let failed = 0
  const errors = []

  console.log(`Found ${total} repertoire items to process`)

  // Process each repertoire item
  for (const item of repertoireItems) {
    try {
      await updateRepertoireStats(item.id)
      successful++
      console.log(`[${successful + failed}/${total}] Updated: ${item.title}`)
    } catch (error) {
      failed++
      const errorMsg = `Failed to update ${item.title} (ID: ${item.id}): ${error.message}`
      console.error(errorMsg)
      errors.push(errorMsg)
    }
  }

  const summary = {
    total,
    successful,
    failed,
    errors
  }

  console.log('Recalculation complete:', summary)
  return summary
}

// ============================================================================
// LOGS FUNCTIONS
// ============================================================================

/**
 * Fetch logs by date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of log items with goals, content, and repertoire
 */
export async function fetchLogsByDateRange(startDate, endDate) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('logs')
    .select('*, goals(*, topics(*)), log_content(content(*)), log_repertoire(repertoire(*))')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching logs:', error)
    throw error
  }

  // Transform data to flatten content and repertoire arrays
  return data.map(log => ({
    ...log,
    content: log.log_content?.map(lc => lc.content).filter(Boolean) || [],
    repertoire: log.log_repertoire?.map(lr => lr.repertoire).filter(Boolean) || []
  }))
}

// ============================================================================
// TOPICS FUNCTIONS
// ============================================================================

/**
 * Fetch all topics with nested goals and logs for current user
 * @returns {Promise<Array>} Array of topics with complete hierarchy
 */
export async function fetchTopicsWithGoalsAndLogs() {
  const supabase = getSupabaseClient()

  const { data: topics, error } = await supabase
    .from('topics')
    .select(`
      id,
      topic_number,
      title,
      created_at,
      goals (
        id,
        description,
        goal_number,
        is_complete,
        date_completed,
        created_at,
        repertoire_id,
        repertoire (*),
        goal_content (
          content (*)
        ),
        logs (
          id,
          entry,
          date,
          created_at,
          log_content (
            content (*)
          ),
          log_repertoire (
            repertoire (*)
          )
        )
      )
    `)
    .order('topic_number', { ascending: true })
    .order('created_at', { foreignTable: 'goals.logs', ascending: false })

  if (error) {
    console.error('Error fetching topics:', error)
    throw error
  }

  // Transform and sort data
  const today = getTodayDateET()

  for (const topic of topics) {
    if (topic.goals) {
      // Sort goals by goal_number descending (newest first)
      topic.goals.sort((a, b) => {
        const aNum = Number(a.goal_number.split('.')[1] || 0)
        const bNum = Number(b.goal_number.split('.')[1] || 0)
        return bNum - aNum
      })

      for (const goal of topic.goals) {
        // Flatten goal content array
        goal.content = goal.goal_content?.map(gc => gc.content).filter(Boolean) || []
        // Goal has a single repertoire (direct foreign key), convert to array for consistent UI
        goal.repertoire = goal.repertoire ? [goal.repertoire] : []

        if (goal.logs) {
          for (const log of goal.logs) {
            log.isToday = log.date === today
            // Flatten log content and repertoire arrays
            log.content = log.log_content?.map(lc => lc.content).filter(Boolean) || []
            log.repertoire = log.log_repertoire?.map(lr => lr.repertoire).filter(Boolean) || []
          }
        } else {
          goal.logs = []
        }
      }
    } else {
      topic.goals = []
    }
  }

  return topics
}

/**
 * Create a new topic
 * @param {string} title - Topic title
 * @returns {Promise<Object>} Created topic
 */
export async function createTopic(title) {
  const supabase = getSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get highest topic_number for this user
  const { data: topics, error: fetchError } = await supabase
    .from('topics')
    .select('topic_number')
    .order('topic_number', { ascending: false })
    .limit(1)

  if (fetchError) {
    console.error('Error fetching latest topic number:', fetchError)
    throw fetchError
  }

  const nextTopicNumber = topics.length > 0 ? topics[0].topic_number + 1 : 1

  const { data: newTopic, error } = await supabase
    .from('topics')
    .insert({
      title,
      topic_number: nextTopicNumber,
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating topic:', error)
    throw error
  }

  return { ...newTopic, goals: [] }
}

/**
 * Update a topic
 * @param {number} topicId - Topic ID
 * @param {string} title - New title
 * @returns {Promise<void>}
 */
export async function updateTopic(topicId, title) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('topics')
    .update({ title })
    .eq('id', topicId)

  if (error) {
    console.error('Error updating topic:', error)
    throw error
  }
}

/**
 * Delete a topic (cascades to goals and logs)
 * @param {number} topicId - Topic ID
 * @returns {Promise<void>}
 */
export async function deleteTopic(topicId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('id', topicId)

  if (error) {
    console.error('Error deleting topic:', error)
    throw error
  }
}

/**
 * Create a new goal
 * @param {number} topicId - Parent topic ID
 * @param {number} topicNumber - Topic number for goal_number calculation
 * @param {string} description - Goal description
 * @param {number} nextSubNumber - Next sub-number for this topic
 * @returns {Promise<Object>} Created goal
 */
export async function createGoal(topicId, topicNumber, description, nextSubNumber) {
  const supabase = getSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const goalNumber = `${topicNumber}.${nextSubNumber}`

  const { data: newGoal, error } = await supabase
    .from('goals')
    .insert({
      topic_id: topicId,
      description,
      goal_number: goalNumber,
      is_complete: false,
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating goal:', error)
    throw error
  }

  return { ...newGoal, logs: [] }
}

/**
 * Update a goal
 * @param {number} goalId - Goal ID
 * @param {Object} data - Update data {description, is_complete, date_completed}
 * @returns {Promise<Object>} Updated goal
 */
export async function updateGoal(goalId, data) {
  const supabase = getSupabaseClient()

  const { data: updatedGoal, error } = await supabase
    .from('goals')
    .update(data)
    .eq('id', goalId)
    .select()
    .single()

  if (error) {
    console.error('Error updating goal:', error)
    throw error
  }

  return updatedGoal
}

/**
 * Delete a goal (cascades to logs)
 * @param {number} goalId - Goal ID
 * @returns {Promise<void>}
 */
export async function deleteGoal(goalId) {
  const supabase = getSupabaseClient()

  // Before deletion, collect all repertoire IDs that will be affected
  const repertoireIds = new Set()

  // 1. Get the goal's direct repertoire link
  const { data: goalData, error: goalError } = await supabase
    .from('goals')
    .select('repertoire_id')
    .eq('id', goalId)
    .single()

  if (!goalError && goalData?.repertoire_id) {
    repertoireIds.add(goalData.repertoire_id)
  }

  // 2. Get all logs for this goal and their linked repertoire
  const { data: logs, error: logsError } = await supabase
    .from('logs')
    .select('id, log_repertoire(repertoire_id)')
    .eq('goal_id', goalId)

  if (!logsError && logs) {
    logs.forEach(log => {
      if (log.log_repertoire && Array.isArray(log.log_repertoire)) {
        log.log_repertoire.forEach(lr => {
          if (lr.repertoire_id) {
            repertoireIds.add(lr.repertoire_id)
          }
        })
      } else if (log.log_repertoire?.repertoire_id) {
        repertoireIds.add(log.log_repertoire.repertoire_id)
      }
    })
  }

  // Delete the goal (logs will cascade delete)
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)

  if (error) {
    console.error('Error deleting goal:', error)
    throw error
  }

  // Update stats for all affected repertoire
  for (const repertoireId of repertoireIds) {
    const stats = await updateRepertoireStats(repertoireId)

    // Dispatch event to notify other components
    if (typeof window !== 'undefined' && stats) {
      window.dispatchEvent(new CustomEvent('repertoire-stats-updated', {
        detail: { repertoireId, stats }
      }))
    }
  }
}

/**
 * Create a new log
 * @param {number} goalId - Parent goal ID
 * @param {string} entry - Log entry text
 * @param {string} date - Log date (YYYY-MM-DD)
 * @returns {Promise<Object>} Created log
 */
export async function createLog(goalId, entry, date) {
  const supabase = getSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: newLog, error } = await supabase
    .from('logs')
    .insert({
      goal_id: goalId,
      entry,
      date,
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating log:', error)
    throw error
  }

  // Update stats for repertoire linked to this goal
  // Get the goal's repertoire (if any)
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('repertoire_id')
    .eq('id', goalId)
    .single()

  if (!goalError && goal?.repertoire_id) {
    // Update stats for this repertoire before returning so events see updated data
    await updateRepertoireStats(goal.repertoire_id)
  }

  return { ...newLog, content: [], repertoire: [] }
}

/**
 * Update a log
 * @param {number} logId - Log ID
 * @param {Object} data - Update data {entry, date}
 * @returns {Promise<void>}
 */
export async function updateLog(logId, data) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('logs')
    .update(data)
    .eq('id', logId)

  if (error) {
    console.error('Error updating log:', error)
    throw error
  }
}

/**
 * Delete a log
 * @param {number} logId - Log ID
 * @returns {Promise<void>}
 */
export async function deleteLog(logId) {
  const supabase = getSupabaseClient()

  // Before deletion, get all repertoire linked to this log
  // 1. Direct links via log_repertoire
  const { data: directLinks, error: directError } = await supabase
    .from('log_repertoire')
    .select('repertoire_id')
    .eq('log_id', logId)

  // 2. Indirect links via the log's goal
  const { data: logData, error: logError } = await supabase
    .from('logs')
    .select('goal_id, goals(repertoire_id)')
    .eq('id', logId)
    .single()

  // Collect all unique repertoire IDs
  const repertoireIds = new Set()

  if (!directError && directLinks) {
    directLinks.forEach(link => {
      if (link.repertoire_id) {
        repertoireIds.add(link.repertoire_id)
      }
    })
  }

  if (!logError && logData?.goals?.repertoire_id) {
    repertoireIds.add(logData.goals.repertoire_id)
  }

  // Delete the log
  const { error } = await supabase
    .from('logs')
    .delete()
    .eq('id', logId)

  if (error) {
    console.error('Error deleting log:', error)
    throw error
  }

  // Update stats for all affected repertoire
  for (const repertoireId of repertoireIds) {
    const stats = await updateRepertoireStats(repertoireId)

    // Dispatch event to notify other components
    if (typeof window !== 'undefined' && stats) {
      window.dispatchEvent(new CustomEvent('repertoire-stats-updated', {
        detail: { repertoireId, stats }
      }))
    }
  }
}

/**
 * Search content by title
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Matching content items
 */
export async function searchContentForLinking(searchTerm) {
  const supabase = getSupabaseClient()

  if (!searchTerm || searchTerm.length < 2) {
    return []
  }

  const { data, error } = await supabase
    .from('content')
    .select('id, title, url, type')
    .ilike('title', `%${searchTerm}%`)
    .order('title', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error searching content:', error)
    throw error
  }

  return data || []
}

/**
 * Search repertoire by title or composer
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Matching repertoire items
 */
export async function searchRepertoireForLinking(searchTerm) {
  const supabase = getSupabaseClient()

  if (!searchTerm || searchTerm.length < 2) {
    return []
  }

  const { data, error } = await supabase
    .from('repertoire')
    .select('id, title, composer')
    .or(`title.ilike.%${searchTerm}%,composer.ilike.%${searchTerm}%`)
    .order('title', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error searching repertoire:', error)
    throw error
  }

  return data || []
}

/**
 * Link content to a goal
 * @param {number} goalId - Goal ID
 * @param {number} contentId - Content ID
 * @returns {Promise<void>}
 */
export async function linkContentToGoal(goalId, contentId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('goal_content')
    .insert({ goal_id: goalId, content_id: contentId })

  // Ignore duplicate errors
  if (error && error.code !== '23505') {
    console.error('Error linking content to goal:', error)
    throw error
  }
}

/**
 * Unlink content from a goal
 * @param {number} goalId - Goal ID
 * @param {number} contentId - Content ID
 * @returns {Promise<void>}
 */
export async function unlinkContentFromGoal(goalId, contentId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('goal_content')
    .delete()
    .match({ goal_id: goalId, content_id: contentId })

  if (error) {
    console.error('Error unlinking content from goal:', error)
    throw error
  }
}

/**
 * Link repertoire to a log
 * @param {number} logId - Log ID
 * @param {number} repertoireId - Repertoire ID
 * @returns {Promise<void>}
 */
export async function linkRepertoireToLog(logId, repertoireId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('log_repertoire')
    .insert({ log_id: logId, repertoire_id: repertoireId })

  // Ignore duplicate errors
  if (error && error.code !== '23505') {
    console.error('Error linking repertoire to log:', error)
    throw error
  }

  // Update stats for this repertoire and return the updated data
  const stats = await updateRepertoireStats(repertoireId)

  // Dispatch event to notify other components
  if (typeof window !== 'undefined' && stats) {
    window.dispatchEvent(new CustomEvent('repertoire-stats-updated', {
      detail: { repertoireId, stats }
    }))
  }

  return stats
}

/**
 * Unlink repertoire from a log
 * @param {number} logId - Log ID
 * @param {number} repertoireId - Repertoire ID
 * @returns {Promise<void>}
 */
export async function unlinkRepertoireFromLog(logId, repertoireId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('log_repertoire')
    .delete()
    .match({ log_id: logId, repertoire_id: repertoireId })

  if (error) {
    console.error('Error unlinking repertoire from log:', error)
    throw error
  }

  // Update stats for this repertoire and return the updated data
  const stats = await updateRepertoireStats(repertoireId)

  // Dispatch event to notify other components
  if (typeof window !== 'undefined' && stats) {
    window.dispatchEvent(new CustomEvent('repertoire-stats-updated', {
      detail: { repertoireId, stats }
    }))
  }

  return stats
}

/**
 * Link content to a log
 * @param {number} logId - Log ID
 * @param {number} contentId - Content ID
 * @returns {Promise<void>}
 */
export async function linkContentToLog(logId, contentId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('log_content')
    .insert({ log_id: logId, content_id: contentId })

  // Ignore duplicate errors
  if (error && error.code !== '23505') {
    console.error('Error linking content to log:', error)
    throw error
  }
}

/**
 * Unlink content from a log
 * @param {number} logId - Log ID
 * @param {number} contentId - Content ID
 * @returns {Promise<void>}
 */
export async function unlinkContentFromLog(logId, contentId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('log_content')
    .delete()
    .match({ log_id: logId, content_id: contentId })

  if (error) {
    console.error('Error unlinking content from log:', error)
    throw error
  }
}

/**
 * Fetch content linked to a log
 * @param {number} logId - Log ID
 * @returns {Promise<Array>} Array of content items
 */
export async function fetchLogContent(logId) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('log_content')
    .select('content(*)')
    .eq('log_id', logId)

  if (error) {
    console.error('Error fetching log content:', error)
    throw error
  }

  return data?.map(item => item.content).filter(Boolean) || []
}

/**
 * Fetch repertoire linked to a log
 * @param {number} logId - Log ID
 * @returns {Promise<Array>} Array of repertoire items
 */
export async function fetchLogRepertoire(logId) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('log_repertoire')
    .select('repertoire(*)')
    .eq('log_id', logId)

  if (error) {
    console.error('Error fetching log repertoire:', error)
    throw error
  }

  return data?.map(item => item.repertoire).filter(Boolean) || []
}

/**
 * Fetch today's practice session
 * @returns {Promise<Object|null>} Session with session_goals or null
 */
export async function fetchTodaySession() {
  const supabase = getSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const today = getTodayDateET()

  // Fetch session without nested query to avoid RLS issues
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('session_date', today)
    .maybeSingle()

  if (sessionError) {
    console.error('Error fetching today session:', sessionError)
    throw sessionError
  }

  if (!session) {
    return null
  }

  // Separately fetch session_goals
  const { data: sessionGoals, error: goalsError } = await supabase
    .from('session_goals')
    .select('goal_id')
    .eq('session_id', session.id)

  if (goalsError) {
    console.error('Error fetching session goals:', goalsError)
    throw goalsError
  }

  return {
    id: session.id,
    session_goals: sessionGoals || []
  }
}

/**
 * Add a goal to a session (creates session if needed)
 * @param {number} goalId - Goal ID to add
 * @param {string} targetDate - Target date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<void>}
 */
export async function addGoalToSession(goalId, targetDate = null) {
  const supabase = getSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const sessionDate = targetDate || getTodayDateET()

  // Get or create session for the target date
  let { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('session_date', sessionDate)
    .single()

  if (sessionError && sessionError.code === 'PGRST116') {
    // Create session if it doesn't exist
    const { data: newSession, error: createError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_date: sessionDate
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating session:', createError)
      throw createError
    }

    session = newSession
  } else if (sessionError) {
    console.error('Error fetching session:', sessionError)
    throw sessionError
  }

  // Check if goal is already in the session
  const { data: existingLink, error: checkError } = await supabase
    .from('session_goals')
    .select('id')
    .eq('session_id', session.id)
    .eq('goal_id', goalId)
    .maybeSingle()

  if (checkError) {
    console.error('Error checking for existing goal:', checkError)
    throw checkError
  }

  if (existingLink) {
    throw new Error('This goal is already in the selected session')
  }

  // Add goal to session
  const { error: linkError } = await supabase
    .from('session_goals')
    .insert({
      session_id: session.id,
      goal_id: goalId
    })

  if (linkError) {
    console.error('Error adding goal to session:', linkError)
    throw linkError
  }
}

/**
 * Remove a goal from today's session
 * @param {number} goalId - Goal ID to remove
 * @returns {Promise<void>}
 */
export async function removeGoalFromSession(goalId) {
  const supabase = getSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const today = getTodayDateET()

  // Get today's session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('session_date', today)
    .single()

  if (sessionError) {
    console.error('Error fetching session:', sessionError)
    return // Session doesn't exist, nothing to remove
  }

  // Remove goal from session
  const { error } = await supabase
    .from('session_goals')
    .delete()
    .match({ session_id: session.id, goal_id: goalId })

  if (error) {
    console.error('Error removing goal from session:', error)
    throw error
  }
}

/**
 * Fetch content linked to a specific goal
 * @param {number} goalId - Goal ID
 * @returns {Promise<Array>} Array of content items
 */
export async function fetchGoalContent(goalId) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('goal_content')
    .select('content(*)')
    .eq('goal_id', goalId)

  if (error) {
    console.error('Error fetching goal content:', error)
    throw error
  }

  return data?.map(item => item.content).filter(Boolean) || []
}

/**
 * Link repertoire to a goal
 * @param {number} goalId - Goal ID
 * @param {number} repertoireId - Repertoire ID
 * @returns {Promise<void>}
 */
export async function linkRepertoireToGoal(goalId, repertoireId) {
  const supabase = getSupabaseClient()

  // Update the goal's repertoire_id (direct foreign key)
  const { error } = await supabase
    .from('goals')
    .update({ repertoire_id: repertoireId })
    .eq('id', goalId)

  if (error) {
    console.error('Error linking repertoire to goal:', error)
    throw error
  }

  // Update stats for this repertoire (this will include all logs from this goal)
  const stats = await updateRepertoireStats(repertoireId)

  // Dispatch event to notify other components
  if (typeof window !== 'undefined' && stats) {
    window.dispatchEvent(new CustomEvent('repertoire-stats-updated', {
      detail: { repertoireId, stats }
    }))
  }

  return stats
}

/**
 * Unlink repertoire from a goal
 * @param {number} goalId - Goal ID
 * @param {number} repertoireId - Repertoire ID (not used, kept for API compatibility)
 * @returns {Promise<void>}
 */
export async function unlinkRepertoireFromGoal(goalId, repertoireId) {
  const supabase = getSupabaseClient()

  // Set the goal's repertoire_id to null
  const { error } = await supabase
    .from('goals')
    .update({ repertoire_id: null })
    .eq('id', goalId)

  if (error) {
    console.error('Error unlinking repertoire from goal:', error)
    throw error
  }

  // Update stats for this repertoire (logs from this goal will no longer count)
  const stats = await updateRepertoireStats(repertoireId)

  // Dispatch event to notify other components
  if (typeof window !== 'undefined' && stats) {
    window.dispatchEvent(new CustomEvent('repertoire-stats-updated', {
      detail: { repertoireId, stats }
    }))
  }

  return stats
}

/**
 * Fetch repertoire linked to a specific goal
 * @param {number} goalId - Goal ID
 * @returns {Promise<Array>} Array with single repertoire item (or empty)
 */
export async function fetchGoalRepertoire(goalId) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('goals')
    .select('repertoire(*)')
    .eq('id', goalId)
    .single()

  if (error) {
    console.error('Error fetching goal repertoire:', error)
    throw error
  }

  // Return as array for consistent UI handling (0 or 1 items)
  return data?.repertoire ? [data.repertoire] : []
}

// ============================================================================
// Practice Today / Sessions
// ============================================================================

/**
 * Fetch session by date with all goals and logs
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Session with goals or null if no session exists
 */
export async function fetchSessionByDate(date) {
  const supabase = getSupabaseClient()

  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      id,
      session_date,
      created_at,
      session_goals (
        id,
        added_at,
        goals (
          id,
          description,
          goal_number,
          is_complete,
          created_at,
          topic_id,
          repertoire_id,
          repertoire (
            id,
            title,
            composer
          ),
          topics (
            id,
            title,
            topic_number
          ),
          goal_content (
            content (
              id,
              title,
              url,
              type
            )
          ),
          logs (
            id,
            entry,
            date,
            created_at,
            log_content (
              content (
                id,
                title,
                url,
                type
              )
            ),
            log_repertoire (
              repertoire (
                id,
                title,
                composer
              )
            )
          )
        )
      )
    `)
    .eq('session_date', date)
    .order('added_at', { foreignTable: 'session_goals', ascending: true })
    .order('date', { foreignTable: 'session_goals.goals.logs', ascending: false })
    .maybeSingle()

  if (error) {
    console.error('Error fetching session:', error)
    throw error
  }

  if (!session) {
    return null
  }

  // Transform data structure for easier use in UI
  const transformedSession = {
    ...session,
    goals: session.session_goals?.map(sg => {
      const goal = sg.goals
      return {
        ...goal,
        session_goal_id: sg.id,
        topic: goal.topics,
        content: goal.goal_content?.map(gc => gc.content).filter(Boolean) || [],
        repertoire: goal.repertoire ? [goal.repertoire] : [],
        logs: goal.logs?.map(log => ({
          ...log,
          content: log.log_content?.map(lc => lc.content).filter(Boolean) || [],
          repertoire: log.log_repertoire?.map(lr => lr.repertoire).filter(Boolean) || []
        })) || []
      }
    }) || []
  }

  return transformedSession
}

/**
 * Create a new session for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Created session
 */
export async function createSession(date) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      session_date: date
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating session:', error)
    throw error
  }

  return data
}

/**
 * Delete a session and all its session_goals
 * @param {number} sessionId - Session ID
 * @returns {Promise<void>}
 */
export async function deleteSession(sessionId) {
  const supabase = getSupabaseClient()

  // Delete session_goals first (cascading might handle this, but being explicit)
  const { error: sessionGoalsError } = await supabase
    .from('session_goals')
    .delete()
    .eq('session_id', sessionId)

  if (sessionGoalsError) {
    console.error('Error deleting session goals:', sessionGoalsError)
    throw sessionGoalsError
  }

  // Delete the session
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('Error deleting session:', error)
    throw error
  }
}

/**
 * Remove a goal from a specific session (by session ID)
 * @param {number} sessionId - Session ID
 * @param {number} goalId - Goal ID
 * @returns {Promise<void>}
 */
export async function removeGoalFromSessionById(sessionId, goalId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('session_goals')
    .delete()
    .eq('session_id', sessionId)
    .eq('goal_id', goalId)

  if (error) {
    console.error('Error removing goal from session:', error)
    throw error
  }
}

/**
 * Search repertoire by title or composer
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching repertoire items
 */
export async function searchRepertoire(searchTerm) {
  const supabase = getSupabaseClient()

  if (!searchTerm || searchTerm.length < 2) {
    return []
  }

  const { data, error } = await supabase
    .from('repertoire')
    .select('id, title, composer')
    .or(`title.ilike.%${searchTerm}%,composer.ilike.%${searchTerm}%`)
    .order('title', { ascending: true })
    .limit(20)

  if (error) {
    console.error('Error searching repertoire:', error)
    throw error
  }

  return data || []
}
