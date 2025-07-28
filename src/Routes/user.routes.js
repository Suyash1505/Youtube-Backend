import { Router } from "express";
import  registerUser  from "../Controllers/user.controllers.js"
import { upload } from "../Middlewears/multer.middlewears.js";

const router = Router()
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

export default router; 