var express=require('express');
var nodemailer = require("nodemailer");
var app=express();
var request = require('request');
var configDB = require('./config/database.js');
var mongoose   = require('mongoose');

var client     = require('./models/user');
/*
Connect to DB
*/
mongoose.connect(configDB.userUrl); // connect to our database
/*
Here we are configuring our SMTP Server details.
STMP is mail server which is responsible for sending and recieving email.
*/
var smtpTransport = nodemailer.createTransport("SMTP", {
	service: "Gmail",
	auth: {
		user: "afrundus@gmail.com",
		pass: "vabs123qwer"
	}
});
/*------------------SMTP Over-----------------------------*/

/*------------------Routing Started ------------------------*/

app.get('/',function(req,res){
	res.sendfile('index.html');
});

// create a shop (accessed at POST http://localhost:8080/api/shops)
app.get('/register', function(req, res) {
	var user = new client();		// create a new instance of the Bear model
	user.email = req.query.to;  // set the bears name (comes from the request)
	user.stocks = req.query.subject;  // set the bears name (comes from the request)

	user.save(function(err) {
		if (err)
			res.send(err);

		res.json("200");
		start();
	});
});

function start() {
	//Loop over the users in the DB to send messages 
	setInterval(function() {
		 client.find(function(err, users) {
			if (err)
		  	  console.log(err);

		  	for(i in users) {
		  		var user = users[i];
		  		loopUsers(user._doc);
		  	}
		 }, 30000);
	});
}

function loopUsers(user){
	var mailOptions={
		to : user.email,
		subject : user.stocks,
		text : ''
	}

	function getStockData(fn) {
		request('http://dev.markitondemand.com/Api/v2/Quote/json?symbol=' + user.stocks, function (error, response, body) {
		  if (!error && response.statusCode == 200) {
			  fn(body);
	      }
		});
	}

	function callbackFn(data) {
		mailOptions.text = data;
		smtpTransport.sendMail(mailOptions, function(error, response){
			if(error) {
				console.log("error");
			} else {
				console.log("sent");
			}
		});
	}
	getStockData(callbackFn)
}

/*--------------------Routing Over----------------------------*/

app.listen(3001,function(){
console.log("Express Started on Port 3001");
});