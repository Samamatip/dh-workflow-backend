const express = require('express'); //import express
const connectToDB = require('./DB/DB'); //import DB connection
const cors = require('cors'); //import cross origin reference
const dotenv = require('dotenv'); //import dotenv
dotenv.config(); //use dotenv
const authRoutes = require('./routes/authRoutes'); //import auth routes
const departmentRoutes = require('./routes/departmentsRoutes'); //import department routes
const shiftsRoutes = require('./routes/shiftsRoutes'); //import shifts routes
const groupsRoutes = require('./routes/groupsRoutes'); //import groups routes
const shiftRequestRoutes = require('./routes/shiftRequestRoutes'); //import shift request routes

const app = express();
app.use(express.json()); //allow app to allow json file format

// Enable CORS for requests from frontend
app.use(cors({
    origin: `${process.env.FRONTEND_URL}`, // Allow requests from your frontend's origin
    methods: 'GET,POST,PUT,DELETE',  // Allowed HTTP methods
    credentials: true                // Allow cookies if necessary
}));


//Define routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/shift-requests', shiftRequestRoutes);

connectToDB(); //connect to dataBase
const PORT = process.env.PORT || 8000;
app.listen(PORT, console.log(`server running on port ${PORT}`));