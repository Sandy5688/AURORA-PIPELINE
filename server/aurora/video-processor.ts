import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { logInfo, logError } from '../logger';

const execPromise = promisify(exec);

export interface VideoProcessingOptions {
  inputPath: string;
  outputPath: string;
  quality?: 'low' | 'medium' | 'high';
  format?: 'mp4' | 'webm' | 'mov';
  resolution?: '720p' | '1080p' | '2k';
  fps?: number;
  maxDuration?: number; // seconds
}

export interface ProcessingResult {
  success: boolean;
  inputPath: string;
  outputPath: string;
  duration?: number; // seconds
  fileSize?: number; // bytes
  error?: string;
  timestamp: string;
}

// Quality presets for FFmpeg
const qualityPresets = {
  low: { crf: 28, preset: 'faster' },
  medium: { crf: 23, preset: 'medium' },
  high: { crf: 18, preset: 'slow' },
};

const resolutionPresets = {
  '720p': 'scale=1280:720',
  '1080p': 'scale=1920:1080',
  '2k': 'scale=2560:1440',
};

const formatExtensions = {
  mp4: 'mp4',
  webm: 'webm',
  mov: 'mov',
};

/**
 * Process video with FFmpeg
 * Requires FFmpeg to be installed on the system
 */
export async function processVideo(options: VideoProcessingOptions): Promise<ProcessingResult> {
  const {
    inputPath,
    outputPath,
    quality = 'medium',
    format = 'mp4',
    resolution,
    fps = 30,
    maxDuration,
  } = options;

  try {
    // Check if input file exists
    await fs.stat(inputPath);

    // Build FFmpeg command
    let ffmpegCmd = `ffmpeg -i "${inputPath}"`;

    // Add format-specific codec options
    switch (format) {
      case 'mp4':
        const mp4Quality = qualityPresets[quality] || qualityPresets.medium;
        ffmpegCmd += ` -c:v libx264 -preset ${mp4Quality.preset} -crf ${mp4Quality.crf}`;
        ffmpegCmd += ` -c:a aac -b:a 128k`;
        break;
      case 'webm':
        const webmQuality = qualityPresets[quality] || qualityPresets.medium;
        ffmpegCmd += ` -c:v libvpx-vp9 -b:v 1000k -crf ${webmQuality.crf}`;
        ffmpegCmd += ` -c:a libopus -b:a 128k`;
        break;
      case 'mov':
        const movQuality = qualityPresets[quality] || qualityPresets.medium;
        ffmpegCmd += ` -c:v libx264 -preset ${movQuality.preset} -crf ${movQuality.crf}`;
        ffmpegCmd += ` -c:a aac -b:a 128k`;
        break;
    }

    // Add resolution filter if specified
    if (resolution && resolutionPresets[resolution]) {
      ffmpegCmd += ` -vf "${resolutionPresets[resolution]}"`;
    }

    // Add FPS if specified
    if (fps) {
      ffmpegCmd += ` -r ${fps}`;
    }

    // Add duration limit if specified
    if (maxDuration) {
      ffmpegCmd += ` -t ${maxDuration}`;
    }

    // Add output path
    ffmpegCmd += ` -y "${outputPath}" 2>&1`;

    logInfo('Starting video processing', {
      inputPath,
      outputPath,
      quality,
      format,
      resolution,
      fps,
    });

    // Execute FFmpeg
    const { stdout } = await execPromise(ffmpegCmd, {
      timeout: 600000, // 10 minute timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Check if output file was created
    const stats = await fs.stat(outputPath);

    // Get video duration from FFmpeg output
    const durationMatch = stdout.match(/Duration: (\d+):(\d+):(\d+)/);
    let duration = 0;
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      const minutes = parseInt(durationMatch[2]);
      const seconds = parseInt(durationMatch[3]);
      duration = hours * 3600 + minutes * 60 + seconds;
    }

    const result: ProcessingResult = {
      success: true,
      inputPath,
      outputPath,
      duration,
      fileSize: stats.size,
      timestamp: new Date().toISOString(),
    };

    logInfo('Video processing completed successfully', result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError('Video processing failed', error as Error, {
      inputPath,
      outputPath,
    });

    return {
      success: false,
      inputPath,
      outputPath,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Batch process multiple videos
 */
export async function batchProcessVideos(
  videosToProcess: VideoProcessingOptions[],
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  for (const video of videosToProcess) {
    const result = await processVideo(video);
    results.push(result);

    // Add small delay between processes to avoid resource contention
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Extract video metadata
 */
export async function getVideoMetadata(videoPath: string) {
  try {
    const cmd = `ffprobe -v error -show_format -show_streams -of json "${videoPath}"`;
    const { stdout } = await execPromise(cmd);
    const metadata = JSON.parse(stdout);
    return metadata;
  } catch (error) {
    logError('Failed to extract video metadata', error as Error, { videoPath });
    return null;
  }
}

/**
 * Generate video thumbnail
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timeOffset = '00:00:01',
): Promise<boolean> {
  try {
    const cmd = `ffmpeg -i "${videoPath}" -ss ${timeOffset} -vframes 1 -y "${outputPath}"`;
    await execPromise(cmd);
    logInfo('Thumbnail generated', { videoPath, outputPath });
    return true;
  } catch (error) {
    logError('Failed to generate thumbnail', error as Error, { videoPath, outputPath });
    return false;
  }
}
