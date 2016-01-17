var Tracks = require('./../models/tracks');
var querystring = require('querystring');
var Track = mongoose.model('Tracks');
var mongoose = require('mongoose');
var request = require('request');
var http = require('http');
var fs = require('fs');


// Devuelve una lista de las canciones disponibles y sus metadatos
exports.list = function (req, res) {

	// Conectamos a la BBDD de Mongodb y buscamos todas las "tracks".
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
exports.show = function (req, res) {

	// Imprimos la peticion pedida.
	console.log("Request: "+req.params.trackId);

	// Buscamos dentro de la BBDD aquella que tiene como diskName (Nombre en Disco) la ID pasada en la request.
	var query = Track.findOne({'diskName':req.params.trackId});

	// Ejecutamos la busqueda y si la encontramos renderizamos la vista con el objeto cancion (contiene ademas la caratula).
	query.exec(function(err,track){
		if (err){
			console.log("ERROR: Fallo encontrando la cancion en la BBDD: " + err);
		}else{
			console.log("SUCCESS: Cancion encontrada: " + track);
			res.render('tracks/show', {track: track});
		}
	});
};


// Escribe una nueva canción en el registro de canciones.
exports.create = function (req, res) {

	/**********************************************************************************/
	/********************************** CARATULAS *************************************/

	// Las caratulas se guardan en /CDPSfy_Server/public/images, que se encuentra montado y replicado, para mejorar disponibilidad.

	// Variables para las caratulas.
	var caratulaURL = '';
	var allowedExtensionsImage = ["png","jpg","jpeg"];

	// Como poner la caratula es opcional, no comprobamos si el campo se encuentra vacio, ya que si lo esta ponemos una por defecto.
	if (req.files.image != null){

		// Si la imagen de la caratula no tiene los formatos adecuados, entonces lanzamos mensaje de error de formato.
		if (allowedExtensionsImage.indexOf(req.files.image.extension.toLowerCase()) == -1){

			console.log("La imagen no es válida.");

			res.render('tracks/new', {
		       	errorformat: false,
		       	errorformatImage: true,
		       	errornosongfound: false,
		       	msgsuccess: false
		   	});

		// En su caso subimos la imagen a /CDPSfy/public/images
		}else{

			// La url de upload debe llevar el ./public delante. La que guardamos no.
			var imagesURLUpload = './public/images/';
			var imagesURLGuardar = '/images/';

			// Fichero con la caratula.
			var caratula = req.files.image;

			// Hacemos un nombre con un numero random entre 1-100, para evitar duplicados o repeticiones.
			var random = Math.floor((Math.random() * 100) + 1);
			var caratulaName = random+caratula.originalname;
			var newURL = imagesURLUpload + caratulaName;
			
			// Guardamos la imagen.
			fs.writeFile(newURL, caratula.buffer, 'binary', function(err) {

				// Si por algun casual se produce un error al guardar la imagen ponemos la imagen por defecto.
		    	if(err) {
		    	    console.log("ERROR: No se pha podido guardar la caratula. " + err);
		    	    var imagesURL = '/images/iconodisco.jpg';
					caratulaURL = imagesURL;
					
		    	}else{
		    		console.log("SUCCESS: Caratula guardada.");
		    		caratulaURL = imagesURLGuardar+caratulaName;
		    	}
			}); 
		}

	// Si no hay imagen subida ponemos la imagen por defecto.	
	}else{ 
		var imagesURL = '/images/iconodisco.jpg';
		caratulaURL = imagesURL;
	}

	/******************************** FIN CARATULAS ************************************/
	/***********************************************************************************/


	/**********************************************************************************/
	/********************************** CANCIONES *************************************/

	// URL para guardar la cancion (y solo la cancion, no la caratula) en los discos nas.
	var urlPostTracks = 'http://www.tracks.cdpsfy.es/api/tracks';

	// Variables para las canciones.
	var track = req.files.track;
	var extension = track.extension;
	var allowedExtensions = ["mp3","wav","ogg"];
	var name = track.originalname.split('.')[0];
	var id = track.name.split('.')[0];
	var buffer = track.buffer;

	// Esta url debe ser la correspondiente al nuevo fichero en tracks.cdpsfy.es
	var url = '';

	// Imprimimos la cancion subida.
	console.log('Nuevo fichero de audio. Datos: ', track);
	
	// Si se ha subido cancion devolvemos un mensaje de error
	if (typeof track === 'undefined'){

		console.log("No ha seleccionado una cancion.");
		res.render('tracks/new', {
	       	errorformat: false,
	       	errornosongfound: true,
	       	errorformatImage: false,
	       	msgsuccess: false
	   	});
	}

	// Recogemos la extension para comprobar si se encuentra entre las permitidas.
	extension.toLowerCase();

	// Si no esta entre los formatos permitidos mandamos un error de formato.
	if (allowedExtensions.indexOf(extension) == -1){
		console.log("Formato incorrecto");
			res.render('tracks/new', {
       			errorformat: true,
       			errornosongfound: false,
       			errorformatImage: false,
       			msgsuccess: false
   			});
	}

	// Implementamos la escritura del fichero de audio (track.buffer) en tracks.cdpsfy.es.

	// Peticion POST para guardar la cancion en el tracks.
	var formData = {
		filename: name+'.'+extension,
		my_buffer: buffer
	};

	// Mandamos la peticion para guardar la cancion a tracks.cdpsfy.es para guardarla en los discos nas.
	request.post({url:urlPostTracks, formData: formData}, function optionalCallback(err, httpResponse, body) {

		if (err) {
		  return console.error('upload failed:', err);

		}else{
		  // Guardamos la URL, que será la respuesta que de la conexion, si todo ha ido bien.
		  // El parametro body es del estilo: NOMBRE.mp3

		  // Le ponemos delante el prefijo para llamar al GET de la API.
		  var newURL = 'http://www.tracks.cdpsfy.es/api/tracks/'+body;

		  console.log('Upload successful!  Server responded with URL:', body);

		  // Escribe los metadatos de la nueva canción en la BBDD_
		  var track = new Track({
		  		name: name,
		  		url: newURL,
		  		diskName: body,
		  		image: caratulaURL
		  });

		  // Y los guardamos en la BBDD y redireccionamos a /tracks donde se ha debido subir la cancion con exito.
		  track.save(function(err, track){
		  	if (err){
		  		console.log("ERROR: Se ha producido un error guardando la cancion en la BBDD.");
		  	}else{
		  		console.log("SUCCESS: Cancion guardada en la BBDD. " + track);
		  	}
		  	res.redirect('/tracks');
		  });
		}
	});

	/******************************** FIN CANCIONES ************************************/
	/***********************************************************************************/
	
};


// Borra una canción (trackId) del registro de canciones. 
exports.destroy = function (req, res) {

	// Recogemos la id de la cancion a eliminar de la peticion.
	var diskName = req.params.id;

	// La URL de la cual recogemos de los discos nas.
	var serverURL = 'http://www.tracks.cdpsfy.es/api/tracks/'+diskName;
	request.post(serverURL, '');

	// Buscamos en la BBDD con la ID para eliminarla.
	var query = Track.findOne({'diskName':diskName});

	// Ejecutamos la peticion de buscar la cancion en la BBDD.
	query.exec(function(err,track){

		if (err){
			console.log("ERROR: Fallo encontrando la cancion en la BBDD.");
		}else{
			console.log("SUCCESS: Encontrada la cancion en la BBDD.")

			// Si la imagen es la de por defecto no se borra.
			if (track.image !== '/images/iconodisco.jpg'){
				var filePath = './public'+track.image ; 
				fs.unlinkSync(filePath);
			}
			
			// Borrada la imagen, ahora borramos la cancion.
			track.remove(function(err){
				if (err){
					console.log("ERROR: Se ha producido un error borrando la cancion.");
				}else{
					console.log("SUCCESS: Cancion borrada.");
				}
				res.redirect('/tracks');
			});
		}
	});
};