var mongoose     = require('mongoose');

var Schema       = mongoose.Schema;

var userStocksSchema   = new Schema({
	email        : String,
	stocks       : [String],
	interval     : String
});

module.exports = mongoose.model('userStocks', userStocksSchema);