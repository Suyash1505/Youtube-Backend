import  asyncHandler  from '../Utils/asyncHandler.js'
import ApiError from '../Utils/apiError.js';
import { User } from '../Models/user.models.js';
import uploadOnCloudinary from '../Utils/cloudinary.js';
import ApiResponse from '../Utils/apiResponse.js';
import jsonwebtoken from 'jsonwebtoken'

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

    const incomingRefreshToken = req.cookie.refreshToken ||
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
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", newRefreshToken, option)
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
export  {registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken
};
