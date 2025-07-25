## Creating Project
Step: 1 Open erasor and creat data modelling
Step: 2 npm init
    Create a node package manager

Step: 3 Create a folder "public"
    -> Create folder temp,
        -> Create a file .gitkeep -> as git only track      files not an empty folder.

Step: 4 Create a file .gitignor in root. (that is in main part of the folder)
    get gitignore generator from the generator.

Step: 5 Create a .env file to store environment variable.
Step: 6 Create a folder src 
    -> Create file inside src i.e app.js, constants.js, index.js (touch app.js constants.js index.js);

Step: 7 Do changes in package.jsons
    1. "type": "module"
    2. install the nodemon -> it restarts the surver
        npm i -D nodemon
    3. "dev": "nodemon src/index.js"

Step: 8 Create folders in src
    1. Controllers
    2. DB
    3. Middlewears
    4. Models
    5. Routes
    6. Utils    
    (mkdir Controllers DB Models Middlewear Routes Utils)

Step: 9 Prettier 
    1. install prettier -> npm i -D prettier
    2. create a file .prettierre
    3. create a file .prettierignore   

Step: 10 Creat a Cluster in mongoDB
    1. IP :- 0.0.0.0/0

Step: 11 Changes in .env
Step: 12 Crate a name for your data base in constants.js
Step: 13 npm i express mongoose dotenv

Step: 14 Create a data base in DB folder 

Step: 15 Config of dotenv
    1. do it in index.js file -> src folder
    2. do it in package.json

    Note: we use app.use() when we want to use middlewear or config setting

Step: 16 npm i cookie-parser cors

    Notes : How to create a higher order function
        step: 1 const asyncHandler = () => {};
        step: 2 const asyncHnadler = () => () => {};
        step: 3 const asyncHandler = (func) => async () => {}

        next -> relatd to middlewear -> it is a flag that is pass by middlewear

Step: 17 npm i mongoose-aggregate-paginate-v2
    note: to unleash the true power of mongoose

Step: 18 npm i bcrypt
Step: 19 npm i jsonwebtoken