/**
 * JSON utilities for Supabase/PostgreSQL compatibility
 */

import type { Json } from '@/lib/supabase/database.types'

/**
 * Removes undefined values from objects before sending to PostgreSQL
 * PostgreSQL JSONB doesn't store undefined values - they get dropped or converted unexpectedly
 * 
 * @example
 * const metadata = stripUndefined({
 *   name: "Event",
 *   description: undefined, // will be removed
 *   tags: ["music", undefined, "festival"], // undefined will be removed from array
 *   nested: {
 *     value: 123,
 *     empty: undefined // will be removed
 *   }
 * })
 * // Result: { name: "Event", tags: ["music", "festival"], nested: { value: 123 } }
 */
export function stripUndefined<T>(obj: T): T {
  // Handle primitives and null
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj !== 'object') {
    return obj
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => stripUndefined(item)) as T
  }
  
  // Handle objects
  const result: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) {
      result[key] = stripUndefined(value)
    }
  }
  
  return result as T
}

/**
 * Type guard to check if a value is valid JSON
 */
export function isValidJson(value: unknown): value is Json {
  if (value === null) return true
  if (typeof value === 'string') return true
  if (typeof value === 'number') return true
  if (typeof value === 'boolean') return true
  
  if (Array.isArray(value)) {
    return value.every(item => isValidJson(item))
  }
  
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).every(val => isValidJson(val))
  }
  
  return false
}

/**
 * Safely parse JSON string with error handling
 */
export function safeJsonParse<T = unknown>(
  jsonString: string,
  fallback?: T
): T | undefined {
  try {
    return JSON.parse(jsonString) as T
  } catch {
    return fallback
  }
}

/**
 * Prepare metadata object for database insertion
 * Removes undefined values and validates JSON structure
 */
export function prepareMetadata<T extends Record<string, unknown>>(
  metadata: T
): Json {
  const cleaned = stripUndefined(metadata)
  
  if (!isValidJson(cleaned)) {
    throw new Error('Invalid JSON structure for database')
  }
  
  return cleaned as Json
}

/**
 * Merge metadata objects safely
 * Useful for updating existing metadata without losing fields
 */
export function mergeMetadata(
  existing: Json | null,
  updates: Record<string, unknown>
): Json {
  const base = (existing && typeof existing === 'object' && !Array.isArray(existing)) 
    ? existing as Record<string, Json>
    : {}
  
  const cleanedUpdates = stripUndefined(updates)
  
  return {
    ...base,
    ...cleanedUpdates
  } as Json
}