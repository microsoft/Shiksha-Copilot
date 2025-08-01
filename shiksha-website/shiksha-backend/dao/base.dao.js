class BaseDao {
	constructor(model) {
		this.Model = model;
	}

	async getAll(
		page = 1,
		limit,
		filters = {},
		sort = {},
		status
	) {
		try {
			let processedFilters = { ...filters , ...status }
			
			const pipeline = [
				{ $match: processedFilters },
				{ $sort: sort },
			];
	
			if (limit > 0) {
				pipeline.push(
					{ $skip: (page - 1) * limit },
					{ $limit: limit }
				);
			}
	
			const results = await this.Model.aggregate(pipeline);
	
			const totalItems = await this.Model.countDocuments(processedFilters);
	
			return {
				page,
				totalItems,
				limit: limit > 0 ? limit : totalItems, 
				results,
			};
		} catch (err) {
			console.log("Error --> BaseDao -> getAll()", err);
			throw err;
		}
	}

	async filter(filter) {
		try {
			let result = await this.Model.find(filter);
			return result;
		} catch (err) {
			console.log("Error --> BaseDao -> filter()", err);
			throw err;
		}
	}

	async getOne(filter) {
		try {
			let result = await this.Model.findOne(filter);
			return result;
		} catch (err) {
			console.log("Error --> BaseDao -> getOne()", err);
			throw err;
		}
	}

	async getById(id) {
		try {
			let result = await this.Model.findOne({ _id: id });
			return result;
		} catch (err) {
			console.log("Error --> BaseDao -> getById()", err);
			throw err;
		}
	}

	async create(data, session = null) {
		try {
			let model = new this.Model(data);
			let result = await model.save(session ? { session } : {});
			return result;
		} catch (err) {
			console.log("Error -> BaseDao -> create", err);
			throw err;
		}
	}

	async delete(id, session = null) {
		try {
			const result = await this.Model.findByIdAndUpdate(
				id,
				{
					$set: {
						isDeleted: true,
					},
				},
				{
					new: true,
					runValidators: true,
					session: session,
				}
			);
			return result;
		} catch (err) {
			console.log("Error -> BaseDao -> delete", err);
		}
	}

	async activate(id) {
		try {
			const result = await this.Model.findByIdAndUpdate(
				id,
				{
					$set: {
						isDeleted: false,
					},
				},
				{
					new: true,
				}
			);
			return result;
		} catch (err) {
			console.log("Error -> BaseDao -> activate", err);
		}
	}

	async bulkUpload(dataArray) {
		try {
			const result = await this.Model.insertMany(dataArray);
			return result;
		} catch (err) {
			console.log("Error -> BaseDao -> bulkUpload", err);
			throw err;
		}
	}
}

module.exports = BaseDao;
