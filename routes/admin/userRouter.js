const UserRouter = require("express").Router();

const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  latestusers,
  getFilteredUsers,
} = require("./../../controllers/admin/userController");

UserRouter.get("/", getUsers);
UserRouter.get("/latest", latestusers);
UserRouter.post("/", createUser);
UserRouter.put("/update/:id", updateUser);
UserRouter.delete("/delete/:id", deleteUser);
UserRouter.post("/filter", getFilteredUsers);

module.exports = UserRouter;
