/**
 * twitspot Spotify.
 *
 * @author   Patrick Schroen / https://github.com/pschroen
 * @license  MIT Licensed
 */

/* jshint strict:true, eqeqeq:true, newcap:false, multistr:true, expr:true, loopfunc:true, shadow:true, node:true, indent:4 */
"use strict";

var path = require('path'),
    request = require('request'),
    api = require(process.cwd()+'/node_modules/node-spotify/build/Release/spotify')({
        appkeyFile: path.join(process.env.HOME || process.env.USERPROFILE, 'spotify_appkey.key')
    });

var debug = require('debug')('twitspot:spotify');

process.on('message', function (payload) {
    debug('message  : '+JSON.stringify(payload));
    var message = payload.message,
        data = payload.data,
        id = payload.id;
    switch (message) {
        case 'login':
            api.on({
                ready: function () {
                    debug('ready');
                    process.send({id:id});
                }
            });
            api.login(data.username, data.password, false, false);
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
            var track = api.createFromLink(data.id);
            api.player.on({
                endOfTrack: function () {
                    debug('track finish');
                    process.send({id:id});
                }
            });
            api.player.play(track);
            break;
    }
});
