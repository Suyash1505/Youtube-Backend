import  asyncHandler  from '../Utils/asyncHandler.js'
import ApiError from '../Utils/apiError.js';
import { User } from '../Models/user.models.js';
import uploadOnCloudinary from '../Utils/cloudinary.js';
import ApiResponse from '../Utils/apiResponse.js';

const registerUser = asyncHandler ( async (req, res) => {
    // Steps to Register a user
    // Step: 1 Get user details from frontend
    const { username, email, fullname, password } = req.body;
    console.log("Email : ", email);
    

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
        throw new ApiError("All Fields are required...");
    }

    // Step: 3 Check if user already exist - username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exist.")
    }

    // Step: 4 Check for image Check for avatar
    // const avatarLocalPath = req.files?.avatar[0]?.path; // Morden Way
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar)
    && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path;
    }

    // // Classic Way
    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage)
    && req.files.coverImage.length > 0){
        
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(404, "Avatar file is required");
    }

    // Step: 5 Upload them cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    console.log("DEBUG req.files:", req.files);
    console.log("DEBUG req.files?.avatar:", req.files?.avatar);
    console.log("DEBUG avatarLocalPath:", req.files?.avatar?.[0]?.path);

    if(!avatar){
        throw new ApiError(407, "Avatar is required.")
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

export default registerUser;