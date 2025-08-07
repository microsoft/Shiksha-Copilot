// db.js
require("dotenv").config();
const mongoose = require("mongoose");
const MONGO_URL = process.env.MONGO_URL;
const runMigrations = require("../migrations/migration");
const QuestionBankCache = require("../models/question.bank.cache.model");

class DBService {
	constructor() {
		this.connection = null;
		this.isOnConnectExecuted = false;
	}

	async connect() {
		try {
			mongoose.Promise = global.Promise;
			await mongoose.connect(MONGO_URL);
			this.connection = mongoose.connection;
			await this.onConnect();
			return { connected: true, message: "Connected To Database" };
		} catch (err) {
			console.error("Error -> DB connection failed!", err);
			throw err;
		}
	}

	async onConnect() {
		try {
			await QuestionBankCache.createIndexes();
			await runMigrations();
			if (!this.isOnConnectExecuted) {
				this.isOnConnectExecuted = true;
				console.log("onConnect executed successfully.");
			}
		} catch (err) {
			console.log("Error -> DBService -> onConnect -> err", err);
			throw err;
		}
	}

	async init() {
		try {
			if (!this.connection) await this.connect();
			await this.onConnect();
			console.log("DBService initialized successfully.");
		} catch (err) {
			console.log("Error -> DBService -> init -> err", err);
			throw err;
		}
	}

	async getConnection() {
		try {
			await this.init();
			return this.connection;
		} catch (err) {
			console.log("Error -> DBService -> getConnection -> err", err);
		}
	}

	closeConnection() {
		try {
			if (this.connection) {
				this.connection.close();
				console.log("DB connection closed");
			}
		} catch (err) {
			console.log("Error -> DBService -> closeConnection -> ", err);
		}
	}

	async connectToMongoForWorker() {
		try {
		  console.log("connectToMongoForWorker");
		  console.log("readyState:", mongoose.connection.readyState);
	  
		  if (mongoose.connection.readyState === 1) {
			console.log("Mongoose already connected (worker).");
			return { client: mongoose.connection, openedHere: false };
		  }
		
		  await mongoose.connect(MONGO_URL);
		  console.log("Mongoose connected in worker thread.");
		  return { client: mongoose.connection, openedHere: true };
		} catch (err) {
		  console.error("Failed to connect to MongoDB in worker thread:", err);
		  throw err;
		}
	  }
}

const dbService = new DBService();

module.exports = dbService;
