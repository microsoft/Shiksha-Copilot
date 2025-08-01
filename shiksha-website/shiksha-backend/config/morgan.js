const morgan = require('morgan');
require('dotenv').config(); 

morgan.token('body', (req) => {
    const instance_id = req.body.instance_id || 'unknown';
    const status = req.body.status || 'unknown';
    return `Instance_ID: ${instance_id}, Status: ${status}`;
  });

const customMorganFormat = ':method :url :status - :response-time ms - Body: :body';

const customLogStream = {
  write: (message) => {
    console.log(message.trim()); 
  }
};


const logSpecificPaths = (req) => {
  const logPaths = ['teacher-lesson-plan/webhook'];
  return req.method === 'POST' && logPaths.includes(req.path);
};

const morganMiddleware = morgan(customMorganFormat, {
    stream: customLogStream,
    skip: (req) => !logSpecificPaths(req)
});

module.exports = morganMiddleware;
