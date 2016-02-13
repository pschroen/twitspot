/**
 * twitspot.
 *
 * @author   Patrick Schroen / https://github.com/pschroen
 * @license  MIT Licensed
 */

/* jshint strict:true, eqeqeq:true, newcap:false, multistr:true, expr:true, loopfunc:true, shadow:true, node:true, indent:4 */
"use strict";

var path = require('path'),
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
            var search = new spotify.Search(data.query, 0, 1);
            search.execute(function (err, searchResult) {
                debug('spotify search  : '+err+'  '+JSON.stringify(searchResult));
                process.send({data:searchResult.totalTracks ? searchResult.getTrack(0) : null, id:id});
            });
            break;
        case 'get':
            var track = spotify.createFromLink(data.link);
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
