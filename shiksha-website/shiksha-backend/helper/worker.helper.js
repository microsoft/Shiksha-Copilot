const path = require('path');
const { Worker } = require('worker_threads');

function sendWelcomeSMS(phone, name) {
    return new Promise((resolve, reject) => {
        const workerPath = path.resolve(__dirname, '../services/worker.threads.service.js');
        const worker = new Worker(workerPath);
        worker.on('message', (message) => {
            if (message.success) {
                resolve(message.result);
            } else {
                reject(message.error);
            }
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });

        worker.postMessage({
            templateId: process.env.VARIFORM_SMS_WELCOME_TEMPLATE,
            recipientPhone: phone,
            data: phone
        });
    });
}

module.exports = { sendWelcomeSMS };
