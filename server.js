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

var stocks = {};
app.get('/',function(req,res){
	res.sendfile('index.html');
});

// create a shop (accessed at POST http://localhost:8080/api/shops)
app.get('/register', function(req, res) {
	function getStockData(tckr) {
		//loop over all the stocks for the user
		request('http://dev.markitondemand.com/Api/v2/Quote/json?symbol=' + tckr, function (error, response, body) {
		  if (!error && response.statusCode == 200) {
		  	  stocks[tckr] = JSON.parse(body).LastPrice;
	      }
		});			
	}

	client.findOne({ 'email' :  req.query.to }, function(err, user) {
		if (err)
			res.send(err);
		if (!user) {
			user = new client();		// create a new instance of the Bear model
			user.email = req.query.to;  // set the bears name (comes from the request)
			user.stocks.push(req.query.subject);  // set the bears name (comes from the request)
		} else if (user.stocks.indexOf[req.query.subject] === -1){
			user.stocks.push(req.query.subject);
		}		

		user.save(function(err) {
			if (err)
				res.send(err);

			getStockData(req.query.subject);
			res.json("200");
			start();
		});		
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
	function checkLogic(data, fn) {
		var mailOptions = {
			to : user.email,
			subject : data.Symbol,
			text : 'Last Price: ' + data.LastPrice + ', Change: ' + data.Change
		};
		if (stocks[data.Symbol] && ((stocks[data.Symbol] > data.LastPrice*1.15) || (stocks[data.Symbol] < data.LastPrice*.85))) {
			fn(mailOptions);
		}
	}

	function getStockData(fn) {
		//loop over all the stocks for the user
		for (var i = 0; i < user.stocks.length; i++) {
			request('http://dev.markitondemand.com/Api/v2/Quote/json?symbol=' + user.stocks[i], function (error, response, body) {
			  if (!error && response.statusCode == 200) {
			  	  checkLogic(JSON.parse(body), fn);  
			  	  stocks[JSON.parse(body).Symbol] = JSON.parse(body).LastPrice;
		      }
			});			
		}
	}

	function callbackFn(mailOptions) {
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