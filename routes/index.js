var express = require('express');
var router = express.Router();
var multer  = require('multer');

var tracks_dir = process.env.TRACKS_DIR || './media/';

var trackController = require('../controllers/track_controller');

router.get('/', function(req, res) {
  res.render('index');
});

router.get('/tracks', trackController.list);

router.get('/tracks/new', trackController.new);

router.get('/tracks/:trackId', trackController.show);

router.post('/tracks', multer({inMemory: true}), trackController.create);

router.delete('/tracks/:id', trackController.destroy);

module.exports = router;