// Method : 1 
const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch( (err) => next(err))
    }
}

// Method : 2
// const asyncHandler = (func) => async (req, res, next) => {

//     try {
//         await func(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message,
//         })
//     }
// } 

export default asyncHandler;