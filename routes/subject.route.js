const {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  filterSubjects,
  getOnlyCourse,
  getOnlyClassName
} = require("../controllers/subject.controller");

const SubjectRouter = require("express").Router();

SubjectRouter.post("/", createSubject);
SubjectRouter.get("/", filterSubjects);
SubjectRouter.put("/:id", updateSubject);
SubjectRouter.delete("/:id", deleteSubject);
SubjectRouter.get("/course", getOnlyCourse);
SubjectRouter.get("/class", getOnlyClassName);

SubjectRouter.get("/:id", getSubjectById);

module.exports = SubjectRouter;
