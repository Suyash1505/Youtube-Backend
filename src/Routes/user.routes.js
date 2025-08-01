import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../Controllers/user.controllers.js";
import { upload } from "../Middlewears/multer.middlewears.js";
import { verifyJWT } from "../Middlewears/auth.middlewears.js";

const router = Router();

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
    registerUser
);

router.route("/login").post(loginUser);

// Secured Route
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken)
export default router;
