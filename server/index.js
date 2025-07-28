const express = require('express');
const multer = require('multer');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { Worker } = require('worker_threads');

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
    const options = [720, 480, 360, 240, 144];
    return options.filter((option) => option <= height);
}

app.post('/upload', upload.single('video'), async (req, res) => {
    const filePath = req.file.path
    const fileName = path.parse(req.file.originalname).name;

    try {
        const {height} = await getVideoResolution(filePath);
        const targetResolutions = getTargetResolutions(height);
        
        if(targetResolutions.length === 0) {
            return res.status(400).send('Video resolution is too low');
        }
        
        targetResolutions.forEach((res)=>{
            const worker = new Worker('./worker.js', {
                workerData: {
                    filePath,
                    resolution: res,
                    outputName: `${fileName}_${res}p.mp4`
                }
            })

            worker.on('message', (message) => {
                console.log("Worker message:",message);
            })

            worker.on('error', (error) => {
                console.error("Worker error:",error);
            })

            worker.on('exit', (code) => {
                if(code !== 0) {
                    console.error(`Worker stopped with exit code ${code}`);
                }
            })
        })

        res.json({message: `Video is being processed for resolutions: ${targetResolutions.join(', ')}`})
    } catch (error) {
        console.error("Error processing video:", error);
        res.status(500).send('Error processing video');
    }
})