const formatApiReponse = (success, message, data) => {
	return {
		success,
		message,
		data,
	};
};

module.exports = formatApiReponse;
