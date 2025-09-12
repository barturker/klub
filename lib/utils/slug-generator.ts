import slugify from 'slugify';
import { createClient } from '@/lib/supabase/server';

export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });

  const supabase = await createClient();
  
  let slug = baseSlug;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const { data } = await supabase
      .from('communities')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (!data) {
      // Slug is available
      isUnique = true;
    } else {
      // Slug is taken, try next one
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  return slug;
}

export function createSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
}