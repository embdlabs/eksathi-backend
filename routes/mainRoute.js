const MainRouter = require('express').Router();

const AnswersRouter = require('./answers.route');
const ApplicantRouter = require('./applicants.route');
const AuthRouter = require('./auth.route');
const CandidateRouter = require('./candidate.route');
const CategoriesRouter = require('./categories.route');
const ChartRouter = require('./charts.route');
const ChatRouter = require('./chat.route');
const CommentsRouter = require('./comments.route');
const ConnectionRouter = require('./connections.route');
const InstituteRouter = require('./institutes.route');
const JobsRouter = require('./jobs.route');
const NotificationRouter = require('./notifications.route');
const QuestionRouter = require('./questions.route');
const RatingRouter = require('./ratings.route');
const RepliesRouter = require('./replies.route');
const ReportRouter = require('./reports.route');
const SearchRouter = require('./search.route');
const SettingsRouter = require('./settings.route');
const TagRouter = require('./tags.route');
const UniversitiesRouter = require('./university.route');
const UserRouter = require('./user.route');
const UtilitiesRouter = require('./utilities.route');
const VotesRouter = require('./votes.route');
const TeachersRouter = require('./admin/teachers.route')
const MessageRouter = require('./messages.route')
const EventsRouter = require('./events.route')
const SubjectRouter = require("./subject.route")
const TutorRouter = require("./tutors.route")
const FeedbackRouter = require("./feedback.route")
const EmojiRouter = require("./emoji.route")

MainRouter.use('/auth', AuthRouter);
MainRouter.use('/user', UserRouter);
MainRouter.use('/categories', CategoriesRouter);
MainRouter.use('/tags', TagRouter);
MainRouter.use('/question', QuestionRouter);
MainRouter.use('/answer', AnswersRouter);
MainRouter.use('/comment', CommentsRouter);
MainRouter.use('/reply', RepliesRouter);
MainRouter.use('/vote', VotesRouter);
MainRouter.use('/search', SearchRouter);
MainRouter.use('/connections', ConnectionRouter);
MainRouter.use('/settings', SettingsRouter);
MainRouter.use('/rating', RatingRouter);
MainRouter.use('/candidates', CandidateRouter);
MainRouter.use('/jobs', JobsRouter);
MainRouter.use('/chat', ChatRouter);
MainRouter.use('/report', ReportRouter);
MainRouter.use('/utilities', UtilitiesRouter);
MainRouter.use('/notification', NotificationRouter);

MainRouter.use('/institutes', InstituteRouter);

MainRouter.use('/universities', UniversitiesRouter);
MainRouter.use('/charts', ChartRouter );
MainRouter.use('/applicants', ApplicantRouter);
MainRouter.use('/teachers', TeachersRouter);
MainRouter.use('/message',MessageRouter);
MainRouter.use('/events',EventsRouter)
MainRouter.use('/subject',SubjectRouter)
MainRouter.use('/tutor',TutorRouter)
MainRouter.use('/feedback',FeedbackRouter)
MainRouter.use("/emoji-reaction",EmojiRouter)


module.exports = MainRouter;