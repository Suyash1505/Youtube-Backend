import ApiError from "../Utils/apiError.js";
import asyncHandler from "../Utils/asyncHandler.js";
import jsonwebtoken from "jsonwebtoken";
import { User } from "../Models/user.models.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || 
                      req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jsonwebtoken.verify(
            token, 
            process.env.ACCESS_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(400, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(402, error?.message || "Invalid Access Token");
    }
});
