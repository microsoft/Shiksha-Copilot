const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const logger = require("../config/loggers");
require("dotenv").config();
const llmBaseUrl = process.env.LLM_API_BASE_URL
const embeddingsUrl = process.env.LLM_EMBEDDING_URL

try {
  axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount) => {
      logger.info(`Retry attempt: ${retryCount}`);
      return retryCount * 1000;
    },
    retryCondition: (error) => {
      const shouldRetry =
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response && error.response.status >= 500);
      if (shouldRetry) {
        logger.warn(`Retrying request due to error: ${error.message}`);
      }
      return shouldRetry;
    },
  });
} catch (configError) {
  logger.error("Error configuring axios-retry", {
    message: configError.message,
    stack: configError.stack,
  });
}

async function postToQuestionBankTemplate(payload) {
  const apiUrl =
    `${llmBaseUrl}/questionpaper/template`;
  try {
    logger.info("Sending request to Question Bot API");
    const response = await axios.post(apiUrl, payload);

    if (response.status !== 200) {
      logger.warn(
        `Unexpected status code from Question Bot: ${response.status}`
      );
    }

    logger.info("Request successful");
    return response;
  } catch (error) {
    console.log(error);
    logger.error("Error in postToQuestionBankBot", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function postToQuestionBankBluePrint(payload) {
  const apiUrl =
    `${llmBaseUrl}/questionpaper/questiondistribution`;
  try {
    logger.info("Sending request to Question Bot API");
    const response = await axios.post(apiUrl, payload);

    if (response.status !== 200) {
      logger.warn(
        `Unexpected status code from Question Bot: ${response.status}`
      );
    }

    logger.info("Request successful");
    return response;
  } catch (error) {
    console.log(error);
    logger.error("Error in postToQuestionBankBot", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function postToQuestionBank(payload) {
  const apiUrl =
    `${llmBaseUrl}/questionpaper`;
  try {
    logger.info("Sending request to Question Bot API");
    const response = await axios.post(apiUrl, payload);

    if (response.status !== 200) {
      logger.warn(
        `Unexpected status code from Question Bot: ${response.status}`
      );
    }

    logger.info("Request successful");
    return response;
  } catch (error) {
    console.log(error);
    logger.error("Error in postToQuestionBankBot", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function postToEmbedding(payload) {
  const apiUrl = embeddingsUrl;
  try {
    logger.info("Sending request to Question Bot API");
    const response = await axios.post(apiUrl, payload);

    if (response.status !== 200) {
      logger.warn(
        `Unexpected status code from Question Bot: ${response.status}`
      );
    }

    logger.info("Request successful");
    return response;
  } catch (error) {
    console.log(error);
    logger.error("Error in postToQuestionBankBot", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function postToEmbeddings(payloads) {
  const apiUrl = embeddingsUrl;
  const batchSize = 5;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const results = [];

  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    logger.info(
      `Sending batch ${Math.floor(i / batchSize) + 1}: ${batch.length} requests`
    );

    try {
      const batchResponses = await Promise.all(
        batch.map((payload) => axios.post(apiUrl, payload))
      );
      results.push(...batchResponses.map((res) => res.data));
      logger.info(
        `Batch ${Math.floor(i / batchSize) + 1} completed successfully`
      );
    } catch (error) {
      logger.error(`Error in batch ${Math.floor(i / batchSize) + 1}`, {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }

    if (i + batchSize < payloads.length) {
      logger.info("Waiting 1 second before next batch...");
      await delay(1000);
    }
  }

  return results;
}

async function postToQuestionBankParts(payload) {
  const apiUrl =
    `${llmBaseUrl}/questionpaper/getparts`;
  try {
    logger.info("Sending request to Question Bot API");
    const response = await axios.post(apiUrl, payload);

    if (response.status !== 200) {
      logger.warn(
        `Unexpected status code from Question Bot: ${response.status}`
      );
    }

    logger.info("Request successful");
    return response;
  } catch (error) {
    console.log(error);
    logger.error("Error in postToQuestionBankBot", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  postToQuestionBankTemplate,
  postToQuestionBankBluePrint,
  postToQuestionBank,
  postToEmbedding,
  postToEmbeddings,
  postToQuestionBankParts,
};
