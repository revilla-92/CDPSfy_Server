var fs = require('fs');
var track_model = require('./../models/track');
var querystring = require('querystring');
var http = require('http');

// Devuelve una lista de las canciones disponibles y sus metadatos
exports.list = function (req, res) {
	var tracks = track_model.tracks;
	res.render('tracks/index', {tracks: tracks});
};

// Devuelve la vista del formulario para subir una nueva canción
exports.new = function (req, res) {
	res.render('tracks/new');
};

// Devuelve la vista del formulario para subir una nueva canción con un error.
exports.new_error = function (req, res) {
	res.render('tracks/new_error');
};

// Devuelve la vista de reproducción de una canción.
// El campo track.url contiene la url donde se encuentra el fichero de audio
exports.show = function (req, res) {
//OJO!!! CAMBIAR POR MONGODB
	var track = track_model.tracks[req.params.trackId];
	track.id = req.params.trackId;
	res.render('tracks/show', {track: track});
};

// Escribe una nueva canción en el registro de canciones.
exports.create = function (req, res) {
/***OJO!!! CAMBIAR ESTA URL POR LA QUE SEA PARA IR HACIA TRACKS. Seguramente tracks.cdpsfy.es **/
	var urlPostTracks = 'http://www.tracks.cdpsfy.es/api/tracks';

	var track = req.files.track;
	var extension = track.extension;
	var allowedExtensions = ["mp3","wav","ogg"];
	extension.toLowerCase();

	//si la extension no está en el array de allowedExtensions, redirecciono a error.
	if (allowedExtensions.indexOf(extension) == -1){
		res.render('tracks/new_error');
		return;
	}
	console.log('Nuevo fichero de audio. Datos: ', track);
	var id = track.name.split('.')[0];
	var name = track.originalname.split('.')[0];

	// Aquí debe implementarse la escritura del fichero de audio (track.buffer) en tracks.cdpsfy.es
	// Esta url debe ser la correspondiente al nuevo fichero en tracks.cdpsfy.es
	var buffer = track.buffer;

	var url = '';
	//peticion POST para guardar la cancion en el tracks
	var request = require('request');
	var formData = {
		filename: name+'.'+extension,
		my_buffer: buffer
	};
	request.post({url:urlPostTracks, formData: formData}, function optionalCallback(err, httpResponse, body) {
		if (err) {
		  return console.error('upload failed:', err);
		}else{
		  //guardamos la URL, que será la respuesta que de la conexion, si todo ha ido bien.
		  //body es del estilo: NOMBRE.mp3

//OJO!!!! CAMBIAR LA RUTA DE A TRACKS.CDPSFY.ES!!!
		  //le ponemos delante el prefijo para llamar al GET de la API
		  var newURL = 'http://www.tracks.cdpsfy.es/api/tracks/'+body;


		  console.log('Upload successful!  Server responded with URL:', body);
		  // Escribe los metadatos de la nueva canción en el registro.

//OJO!!! CAMBIAR POR MONGODB
			track_model.tracks[id] = {
				name: name,
				url: newURL,
				diskName: body
			};
		}
	});

	res.redirect('/tracks');
};

// Borra una canción (trackId) del registro de canciones 
// A la api se llama por el nombre, por lo que recuperamos el diskname del modelo de datos.
exports.destroy = function (req, res) {
//OJO!!! CAMBIAR POR MONGODB
	var trackId = req.params.id;
	var trackSelected = track_model.tracks[trackId];
	var diskName = trackSelected.diskName;
	var serverURL = 'http://www.tracks.cdpsfy.es/api/tracks'+diskName;
	var request = require('request');
	request.post(serverURL, '');

	// Borra la entrada del registro de datos
	delete track_model.tracks[trackId];
	res.redirect('/tracks');
};