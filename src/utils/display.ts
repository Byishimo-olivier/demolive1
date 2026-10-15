/**
 * Utility functions for displaying populated MongoDB objects
 */

/**
 * Safely displays a user object or ID string
 * Handles populated user objects from MongoDB with fallback to string ID
 */
export function displayUser(user: any): string {
  if (!user) return '';
  
  if (typeof user === 'string') return user;
  
  // Handle populated user object
  return user.fullName || user.name || user.email || user._id || '';
}

/**
 * Safely displays a project object or ID string
 * Handles populated project objects from MongoDB with fallback to string ID
 */
export function displayProject(project: any): string {
  if (!project) return '';
  
  if (typeof project === 'string') return project;
  
  // Handle populated project object
  return project.name || project.title || project._id || '';
}

/**
 * Generic function to extract ID from populated MongoDB object or return string as-is
 * Used for form field population where we need the actual ID
 */
export function extractId(item: any): string {
  if (!item) return '';
  
  if (typeof item === 'string') return item;
  
  // Handle populated object
  return item._id || item.id || '';
}

/**
 * Generic function to display any populated object with common field fallbacks
 */
export function displayPopulated(item: any, fields: string[] = ['name', 'title', 'fullName']): string {
  if (!item) return '';
  
  if (typeof item === 'string') return item;
  
  // Try each field in order
  for (const field of fields) {
    if (item[field]) return item[field];
  }
  
  // Final fallback to ID
  return item._id || item.id || '';
}