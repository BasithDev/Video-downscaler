const { workerData, parentPort } = require('worker_threads');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const { filePath, resolution, outputName } = workerData;

const outputDir = path.resolve(__dirname, 'outputs');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const outputPath = path.join(outputDir, outputName);

ffmpeg(filePath)
    .outputOptions([
        `-vf scale=${resolution}:-1`,
        `-preset fast`,
        `-crf 23`,
    ])
    .output(outputPath)
    .on('end', () => {
        parentPort.postMessage({
            message: `Video processed successfully for resolution ${resolution}`,
            outputPath,
        });
    })
    .on('error', (error) => {
        parentPort.postMessage({
            error: error.message,
        });
    })
    .run();
