import  asyncHandler  from '../Utils/asyncHandler.js'
import ApiError from '../Utils/apiError.js';
import { User } from '../Models/user.models.js';
import uploadOnCloudinary from '../Utils/cloudinary.js';
import ApiResponse from '../Utils/apiResponse.js';
import jsonwebtoken from 'jsonwebtoken'
import mongoose from 'mongoose';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {accessToken, refreshToken};

    } 
    catch (error) {
        throw new ApiError(500, "Something went worng while generating refresh and access token")
    }
}

const registerUser = asyncHandler ( async (req, res) => {
    
    // Steps to Register a user
    // Step: 1 Get user details from frontend
    const { username, email, fullname, password } = req.body;
    // console.log("Email : ", email);
    
    // Step: 2 Validation - not empty

    /* Method : 1
        if(fullname === ""){
            throw new ApiError(400, fullname is required);
        } 
    */

    // Method: 2 
    if(
        [username, email, fullname, password].some( (field) => 
            field ?.trim() === "")
    ){
        throw new ApiError(401, "All Fields are required...");
    }

    // Step: 3 Check if user already exist - username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exist.")
    }

    // Step: 4 Check for image Check for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path; // Morden Way
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // let avatarLocalPath;
    // if(req.files && Array.isArray(req.files.avatar)
    // && req.files.avatar.length > 0){
    //     avatarLocalPath = req.files.avatar[0].path;
    // }

    // Classic Way
    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(404, "Avatar file is required");
    }

    // Step: 5 Upload them cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }

    // Step: 6 Create User object - create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password, 
        username: username.toLowerCase(),
    })

    // Step: 7 Remove password and refresh token field from response
    const creatUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // Step: 8 Check for user creation
    if(!creatUser){
        throw new ApiError(500, "Something went worng while registering a user.")
    }

    // Step: 9 Return response
    return res.status(201).json(
        new ApiResponse(200, creatUser, "User Register Successfully.")
    )
     
})

const loginUser = asyncHandler( async (req, res) => {

    // Step: 1 Bring data from request body
    const { username, email, password } = req.body;
    console.log(email);
    
    // Step: 2 Username based or email based login
    if(!username && !email){
        throw new ApiError(400, "Username or Email is require")
    }

    // Step: 3 Find User
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    // Step: 4 Check Password
    const isPasswordValid = await user.isPasswordCorrect( password );
    
    if(!isPasswordValid){
        throw new ApiError(408, "Incorrect Password ");
    }

    // Step: 5 Generate Access and Refresh Token
    const { accessToken, refreshToken } =  await 
    generateAccessAndRefreshToken(user._id);

    // Step: 6 Send Cookie
    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

    const option = {
        httpOnly: true,
        secure: true,
    }

    // Step: 7 Return
    return res.status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken
        },"User LoggedIn Successfully ")
    )
})

const logoutUser = asyncHandler( async ( req, res ) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const option = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(
        new ApiResponse(200, {}, "User LoggedOut Successfully")
    )
})

const refreshAccessToken = asyncHandler( async ( req, res ) => {

    const incomingRefreshToken = req.cookies?.refreshToken ||
    req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(404, "Unauthorize Request.")
    }

    try {
        const decodedToken = jsonwebtoken.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(404, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(404, "Refresh token is expired or used")
        }
    
        const { accessToken, newRefreshToken } =  await 
        generateAccessAndRefreshToken(user._id);
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {
                user: accessToken, refreshToken: newRefreshToken
            },"User LoggedIn Successfully ")
        )
    } 
    catch (error) {
        throw new ApiError(400, error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentPassword = asyncHandler( async ( req, res ) => {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json( new ApiResponse( 200, {}, "Password Changed Successfully"))
})

const getCurrentUser = asyncHandler( async (req, res ) => {

    return res
    .status(200)
    .json(new ApiResponse( 200, req.user, 
        "Current user fetched Successfully"
    ))
})

const updateAccountDetails = asyncHandler( async (req, res) => {

    const { username, email, fullname } = req.body;

    if(!username || !email || !fullname){
        throw new ApiError(400, "All fields are required")
    }

    const updateUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                email: email,
                username: username
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, updateUser, 
        "Account details updated successfully"
    ))
})

const updateUserAvatar = asyncHandler( async (req, res) => {

    const avatarLocalPath = req.file.path;
    
    if(!avatarLocalPath){
        throw new ApiError(401, "Avatar is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while updating avatar")
    }

    const updataAvatar = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, updataAvatar, 
        "User Avatar is updated successfully"
    ))
})

const updateUserCoverImage = asyncHandler( async (req, res) => {

    const coverImageLocalPath = req.file.path;
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400, "Error while updating cover image")
    }

    const updateCoverImage = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, updateCoverImage, 
        "User Avatar is updated successfully"
    ))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    
    const { username } = req.params
    if(!username?.trim()){
        throw new ApiError(404, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            } 
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscriberTo"
            } 
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribersCount: {
                    $size: "$subscriberTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                } 
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribersCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1, 
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(402, "Channel Does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, 
        channel[0],
        "User Channel fetched successfully"
    ))
})

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: 'Video',
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: 'User',
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: '$owner'
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(
        200, 
        user[0].watchHistory,
        "Watched History Fetched Successfully"
    ))
})

export  {
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};
