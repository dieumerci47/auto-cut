/**
 * Cookie export helper for yt-dlp.
 *
 * Since Chrome locks its cookie database while running, we need
 * to export cookies when Chrome is briefly closed. This script:
 * 1. Attempts --cookies-from-browser chrome (works if Chrome is closed)
 * 2. Falls back to a cached cookies.txt if available
 * 3. Falls back to no cookies (some videos may not work)
 *
 * Run this script once with Chrome CLOSED to cache your cookies:
 *   node src/utils/export-cookies.js
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);
const ytdlpPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'yt-dlp.exe');
const COOKIES_FILE = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..', '..', 'cookies.txt');

/**
 * Export cookies from Chrome to a Netscape cookies.txt file.
 * Chrome must be CLOSED for this to work.
 */
export async function exportCookies() {
  console.log('[Cookies] Attempting to export cookies from Chrome...');
  console.log('[Cookies] Target file:', COOKIES_FILE);

  try {
    // Use yt-dlp to export cookies to a file
    await execFileAsync(ytdlpPath, [
      '--cookies-from-browser', 'chrome',
      '--cookies', COOKIES_FILE,
      '--skip-download',
      '--no-warnings',
      'https://www.youtube.com',
    ], { timeout: 30000 });

    // Verify the file was created
    const stats = await fs.stat(COOKIES_FILE);
    console.log(`[Cookies] ✅ Cookies exported successfully! (${stats.size} bytes)`);
    console.log(`[Cookies] File: ${COOKIES_FILE}`);
    return true;
  } catch (error) {
    console.error('[Cookies] ❌ Failed to export cookies.');
    console.error('[Cookies]    Make sure Chrome is CLOSED, then run this script again.');
    console.error('[Cookies]    Error:', error.message?.substring(0, 200));
    return false;
  }
}

/**
 * Check if a valid cookies file exists.
 */
export async function hasCookiesFile() {
  try {
    const stats = await fs.stat(COOKIES_FILE);
    // Cookie file should be at least 100 bytes to be valid
    return stats.size > 100;
  } catch {
    return false;
  }
}

/**
 * Get the cookies flags for yt-dlp commands.
 * Returns the appropriate flags based on cookie availability.
 */
export async function getCookieFlags() {
  if (await hasCookiesFile()) {
    console.log('[Cookies] Using cached cookies.txt');
    return ['--cookies', COOKIES_FILE];
  }
  console.log('[Cookies] No cookies file found. Some videos may require authentication.');
  return [];
}

export { COOKIES_FILE };

// Run directly: node src/utils/export-cookies.js
if (process.argv[1] && process.argv[1].includes('export-cookies')) {
  exportCookies();
}
