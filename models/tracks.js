var mongoose = require('mongoose'),
	Schema = mongoose.Schema;


var tracksSchema = new Schema({
	name: { type: String },
	url: { type: String },
	diskName: {type: String},
	image: {type: String}
});

module.exports = mongoose.model('Tracks', tracksSchema);