const PQueue = require('p-queue').default;
const { Worker } = require('worker_threads');
const path = require('path');
const QuestionBankCacheSummary = require('../models/question.bank.cache.summary.model');

const queue = new PQueue({ concurrency: 1 });
const worker = new Worker(path.resolve(__dirname, "../worker/updatequestionbankcacheworker.js"));

worker.on('message', async (result) => {
  console.log("worker result", result);
  
  if (result.success && result.cacheSummaryId) {
    await QuestionBankCacheSummary.findByIdAndUpdate(result.cacheSummaryId, {
      isCacheUpdated: true,
      inProgress: false,
      $unset: { processedCache: "" }
    });
  } else if (!result.success && result.cacheSummaryId) {
    await QuestionBankCacheSummary.findByIdAndUpdate(result.cacheSummaryId, {
      isCacheUpdated: false,
      inProgress: false
    });
  }
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

worker.on('exit', (code) => {
  console.log('Worker exited with code:', code);
});

const addCacheJob = async (jobData) => {
  await queue.add(() => {
    return new Promise((resolve, reject) => {
      // const timeout = setTimeout(() => {
      //   console.error("Worker response timeout");
      //   worker.off('message', handleMessage);
      //   reject(new Error("Worker response timeout"));
      // }, 180000);
      const handleMessage = (result) => {
        if (result.cacheSummaryId === jobData.cacheSummaryId) {
          // clearTimeout(timeout);
          resolve();
          worker.off('message', handleMessage);
        }
      };

      worker.on('message', handleMessage);
      worker.postMessage(jobData);
    });
  });
  console.log("job added to queue");
};

module.exports = {
  addCacheJob,
};
