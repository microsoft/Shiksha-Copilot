const handleError = (data, res) => {
	if (data.accessError) {
		data.accessError = undefined;
		return res.status(401).json(data);
	}

	data.accessError = undefined;
	return res.status(400).json(data);
};

module.exports = handleError;
