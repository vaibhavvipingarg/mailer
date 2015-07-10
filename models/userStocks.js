var mongoose     = require('mongoose');

var Schema       = mongoose.Schema;

var userSchema   = new Schema({
	email        : String,
	stocks       : [String],
	interval     : String
});

module.exports = mongoose.model('users', userSchema);