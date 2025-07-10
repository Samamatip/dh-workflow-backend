const mongoose = require('mongoose');
require('dotenv').config();

const connectToDb = async ()=>{
    try{

        const connection = await mongoose.connect(process.env.DATABASE_URL);

        console.log(`MongoDB connected: ${connection.connection.host}`);

    }catch (error){

    console.error(`Error connecting to Data base: ${error.message}`);
    process.exit(1); //disconnect if there is an error in connection
    
    }
};

module.exports = connectToDb;