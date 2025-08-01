const axios = require("axios");
const axiosRetry = require('axios-retry').default;
const logger = require('../config/loggers'); 
require("dotenv").config();
const llmBaseUrl = process.env.LLM_API_BASE_URL
const checkListUrl = process.env.LLM_CHECKLIST_URL

try{
axiosRetry(axios, {
  retries: 5,
  retryDelay: (retryCount) => {
    logger.info(`Retry attempt: ${retryCount}`); 
    return retryCount * 1000; 
  },
  retryCondition: (error) => {
    const shouldRetry = axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response && error.response.status >= 500);
    if (shouldRetry) {
      logger.warn(`Retrying request due to error: ${error.message}`);
    }
    return shouldRetry;
  }
});
}
catch (configError) {
	logger.error('Error configuring axios-retry', { message: configError.message, stack: configError.stack });
  }

async function postToCopilotBot(payload) {
  const apiUrl = `${llmBaseUrl}/lp`;
  try {
    const response = await axios.post(apiUrl, payload);
    return response;
  } catch (error) {
    logger.error("Error in postToCopilotBot", { message: error.message, stack: error.stack });
    throw error;
  }
}

async function post5ETables(payload)
{
  const apiUrl = checkListUrl;
  try {
    const response = await axios.post(apiUrl, payload);
    return response;
  } catch (error) {
    logger.error("Error in postToCopilotBot", { message: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { postToCopilotBot , post5ETables } ;
