/**
 * twitspot.
 *
 * @author   Patrick Schroen / https://github.com/pschroen
 * @license  MIT Licensed
 */

/* jshint strict:true, eqeqeq:true, newcap:false, multistr:true, expr:true, loopfunc:true, shadow:true, node:true, indent:4 */
"use strict";

var path = require('path'),
    request = require('request'),
    spotify = require('../node_modules/node-spotify/build/Release/spotify')({
    appkeyFile: path.join(process.env.HOME || process.env.USERPROFILE, 'spotify_appkey.key')
});

var debug = require('debug')('twitspot:spot');

process.on('message', function (payload) {
    debug('message  : '+JSON.stringify(payload));
    var message = payload.message,
        data = payload.data,
        id = payload.id;
    switch (message) {
        case 'login':
            spotify.on({
                ready: function () {
                    debug('spotify ready');
                    process.send({id:id});
                }
            });
            spotify.login(data.spotify_username, data.spotify_password, false, false);
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
            var track = spotify.createFromLink(data.uri);
            spotify.player.on({
                endOfTrack: function () {
                    debug('track finish');
                    process.send({id:id});
                }
            });
            spotify.player.play(track);
            break;
    }
});
