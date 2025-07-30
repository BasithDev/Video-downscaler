const express = require('express');
const multer = require('multer');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { Worker } = require('worker_threads');
const fs = require('fs');

const app = express();
const port = 3000;
const upload = multer({ dest: 'uploads/' });
const outputsDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
}
app.use('/outputs', express.static(outputsDir));

const getVideoResolution = (videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, data) => {
            if (err) return reject(err);
            const {width, height} = data.streams[0];
            resolve({width, height});
        });
    });
};

const getTargetResolutions = (height) => {
    const targetResolutions = [
        { width: 1920, height: 1080, name: '1080p' },
        { width: 1280, height: 720, name: '720p' },
        { width: 854, height: 480, name: '480p' },
        { width: 640, height: 360, name: '360p' },
        { width: 426, height: 240, name: '240p' },
        { width: 256, height: 144, name: '144p' }
    ];
    return targetResolutions.filter((option) => option.height < height);
}

app.post('/upload', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or invalid field name. Use "video" as the field name.' });
    }
    
    const filePath = req.file.path;
    const fileName = path.parse(req.file.originalname).name;
    const results = [];
    const processedResolutions = new Set();
    let completedWorkers = 0;

    try {
        const {height} = await getVideoResolution(filePath);
        console.log(`Original video resolution: ${height}p`);
        
        const targetResolutions = getTargetResolutions(height);
        console.log('Target resolutions:', targetResolutions);
        
        if(targetResolutions.length === 0) {
            return res.status(400).send('Video resolution is too low');
        }
        
        await new Promise((resolve) => {
            let completedWorkers = 0;
            const totalWorkers = targetResolutions.length;
            targetResolutions.forEach((res) => {
                const worker = new Worker('./worker.js', {
                    workerData: {
                        filePath,
                        width: res.width,
                        height: res.height,
                        outputName: `${fileName}_${res.name}.mp4`
                    }
                });
                let done = false;
                function finish() {
                    if (!done) {
                        done = true;
                        completedWorkers++;
                        if (completedWorkers === totalWorkers) {
                            console.log('All worker threads closed for this request.');
                            resolve();
                        }
                    }
                }
                worker.on('message', (message) => {
                    if (!message.error) {
                        results.push({
                            resolution: res,
                            outputPath: message.outputPath
                        });
                    }
                    finish();
                });
                worker.on('error', (error) => {
                    console.error(`Worker error for ${res.name}:`, error);
                    finish();
                });
            });
        });

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        const processedCount = results.length;
        const totalCount = targetResolutions.length;
        
        if (processedCount > 0) {
            // Build metadata for each processed file
            const videos = results
                .filter(({ outputPath }) => typeof outputPath === 'string' && outputPath.length > 0)
                .map(({ resolution, outputPath }) => {
                    const filename = path.basename(outputPath);
                    const absPath = path.join(outputsDir, filename);
                    let size = 0;
                    try {
                        size = fs.existsSync(absPath) ? fs.statSync(absPath).size : 0;
                    } catch (e) {}
                    return {
                        filename,
                        url: `/outputs/${filename}`,
                        size: `${(size / (1000 * 1000)).toFixed(2)} MB`,
                        resolution: `${resolution.width}x${resolution.height}`
                    };
                });
            res.json({
                success: processedCount === totalCount,
                message: `Processed ${processedCount} out of ${totalCount} resolutions`,
                videos
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to process any resolutions'
            });
        }
    } catch (error) {
        console.error("Error processing video:", error);
        
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        res.status(500).json({
            success: false,
            message: 'Error processing video',
            error: error.message
        });
    }
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})