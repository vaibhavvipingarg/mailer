var express=require('express');
var nodemailer = require("nodemailer");
var app=express();
var request = require('request');
var configDB = require('./config/database.js');
var mongoose   = require('mongoose');

var users = require('./models/userStocks');
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
app.use(express.static(__dirname + '/app'));

// create a shop (accessed at POST http://localhost:8080/api/shops)
app.get('/user', function(req, res) {
	users.findOne({ 'email' :  req.query.email }, function(err, user) {
		if (err)
			res.send(err);

		if (!user) {
			res.json({status: 200, data: []});
		} else {
			res.json({status: 200, data: user.stocks});
		}		
	});	
});

app.get('/unregister', function(req, res) {
	var to = req.query.to;
	var stock = req.query.symbol;

	users.findOne({ 'email' : to }, function(err, user) {
		if (err)
			res.send(err);

		if (user) {
			var stockIndex = user.stocks.indexOf(stock);
			if (stockIndex !== -1) {
				user.stocks.splice(stockIndex, 1);
			}

			user.save(function(err) {
			if (err)
				res.send({status: 501, data: []});

				res.json({status: 200, data: []});
			});		
		}
	});
});

app.get('/register', function(req, res) {
	function getStockData(tckr) {
		//loop over all the stocks for the user
		var url = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quote%20where%20symbol%20in%20(%22' + tckr + '%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
		request(url, function (error, response, body) {
		  var data = JSON.parse(body).query;
		  if (!error && data != null && data.results != null) {
		  	  stocks[tckr] = data.results.quote.LastTradePriceOnly;
	      }
		});			
	}

	users.findOne({ 'email' :  req.query.to }, function(err, user) {
		if (err)
			res.send(err);
		if (!user) {
			user = new users();		// create a new instance of the Bear model
			user.email = req.query.to;  // set the bears name (comes from the request)
			user.stocks.push(req.query.subject);  // set the bears name (comes from the request)
		} else if (user.stocks.indexOf(req.query.subject) === -1){
			user.stocks.push(req.query.subject);
		}		

		user.save(function(err) {
			if (err)
				res.send(err);

			getStockData(req.query.subject);
			res.json({status: 200, data: req.query.subject});
		});		
	});
});

function start() {
	//Loop over the users in the DB to send messages 
	setInterval(function() {
		 users.find(function(err, users) {
			if (err)
		  	  console.log(err);

		  	for(i in users) {
		  		var user = users[i];
		  		loopUsers(user._doc);
		  	}
		 }, 300000);
	});
}

function loopUsers(user){
	function checkLogic(data, fn) {
		var mailOptions = {
			to : user.email,
			subject : data.Symbol,
			text : 'Last Price: ' + data.LastTradePriceOnly + ', Change: ' + data.Change
		};
		if (stocks[data.Symbol] === undefined) {
			stocks[data.Symbol] = data.LastTradePriceOnly;;
		}
		if ((stocks[data.Symbol] > data.LastTradePriceOnly*1.03) || (stocks[data.Symbol] < data.LastTradePriceOnly*.97)) {
			//Update the price
	  	    stocks[data.Symbol] = data.LastTradePriceOnly;
			fn(mailOptions);
		}
	}

	function getStockData(fn) {
		//loop over all the stocks for the user
		for (var i = 0; i < user.stocks.length; i++) {
			//loop over all the stocks for the user
			var url = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quote%20where%20symbol%20in%20(%22' + user.stocks[i] + '%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
			request(url, function (error, response, body) {
				if (!error) {
						if (body) {
						var data = JSON.parse(body).query;
						if (!error && data != null && data.results != null) {
					  	  checkLogic(JSON.parse(body).query.results.quote, fn);  
					    }											
					}
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
var port = Number(process.env.PORT || 3000);
app.listen(port, function(){
	start();
	console.log("Express Started");
});