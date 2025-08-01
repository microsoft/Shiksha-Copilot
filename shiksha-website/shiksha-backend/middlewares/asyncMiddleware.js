module.exports = function (handler) {
	return async (req, res, next) => {
		try {
			await handler(req, res);
		} catch (ex) {
			console.error(ex);
			next(ex);
		}
	};
};
