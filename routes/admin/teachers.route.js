const TeachersRouter = require("express").Router();

const {getAllTeachers, postAllTeachers, UpdateTeacher, DeleteTeacher,DeleteExcelTeacher, UpdateExcelTeacher,getFilterCityStateTeacher} = require('../../controllers/admin/teachers.controller');

TeachersRouter.get('/filter', getFilterCityStateTeacher)
TeachersRouter.get('/', getAllTeachers)
TeachersRouter.post('/', postAllTeachers)
TeachersRouter.put('/:id', UpdateTeacher)
TeachersRouter.delete('/:id', DeleteTeacher)
TeachersRouter.put('/excel/:id', UpdateExcelTeacher)
TeachersRouter.delete('/excel/:id', DeleteExcelTeacher)




module.exports = TeachersRouter;
