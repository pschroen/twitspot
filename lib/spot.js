/**
 * twitspot.
 *
 * @author   Patrick Schroen / https://github.com/pschroen
 * @license  MIT Licensed
 */

/* jshint strict:true, eqeqeq:true, newcap:false, multistr:true, expr:true, loopfunc:true, shadow:true, node:true, indent:4 */
"use strict";

var lame = require('lame'),
    Speaker = require('speaker'),
    Spotify = require('spotify-web'),
    request = require('request'),
    spot = null;

var debug = require('debug')('twitspot:spot');

process.on('message', function (payload) {
    debug('message  : '+JSON.stringify(payload));
    var message = payload.message,
        data = payload.data,
        id = payload.id;
    switch (message) {
        case 'login':
            Spotify.login(data.spotify_username, data.spotify_password, function (err, spotify) {
                debug('spotify login  : '+err+'  '+(typeof spotify));
                if (err) throw err;
                spot = spotify;
                process.send({id:id});
            });
            break;
        case 'search':
            var url = 'https://api.spotify.com/v1/search?q='+encodeURIComponent(data.query)+'&type=artist,track';
            debug('spotify search  : '+url);
            request({url:url}, function (err, response, body) {
                debug('spotify search  : '+err+'  '+JSON.stringify(response)+'  '+body);
                if (err) throw err;
                var data = JSON.parse(body);
                process.send({data:data, id:id});
            });
            break;
        case 'get':
            spot.get(data.uri, function (err, track) {
                debug('track get  : '+err+'  '+(typeof track));
                if (err) throw err;
                track.play().pipe(new lame.Decoder()).pipe(new Speaker()).on('finish', function () {
                    debug('track finish');
                    process.send({id:id});
                });
            });
            break;
    }
});
