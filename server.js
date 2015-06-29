var express=require('express');
var nodemailer = require("nodemailer");
var app=express();
var request = require('request');
var configDB = require('./config/database.js');
var mongoose   = require('mongoose');

var userStocks = require('./models/userStocks');
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

	userStocks.findOne({ 'email' :  req.query.to }, function(err, user) {
		if (err)
			res.send(err);
		if (!user) {
			user = new userStocks();		// create a new instance of the Bear model
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
		});		
	});
});

function start() {
	//Loop over the users in the DB to send messages 
	setInterval(function() {
		 userStocks.find(function(err, users) {
			if (err)
		  	  console.log(err);

		  	for(i in users) {
		  		var user = users[i];
		  		loopUsers(user._doc);
		  	}
		 }, 1000*60*5);
	});
}

function loopUsers(user){
	function checkLogic(data, fn) {
		var mailOptions = {
			to : user.email,
			subject : data.Symbol,
			text : 'Last Price: ' + data.LastPrice + ', Change: ' + data.Change
		};
		if (stocks[data.Symbol] && ((stocks[data.Symbol] > data.LastPrice*1.03) || (stocks[data.Symbol] < data.LastPrice*.97))) {
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

/*// middleware to use for all requests
app.use(function(req, res, next) {
	// do logging
	console.log('Something is happening.');
	// Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://10.21.16.83:3001');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
	next();
});
*/
/*--------------------Routing Over----------------------------*/
var port = Number(process.env.PORT || 3001);
app.listen(port, function(){
	start();
	console.log("Express Started on Port 3001");
});