import YTDlpWrapModule from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { ensureDir } from '../utils/helpers.js';
import { getCookieFlags } from '../utils/export-cookies.js';

// Handle CJS/ESM interop
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;

// Resolve yt-dlp binary path
const ytdlpPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'yt-dlp.exe');
const ytdlp = new YTDlpWrap(ytdlpPath);
console.log(`[YouTube] Using yt-dlp at: ${ytdlpPath}`);

// Base flags
const BASE_FLAGS = [
  '--no-playlist',
  '--no-warnings',
  '--no-check-certificates',
  '--extractor-args', 'youtube:player_client=mediaconnect',
];

/**
 * Build command flags with cookie support.
 */
async function getFlags() {
  const cookieFlags = await getCookieFlags();
  return [...BASE_FLAGS, ...cookieFlags];
}

/**
 * Fetch video metadata without downloading.
 */
export async function getVideoInfo(url) {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    const flags = await getFlags();

    const { stdout } = await execFileAsync(ytdlpPath, [
      url,
      '--dump-json',
      '--no-download',
      ...flags,
    ], { maxBuffer: 10 * 1024 * 1024 });

    const info = JSON.parse(stdout);

    return {
      id: info.id,
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      channel: info.channel || info.uploader,
      viewCount: formatViewCount(info.view_count),
      description: info.description?.substring(0, 500) || '',
    };
  } catch (error) {
    // If the command failed but we got stdout with valid JSON, try parsing it
    if (error.stdout) {
      try {
        const info = JSON.parse(error.stdout);
        return {
          id: info.id,
          title: info.title,
          thumbnail: info.thumbnail,
          duration: info.duration,
          channel: info.channel || info.uploader,
          viewCount: formatViewCount(info.view_count),
          description: info.description?.substring(0, 500) || '',
        };
      } catch {
        // JSON parse failed, fall through to error
      }
    }
    console.error('[YouTube] Failed to fetch video info:', error.message || error.stderr);
    throw new Error(`Failed to fetch video info: ${error.message}`);
  }
}

/**
 * Download video to a specified directory.
 * Returns the path to the downloaded video file.
 */
export async function downloadVideo(url, jobDir, onProgress) {
  await ensureDir(jobDir);
  const outputPath = path.join(jobDir, 'source.%(ext)s');
  const expectedPath = path.join(jobDir, 'source.mp4');

  try {
    const flags = await getFlags();
    await new Promise((resolve, reject) => {
      const proc = ytdlp.exec([
        url,
        '-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
        '--merge-output-format', 'mp4',
        '-o', outputPath,
        ...flags,
      ]);

      proc.on('progress', (progress) => {
        if (onProgress && progress.percent) {
          onProgress(Math.round(progress.percent));
        }
      });

      proc.on('close', () => resolve());
      proc.on('error', (err) => reject(err));
    });

    // Find the actual downloaded file (extension might vary)
    const files = await fs.readdir(jobDir);
    const videoFile = files.find(f => f.startsWith('source.') && (f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm')));

    if (videoFile) {
      const actualPath = path.join(jobDir, videoFile);
      // Rename to .mp4 if needed
      if (actualPath !== expectedPath) {
        await fs.rename(actualPath, expectedPath);
      }
      return expectedPath;
    }

    // Fallback: check if expected path exists
    await fs.access(expectedPath);
    return expectedPath;
  } catch (error) {
    console.error('[YouTube] Download failed:', error.message);
    throw new Error(`Video download failed: ${error.message}`);
  }
}

/**
 * Extract subtitles / auto-generated captions.
 * Returns the transcript as an array, or null if unavailable.
 */
export async function extractSubtitles(url, jobDir) {
  await ensureDir(jobDir);
  const subtitlePath = path.join(jobDir, 'subtitles');

  try {
    const flags = await getFlags();
    await new Promise((resolve, reject) => {
      const proc = ytdlp.exec([
        url,
        '--skip-download',
        '--write-auto-sub',
        '--write-sub',
        '--sub-lang', 'fr,en',
        '--sub-format', 'vtt',
        '--convert-subs', 'srt',
        '-o', subtitlePath,
        ...flags,
      ]);

      proc.on('close', () => resolve());
      proc.on('error', (err) => reject(err));
    });

    // Find the subtitle file
    const files = await fs.readdir(jobDir);
    const subFile = files.find(f => f.endsWith('.srt') || f.endsWith('.vtt'));

    if (subFile) {
      const content = await fs.readFile(path.join(jobDir, subFile), 'utf-8');
      return parseSRT(content);
    }

    return null;
  } catch (error) {
    console.error('[YouTube] Subtitle extraction failed:', error.message);
    return null; // Non-fatal: we can still analyze without subtitles
  }
}

/**
 * Parse SRT subtitle content into a clean transcript with timestamps.
 */
function parseSRT(srtContent) {
  const blocks = srtContent.trim().split(/\n\n+/);
  const entries = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    const timeLine = lines[1];
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]?\d*)\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]?\d*)/);

    if (timeMatch) {
      const text = lines.slice(2).join(' ').replace(/<[^>]+>/g, '').trim();
      if (text) {
        entries.push({
          start: srtTimeToSeconds(timeMatch[1]),
          end: srtTimeToSeconds(timeMatch[2]),
          text,
        });
      }
    }
  }

  return entries;
}

/**
 * Convert SRT timestamp to seconds.
 */
function srtTimeToSeconds(time) {
  const parts = time.replace(',', '.').split(':');
  return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
}

/**
 * Format view count for display.
 */
function formatViewCount(count) {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}
