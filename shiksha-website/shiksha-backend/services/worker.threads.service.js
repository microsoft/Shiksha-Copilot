const { parentPort } = require('worker_threads');
const variforrmSMSService = require('./variform.service');

parentPort.on('message', async ({ templateId, recipientPhone, data }) => {
    try {
        const result = await variforrmSMSService(templateId, recipientPhone, data);
        parentPort.postMessage({ success: true, result });
    } catch (error) {
        parentPort.postMessage({ success: false, error: error.message });
    }
});