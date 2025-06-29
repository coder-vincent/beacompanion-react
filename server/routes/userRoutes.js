import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  getUserData,
  updateRole,
  updateAccount,
  deleteAccount,
  getAllUsers,
  createUserByAdmin,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/data", userAuth, getUserData);
userRouter.get("/all", userAuth, getAllUsers);
userRouter.post("/update-role", userAuth, updateRole);
userRouter.post("/update-account", userAuth, updateAccount);
userRouter.delete("/delete-account", userAuth, deleteAccount);
userRouter.post("/create-by-admin", userAuth, createUserByAdmin);

export default userRouter;
