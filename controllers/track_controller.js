var track_model = require('./../models/track');
var querystring = require('querystring');
var request = require('request');
var http = require('http');
var fs = require('fs');


// Devuelve una lista de las canciones disponibles y sus metadatos
exports.list = function (req, res) {
	var tracks = track_model.tracks;
	res.render('tracks/index', {tracks: tracks});
};


// Devuelve la vista del formulario para subir una nueva canción
exports.new = function (req, res) {
	res.render('tracks/new', {
       	errorformat: false,
       	errornosongfound: false,
       	msgsuccess: false
    });
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
// TODO:
// - Escribir en tracks.cdpsfy.es el fichero de audio contenido en req.files.track.buffer --> Hecho
// - Escribir en el registro la verdadera url generada al añadir el fichero en el servidor tracks.cdpsfy.es --> Hecho
exports.create = function (req, res) {

	// URL donde mandaremos la peticion POST paara que guarde en los discos NAS la cancion subida.
	var urlPostTracks = 'http://www.tracks.cdpsfy.es/api/tracks';

	// Recogemos la informacion de la track que vamos a subir.
	var track = req.files.track;
	console.log('Nuevo fichero de audio. Datos: ', track);

	// Si pulsamos el boton cuando se ha subido una cancion entramos en la siguientes comprobaciones.
	if (typeof track !== 'undefined') {
    	// Array con los formatos permitidos.
		var allowedFormats = ["mp3","wav","ogg"];

		// Cogemos de la track la informacion del nombre y la id.
		var id = track.name.split('.')[0];
		var name = track.originalname.split('.')[0];
		
		console.log(name);
		console.log(id);

		// Cogemos la informacion de la cancion almacenada en el buffer.
		var buffer = track.buffer;
		
		// Cogemos la informacion del formato para hacer comprobaciones sobre el mismo.
		var format = track.extension;
		format.toLowerCase();
		console.log(format);

		// Si el formato no es de los formatos permitidos mostramos un error.
		if (allowedFormats.indexOf(format) == -1){
			console.log("Formato incorrecto");
			res.render('tracks/new', {
       			errorformat: true,
       			errornosongfound: false,
       			msgsuccess: false
   			});
		} 
		// Si el formato es adecuado entonces subimos la cancion.
		else{

			// Aquí debe implementarse la escritura del fichero de audio (track.buffer) en tracks.cdpsfy.es
			// Esta url debe ser la correspondiente al nuevo fichero en tracks.cdpsfy.es
			var url = '';

			// Peticion POST para guardar la cancion en tracks.cdpsfy.es.
			var formData = {
				filename: name+'.'+format,
				my_buffer: buffer
			};

			request.post({url:urlPostTracks, formData: formData}, function optionalCallback(err, httpResponse, body) {
				if (err) {
		  			return console.error('Fallo al hacer upload:', err);

				} else{
			  		
			  		// Guardamos la URL, que será la respuesta que de la conexion, si todo ha ido bien.
			  		// Le ponemos delante el prefijo para llamar al GET de la API.
			  		// La variable body es del estilo: NOMBRE.mp3
			  		var newURL = 'http://www.tracks.cdpsfy.es/api/tracks/'+body;
			  		console.log('Upload realizado con exito! El servidor ha respondido con la URL: ', body);

			  		// Escribe los metadatos de la nueva canción en el registro.
//OJO!!! CAMBIAR POR MONGODB
					track_model.tracks[id] = {
						name: name,
						url: newURL,
						diskName: body
					};
				}
			});

			console.log("Se ha subido la cancion sin problemas.");
			res.render('tracks/new', {
		       	errorformat: false,
		       	errornosongfound: false,
		       	msgsuccess: true
		   	});
		}

	// Si hemos pulsado sin querer el boton de upload sin haber seleccionado el mensaje de que seleccione una cancion.
	} else {
		console.log("No ha seleccionado una cancion.");
		res.render('tracks/new', {
	       	errorformat: false,
	       	errornosongfound: true,
	       	msgsuccess: false
	   	});
	}

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