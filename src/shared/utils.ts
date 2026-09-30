import { extname } from 'path';

export function safeExtension(originalName: string): string {
  const extension = extname(originalName).toLowerCase();

  const allowedExtensions = new Set(['.jpg', '.png', '.webp', '.jpeg', '.svg']);

  if (!allowedExtensions.has(extension)) {
    return '';
  }

  return extension;
}
