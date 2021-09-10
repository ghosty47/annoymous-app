const {globalVariables} = require('./config/configuration');
const express = require('express');
const path = require('path');
const app = express();
const ejs = require('ejs');
const { response } = require('express');
const port = process.env.PORT || 8000;
const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy

// Local Strategy with passport

// NOTE: THIS IS ALSO LIKE AN ALTERNATIVE SETUP TO THE POST LOGIN IN ALTERNATIVE 2
passport.use(new LocalStrategy({
    usernameField: 'email',
    passReqToCallback: true
}, async (req, email, password, done) =>{
    await User.findOne({email})
        .then(async (user) => {
            if(!user) return done(null, false, req.flash('error-message', 'user not found'));
            await bcrypt.compare(password, user.password, (err, passwordMatch)=> {
                if(err){
                    return err;
                }

                if(!passwordMatch) return done(null, false, req.flash('error-message', 'Invalid Password'));
               
                    return done(null, user, req.flash('success-message', 'Login successfull'));
            });

           
        })
        // .catch(err => {})
}));

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});


//DB Connection
mongoose.connect('mongodb://localhost/waawnonymous')
 .then((dbconnect) => console.log('Database connection successful'))
 .catch((error) => console.log('Database connection error: ', error.message));


//Setting up express

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

//Setting up view

app.set('views',path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.locals.moment = require('moment');

//setup cookie
app.use(cookieParser());

// Middleware
app.use(session({
    secret: 'This is a secret message',
    resave:  true,
    saveUninitialized: true,
    cookie: { maxAge: Date.now() + 3600000},
    store: MongoStore.create({ 
        mongoUrl: 'mongodb://localhost/waawnonymous'
    })
})
);

app.use(morgan('dev'));

//initialize passport Note: One most call session before passport
app.use(passport.initialize());
app.use(passport.session());

//Use Flash
app.use(flash());

//Use Global variables
app.use(globalVariables);
app.locals.moment = require('moment');

//get
app.get('/', async (req, res, next) => {
   try {
    let allmessages = await Message.find({}).sort({_id: -1});
    res.render('index', {messages: allmessages});
   } catch (error) {
       console.log(error);
   }
});

app.post('/message/create-message', async(req,res, next)=>{
    // console.log("Form data :::::::::", req.body)
    let {message} = req.body;

    if(!message){
        req.flash('error-message', 'please enter a message');
        return res.redirect('/');
    }

    let newMessage = new Message({
        message
    });

    await newMessage.save()
    .then((data)=>{
        console.log('Message created successfully', data)
        req.flash('success-message', 'Message created successfully');
        res.redirect('/');
    }) 
    .catch((error)=>{
        if(error){
            req.flash('error-message', error.message);
            res.redirect('/');
    } 
  });
});

//Delete Message
app.get('/message/delete-message/:messageId', async (req, res) =>{
    const messageId = req.params.messageId; 
    //const {messageId} = req.params;
    const deletedMsg = await Message.findByIdAndDelete(messageId);
        if(!deletedMsg){
            req.flash('error-message', 'Message not deleted');
            return res.redirect('back');
        }
        req.flash('success-message', 'Message deleted successfully');
        res.redirect('back');
    
});

//User Registration
app.get('/user/register', (req, res)=>{
    res.render('register');
});

app.post('/user/register', async(req, res)=>{
    let {email, fullName, password, confirmPassword} = req.body;

    if(password != confirmPassword){
        req.flash('error-message', 'Passwords do not match');
        return res.redirect('back');
    }

    let userExists = await User.findOne({email:email});

    if (userExists){
        req.flash('error-message', 'Email already exist!!');
        return res.redirect('back');
    }

    // Hash Password

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    let newUser = new User({
        email:email,
        fullName:fullName,
        password:hashedPassword,
    });    

    await newUser.save();

    if(!newUser){
        req.flash('error-message', 'Something Went Wrong, Please try again');
        return res.redirect('back');
    }

    req.flash('success-message', 'User created!!');
        return res.redirect('/user/login');
});


//User Login
app.get('/user/login', (req, res)=>{
    res.render('login');
});

//User Profile
app.get('/user/profile', (req, res)=>{
    res.render('profile');
});
     // //To check if email does not exist :ALTERNATIVE 1

// app.post('/user/login', async (req, res)=>{

//     // let {email, password} = req.body;

//     // let user = await User.findOne({email});

//     // if (!user){
//     //     req.flash('error-message', 'This email is not registered');
//     //     return res.redirect('back');
//     // }

// });

    // ALTERNATIVE 2
app.post('/user/login', passport.authenticate('local', {
    successRedirect: '/user/profile',
    failureRedirect: '/user/login',
    failureFlash: true,
    successFlash: true,
    session: true
}));

//User Logout
app.get('/user/logout', (req, res)=>{
    req.logOut();
    req.flash('success-message', 'User logged out');
    res.redirect('/user/login');
});


app.listen(port, () => console.log(`Server listening on port : ${port}`));