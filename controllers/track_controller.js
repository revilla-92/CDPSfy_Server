var fs = require('fs');
//var track_model = require('./../models/track');
var querystring = require('querystring');
var http = require('http');

var mongoose = require('mongoose');
var Tracks = require('./../models/tracks');
var Track = mongoose.model('Tracks');

// Devuelve una lista de las canciones disponibles y sus metadatos
exports.list = function (req, res) {


	//conectamos con mongo y recogemos el listado de tracks:
	var listado = Track.find(function(err, tracks){
		if (err){
			console.log("ERROR BUSCANDO CANCIONES"+ err);
		}else{
			res.render('tracks/index', {tracks: tracks});
		}
	});
};

// Devuelve la vista del formulario para subir una nueva canción
exports.new = function (req, res) {
	res.render('tracks/new', {
       	errorformat: false,
       	errornosongfound: false,
       	errorformatImage: false,
       	msgsuccess: false
    });
};

// Devuelve la vista de reproducción de una canción.
// El campo track.url contiene la url donde se encuentra el fichero de audio
exports.show = function (req, res) {

	console.log("REQ: "+req.params.trackId);

	var query = Track.findOne({'diskName':req.params.trackId});

	query.exec(function(err,track){
		if (err){
			console.log("FALLO ENCONTRANDO LA CANCION EN LA BBDD "+err);
		}else{
			console.log("ENCONTRADA: "+track);
			res.render('tracks/show', {track: track});
		}
	});
};

// Escribe una nueva canción en el registro de canciones.
exports.create = function (req, res) {
/***OJO!!! CAMBIAR ESTA URL POR LA QUE SEA PARA IR HACIA TRACKS. Seguramente tracks.cdpsfy.es **/
	var urlPostTracks = 'http://www.tracks.cdpsfy.es/api/tracks';

	var caratulaURL = '';

	var allowedExtensionsImage = ["png","jpg","jpeg"];

	/***CARATULA***/
	//Las caratulas se guardan en public/images

	//poner la caratula es opcional, por lo que compruebo si la ha puesto para subirla o no.
	if (req.files.image != null){
		console.log(allowedExtensionsImage.indexOf(req.files.image.extension.toLowerCase()));
		if (allowedExtensionsImage.indexOf(req.files.image.extension.toLowerCase()) == -1){
			console.log("La imagen no es válida.");
			res.render('tracks/new', {
		       	errorformat: false,
		       	errorformatImage: true,
		       	errornosongfound: false,
		       	msgsuccess: false
		   	});

			return;

		}else{
			//La url de upload debe llevar el ./public delante. La que guardamos no.
			var imagesURLUpload = './public/images/';
			var imagesURLGuardar = '/images/';

			//fichero
			var caratula = req.files.image;

			//hacemos un nombre con un numero random entre 1-100, para no repetir
			var random = Math.floor((Math.random() * 100) + 1);
			var caratulaName = random+caratula.originalname;
			var newURL = imagesURLUpload + caratulaName;
			
			var fs = require('fs');
			fs.writeFile(newURL, caratula.buffer, 'binary', function(err) {
		    	if(err) {
		    	    console.log("ERROR AL GUARDAR LA CARATULA"+err);
		    	    var imagesURL = '/images/quaver3.png';
					caratulaURL = imagesURL;
		    	}else{
		    		console.log("CARATULA GUARDADA");
		    		caratulaURL = imagesURLGuardar+caratulaName;
		    	}
			}); 
		}
	}else{ // no hay imagen
		var imagesURL = '/images/quaver3.png';
		caratulaURL = imagesURL;
	}
	/**************/

	var track = req.files.track;
	//si no hay cancion
	if (typeof track == 'undefined'){
		console.log("No ha seleccionado una cancion.");
		res.render('tracks/new', {
	       	errorformat: false,
	       	errornosongfound: true,
	       	errorformatImage: false,
	       	msgsuccess: false
	   	});
	   	return;
	}

	var extension = track.extension;
	var allowedExtensions = ["mp3","wav","ogg"];
	extension.toLowerCase();



	//si la extension no está en el array de allowedExtensions, redirecciono a error.
	if (allowedExtensions.indexOf(extension) == -1){
		console.log("Formato incorrecto");
			res.render('tracks/new', {
       			errorformat: true,
       			errornosongfound: false,
       			errorformatImage: false,
       			msgsuccess: false
   			});
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

		  var track = new Track({
		  		name: name,
		  		url: newURL,
		  		diskName: body,
		  		image: caratulaURL
		  });

		  track.save(function(err, track){
		  	if (err){
		  		console.log("ERROR GUARDANDO CANCION EN LA BBDD");
		  	}else{
		  		console.log("CANCION GUARDADA EN LA BBDD: "+track);
		  	}
		  	res.redirect('/tracks');
		  });
		}
	});
};

// Borra una canción (trackId) del registro de canciones 
// A la api se llama por el nombre, por lo que recuperamos el diskname del modelo de datos.
exports.destroy = function (req, res) {
//OJO!!! CAMBIAR POR MONGODB

	var diskName = req.params.id;

	//var trackId = req.params.id;
	//var trackSelected = track_model.tracks[trackId];
	//var diskName = trackSelected.diskName;
	var serverURL = 'http://www.tracks.cdpsfy.es/api/tracks/'+diskName;
	var request = require('request');
	request.post(serverURL, '');

	// Borra la entrada del registro de datos
	//delete track_model.tracks[trackId];

	var query = Track.findOne({'diskName':diskName});

	query.exec(function(err,track){
		if (err){
			console.log("FALLO ENCONTRANDO LA CANCION EN LA BBDD");
		}else{
			//encontrada. Borramos.
			//borramos la imagen
			//si la imagen es la de por defecto, no la borro
			if (track.image !== '/images/quaver3.png'){
				var fs = require('fs');
				var filePath = './public'+track.image ; 
				fs.unlinkSync(filePath);
			}
			


			track.remove(function(err){
				if (err){
					console.log("ERROR BORRANDO LA CANCION");
				}else{
					console.log("CANCION BORRADA");
				}
				res.redirect('/tracks');
			});
		}
	});	

	

};