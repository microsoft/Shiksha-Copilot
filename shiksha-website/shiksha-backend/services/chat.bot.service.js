const axios = require('axios');
const axiosRetry = require('axios-retry').default; 
const logger = require('../config/loggers'); 
require("dotenv").config();
const llmBaseUrl = process.env.LLM_API_BASE_URL

try {
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

async function postToChatBot(payload) {
  const apiUrl = `${llmBaseUrl}/chat`;
  try {
    logger.info('Sending request to Chat Bot API');
    const response = await axios.post(apiUrl, payload);

    if (response.status !== 200) { 
      logger.warn(`Unexpected status code from Chat Bot: ${response.status}`);
    }

    logger.info('Request successful');
    return response;
  } catch (error) {
    logger.error('Error in postToChatBot', { message: error.message, stack: error.stack });
    throw error;
  }
}

async function postToLessonChatBot(payload) {
	const apiUrl = `${llmBaseUrl}/chatwithindex`;
	try {
	  logger.info('Sending request to Chat Bot API');
	  const response = await axios.post(apiUrl, payload);
  
	  if (response.status !== 200) { 
		logger.warn(`Unexpected status code from Chat Bot: ${response.status}`);
	  }
  
	  logger.info('Request successful');
	  return response;
	} catch (error) {
	  logger.error('Error in postToChatBot', { message: error.message, stack: error.stack });
	  throw error;
	}
  }

module.exports = { postToChatBot ,postToLessonChatBot } ;
