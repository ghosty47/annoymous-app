const express = require('express');
const path = require('path');
const app = express();
const ejs = require('ejs');
const { response } = require('express');
const port = process.env.PORT || 5050;
const mongoose = require('mongoose');
const Message = require('./models/Message');

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

//get
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/message/create-message',(req,res)=>{
    // console.log("Form data :::::::::", req.body)
    let {message} = req.body;

    if(!message){
        return res.redirect('/');
    }

    let newMessage = new Message({
        message
    });

    newMessage.save()
     .then((data)=> console.log('Message created successfully', data))
     .catch(()=> console.log('Error creating message'))
    res.redirect('/');

});


app.listen(port, () => console.log(`Server listening on port 9000:${port}`));