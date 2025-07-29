const express = require('express');
const multer = require('multer');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { Worker } = require('worker_threads');
const fs = require('fs');

const app = express();
const port = 3000;
const upload = multer({ dest: 'uploads/' });

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
            targetResolutions.forEach((res) => {
                const worker = new Worker('./worker.js', {
                    workerData: {
                        filePath,
                        width: res.width,
                        height: res.height,
                        outputName: `${fileName}_${res.name}.mp4`
                    }
                });

                worker.on('message', (message) => {
                    console.log(`Worker message for ${res.name}:`, message);
                    
                    if (message.error) {
                        console.error(`Error processing ${res.name}:`, message.error);
                    } else {
                        results.push({
                            resolution: res,
                            outputPath: message.outputPath
                        });
                    }
                    processedResolutions.add(res.name);
                });

                worker.on('error', (error) => {
                    console.error(`Worker error for ${res.name}:`, error);
                    processedResolutions.add(res.name);
                    checkCompletion();
                });

                worker.on('exit', (code) => {
                    if (code !== 0) {
                        console.error(`Worker for ${res.name} exited with code ${code}`);
                        if (!processedResolutions.has(res.name)) {
                            processedResolutions.add(res.name);
                            checkCompletion();
                        }
                    } else if (!processedResolutions.has(res.name)) {
                        processedResolutions.add(res.name);
                        checkCompletion();
                    }
                });
            });

            function checkCompletion() {
                completedWorkers++;
                if (completedWorkers === targetResolutions.length) {
                    resolve();
                }
            }
        });

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        const processedCount = results.length;
        const totalCount = targetResolutions.length;
        
        if (processedCount > 0) {
            res.json({
                success: processedCount === totalCount,
                message: `Processed ${processedCount} out of ${totalCount} resolutions`,
                results: results
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