const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const logger = require("morgan"); 
const path = require("path");
const dbService = require("./config/db");
const userRoutes = require("./routes/user.routes.js");
const masterLessonRoutes = require("./routes/master.lesson.routes");
const boardRoutes = require("./routes/board.routes");
const schoolRoutes = require("./routes/school.routes");
const schoolClassRoutes = require("./routes/school.class.routes");
const subjectRoutes = require("./routes/subject.routes");
const regionRoutes = require("./routes/region.routes");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.user.routes");
const resourceRoutes = require("./routes/facility.routes");
const scheduleRoutes = require("./routes/schedule.routes");
const masterSubjectRoutes = require("./routes/master.subject.routes");
const masterClassRoutes = require("./routes/master.class.routes");
const masterResourceRoutes = require("./routes/master.resource.routes");
const chapterRoutes = require("./routes/chapter.routes");
const teacherLessonRoutes = require("./routes/teacher.lesson.plan.routes");
const lessonFeedbackRoutes = require("./routes/feedback.lesson.routes");
const resourceFeedbackRoutes = require("./routes/teacher.feedback.routes");
const questionBankRoutes = require("./routes/question.bank.routes.js");
const questionBankCacheRoutes = require("./routes/question.bank.cache.routes.js");
const chatRoutes = require("./routes/chat.routes");
const auditRoutes = require("./routes/audit.log.route");
const conditionalMorganMiddleware = require('./config/morgan');
const useragent = require('express-useragent');

dotenv.config();
const app = express();
app.disable("x-powered-by");

app.use(express.json());
const allowedOrigins = ["allow_your_website_here"];

app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin) return callback(null, true);
			if (
				allowedOrigins.includes(origin) ||
				/^http:\/\/localhost:\d+$/.test(origin)
			) {
				return callback(null, true);
			} else {
				return callback(new Error("Not allowed by CORS"));
			}
		},
		optionsSuccessStatus: 200,
	})
);

const folderPath = path.join(__dirname, 'public', 'images');

app.use('/content', express.static(folderPath));
app.use(logger("dev"));
app.use(conditionalMorganMiddleware);
app.use(useragent.express());

const PORT = process.env.PORT;
dbService.connect().then((data) => console.log(data.message));

app.get("/", (req, res) => res.send("Shikshana Backend!"));
app.use("/api", userRoutes);
app.use("/api", masterLessonRoutes);
app.use("/api", boardRoutes);
app.use("/api", schoolRoutes);
app.use("/api", schoolClassRoutes);
app.use("/api", subjectRoutes);
app.use("/api", regionRoutes);
app.use("/api", authRoutes);
app.use("/api", adminRoutes);
app.use("/api", resourceRoutes);
app.use("/api", scheduleRoutes);
app.use("/api", masterSubjectRoutes);
app.use("/api", masterClassRoutes);
app.use("/api", masterResourceRoutes);
app.use("/api", chapterRoutes);
app.use("/api", teacherLessonRoutes);
app.use("/api", lessonFeedbackRoutes);
app.use("/api", resourceFeedbackRoutes);
app.use("/api", chatRoutes);
app.use("/api", auditRoutes);
app.use("/api",questionBankRoutes)
app.use("/api",questionBankCacheRoutes)

process.on('unhandledRejection',(reason,promise)=>{
	console.log(promise,reason);
	process.exit(1);
})
app.listen(PORT, () => console.log(`App listening on port ${PORT}!`));
