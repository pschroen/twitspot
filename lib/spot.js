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
    xml2js = require('xml2js'),
    spot = null;

process.on('message', function (payload) {
    var message = payload.message,
        data = payload.data,
        id = payload.id;
    switch (message) {
        case 'login':
            Spotify.login(data.spotify_username, data.spotify_password, function (err, spotify) {
                if (err) throw err;
                spot = spotify;
                process.send({id:id});
            });
            break;
        case 'search':
            spot.search(data.query, function (err, xml) {
                if (err) throw err;
                var parser = new xml2js.Parser();
                parser.on('end', function (data) {
                    process.send({data:data, id:id});
                });
                parser.parseString(xml);
            });
            break;
        case 'get':
            spot.get(Spotify.id2uri('track', data.id), function (err, track) {
                if (err) throw err;
                track.play().pipe(new lame.Decoder()).pipe(new Speaker()).on('finish', function () {
                    process.send({id:id});
                });
            });
            break;
    }
});
