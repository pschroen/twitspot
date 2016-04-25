/**
 * twitspot Spotify.
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
    api = null;

var debug = require('debug')('twitspot:spotify');

process.on('message', function (payload) {
    debug('message  : '+JSON.stringify(payload));
    var message = payload.message,
        data = payload.data,
        id = payload.id;
    switch (message) {
        case 'login':
            Spotify.login(data.username, data.password, function (err, spotify) {
                debug('login  : '+err+'  '+(typeof spotify));
                if (err) throw err;
                api = spotify;
                process.send({id:id});
            });
            break;
        case 'search':
            var url = 'https://api.spotify.com/v1/search?q='+encodeURIComponent(data.query)+'&type=track&market='+api.country+'&limit=1';
            debug('search  : '+url);
            request({url:url}, function (err, response, body) {
                debug('search  : '+err+'  '+JSON.stringify(response)+'  '+body);
                if (err) throw err;
                // Normalize track data
                var data = JSON.parse(body),
                    track = data.tracks.items.length ? {
                        name: data.tracks.items[0].name,
                        artists: [{
                            name: data.tracks.items[0].artists[0].name+(data.tracks.items[0].artists[1] ? ' feat. '+data.tracks.items[0].artists[1].name : '')
                        }],
                        album: {
                            images: [{
                                url: data.tracks.items[0].album.images[0].url
                            }]
                        },
                        id: data.tracks.items[0].uri
                    } : null;
                process.send({data:track, id:id});
            });
            break;
        case 'get':
            api.get(data.id, function (err, track) {
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
