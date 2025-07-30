const { parentPort, workerData } = require('worker_threads');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const { filePath, width, height, outputName } = workerData;

const outputDir = path.dirname(path.resolve(__dirname, 'outputs', outputName));
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, outputName);

const resolutionName = outputName.split('_').pop().replace('.mp4', '');
const tempOutputFile = path.join(outputDir, `temp_${Date.now()}_${resolutionName}.mp4`);

console.log(`Starting processing for ${outputName} (${width}x${height})...`);

const getBitrate = (height) => {
    if (height >= 1080) return '5000k';
    if (height >= 720) return '2500k';
    if (height >= 480) return '1000k';
    if (height >= 360) return '750k';
    return '400k';
};

const bitrate = getBitrate(height);
const maxrate = Math.floor(parseInt(bitrate) * 1.5) + 'k';
const bufsize = Math.floor(parseInt(bitrate) * 2) + 'k';

const startTime = Date.now();
let lastProgressUpdate = 0;

const command = ffmpeg(filePath)
    .outputOptions([
        `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,  // Scale and pad to exact dimensions
        '-c:v libx264',               // Use h.264 codec
        '-preset slower',             // Slower preset for better compression
        '-crf 18',                    // High quality (18 is visually lossless or nearly so)
        `-b:v ${bitrate}`,            // Target bitrate
        `-maxrate ${maxrate}`,        // Maximum bitrate (150% of target)
        `-bufsize ${bufsize}`,        // Buffer size (200% of target)
        '-pix_fmt yuv420p',           // Standard pixel format for maximum compatibility
        '-profile:v high',            // High profile for better quality
        '-tune film',                 // Optimize for high quality video
        '-movflags +faststart',       // Enable streaming
        '-f mp4',                     // Force MP4 format
        '-y'                          // Overwrite output file if it exists
    ])
    .audioCodec('aac')                // Convert audio to AAC
    .audioBitrate('128k')
    .audioChannels(2)                 // Stereo audio
    .output(tempOutputFile);

command.on('progress', (progress) => {
    const now = Date.now();
    if (now - lastProgressUpdate > 3000) {
        const percent = Math.round(progress.percent) || 0;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.floor((elapsed / percent) * (100 - percent));
        process.stdout.write(`\nProcessing ${outputName}: ${percent}% done (${elapsed}s elapsed, ~${remaining}s remaining) [${'#'.repeat(Math.floor(percent / 10)) + '-'.repeat(10 - Math.floor(percent / 10))}]\n`);
        lastProgressUpdate = now;
    }
});

// Only log errors from FFmpeg
command.on('stderr', function(stderrLine) {
    if (stderrLine.includes('[error]') || stderrLine.includes('Error')) {
        console.error('FFmpeg error:', stderrLine);
    }
});

command.on('start', () => {
    console.log(`Starting ${width}x${height} encoding...`);
    console.log(`Output will be saved to: ${outputPath}`);
});

command.on('end', () => {
    parentPort.postMessage({ progress: 100, elapsed: Math.floor((Date.now() - startTime) / 1000), outputName });
    try {
        if (fs.existsSync(tempOutputFile)) {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
            fs.renameSync(tempOutputFile, outputPath);
            console.log(`Successfully processed ${width}x${height}`);
            parentPort.postMessage({
                message: `Video processed successfully for resolution ${width}x${height}`,
                outputPath
            });
        } else {
            throw new Error(`Temporary output file not found: ${tempOutputFile}`);
        }
    } catch (error) {
        console.error(`Error finalizing ${width}x${height}:`, error);
        parentPort.postMessage({
            error: `Failed to finalize ${width}x${height}: ${error.message}`
        });
    }
})
.on('error', (error, stdout, stderr) => {
    console.error('FFmpeg error:', error);
    console.error('FFmpeg stdout:', stdout);
    console.error('FFmpeg stderr:', stderr);
    
    if (fs.existsSync(tempOutputFile)) {
        try {
            fs.unlinkSync(tempOutputFile);
        } catch (cleanupError) {
            console.error('Error cleaning up temp file:', cleanupError);
        }
    }
    
    parentPort.postMessage({
        error: `Failed to process ${width}x${height}p: ${error.message}`,
        stderr: stderr,
        stdout: stdout
    });
});

console.log(`Starting FFmpeg processing for ${width}x${height}...`);
command.run();
