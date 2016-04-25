/**
 * twitspot.io.
 *
 * @author   Patrick Schroen / https://github.com/pschroen
 * @license  MIT Licensed
 */

/* jshint strict:true, eqeqeq:true, newcap:false, multistr:true, expr:true, loopfunc:true, shadow:true, node:true, indent:4 */
/* globals shell */
"use strict";

var utils = require(shell.path+'/modules/utils'),
    Script = utils.Script(module.id, "twitspot.io");

var http = require('http'),
    file = new (require('node-static')).Server(shell.join(__dirname, 'public')),
    twit = new (require('twit'))(shell.twitter),
    ws = require('ws');

var app = null,
    server = null,
    wss = null,
    trackers = {};

var send = function (socket, data) {
    if (socket) {
        socket.send(JSON.stringify(data), function (err) {
            if (err && err.message !== 'not opened' && process.env.NODE_ENV !== 'production') console.error(err.stack);
        });
    }
};

/**
 * Initialize.
 *
 * @param    {Probe} probe Instance
 * @param    {undefined|initCallback} [callback]
 */
function init(probe, callback) {
    server = http.createServer(function (req, res) {
        var body = '';
        req.on('data', function (chunk) {
            body += chunk;
        }).on('end', function (error) {
            var pathname = req.url.replace(/.*\//, '');
            if (!body.length) {
                if (shell.twitspot.hashmusictag === '' || (pathname !== '' && shell.twitspot.hashmusictag !== '')) {
                    if (!shell.exists(shell.join(__dirname, 'public', req.url))) {
                        file.serveFile('index.html', 200, {}, req, res);
                    } else {
                        file.serve(req, res);
                    }
                } else {
                    res.writeHead(302, {'Location': '/'+shell.twitspot.hashmusictag});
                    res.end();
                }
            } else {
                if (pathname !== '') {
                    var data = JSON.parse(body);
                    probe.log("["+exports.id+"] Pushing #🎵"+pathname);
                    if (!trackers[pathname]) {
                        trackers[pathname] = {
                            sockets: [],
                            stream: null,
                            nowplaying: data.nowplaying,
                            tracks: data.tracks
                        };
                    } else {
                        trackers[pathname].nowplaying = data.nowplaying;
                        trackers[pathname].tracks = data.tracks;
                        for (var i = 0; i < trackers[pathname].sockets.length; i++) send(trackers[pathname].sockets[i], {nowplaying:trackers[pathname].nowplaying, tracks:trackers[pathname].tracks});
                    }
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('OK');
                }
            }
        }).resume();
    }).listen(shell.twitspot.port, function () {
        wss = new ws.Server({server:server});
        wss.on('connection', function (socket) {
            var pathname = socket.upgradeReq.url.replace(/.*\//, '');
            probe.log("["+exports.id+"] #🎵"+pathname);
            if (pathname === '' && shell.twitspot.hashmusictag === '') {
                if (!trackers[pathname]) {
                    trackers[pathname] = {
                        sockets: [socket],
                        stream: twit.stream('statuses/filter', {track:['#🎵', '#\u1f3b5']}),
                        nowplaying: null,
                        tracks: []
                    };
                    trackers[pathname].stream.on('connected', function (response) {
                        probe.log("["+exports.id+"] Tracking #🎵");
                    });
                    trackers[pathname].stream.on('tweet', function (tweet) {
                        probe.log("["+exports.id+"] Request from "+tweet.user.name+" @"+tweet.user.screen_name+" - "+tweet.text);
                        var query = tweet.text.replace(/\s?http.*\b/g, '').replace(new RegExp('\\s?#..\\b', 'i'), '').trim().toLowerCase(),
                            url = 'https://api.spotify.com/v1/search?q='+encodeURIComponent(query)+'&type=artist,track&limit=1';
                        probe.log("["+exports.id+"] HTTP GET request for "+url);
                        probe.get({url:url}, function (error, args) {
                            if (!error) {
                                var data = JSON.parse(args.body);
                                if (data.tracks.items.length) {
                                    var track = data.tracks.items[0];
                                    probe.log("["+exports.id+"] Found "+track.artists[0].name+" - "+track.name);
                                    trackers[pathname].tracks[0] = {track:track, tweet:tweet};
                                    for (var i = 0; i < trackers[pathname].sockets.length; i++) send(trackers[pathname].sockets[i], {nowplaying:trackers[pathname].nowplaying, tracks:trackers[pathname].tracks});
                                } else {
                                    var url = 'https://www.googleapis.com/customsearch/v1?q='+encodeURIComponent(query)+'&cx='+shell.google.customsearch.search_engine_id+'&key='+shell.google.customsearch.key;
                                    probe.log("["+exports.id+"] HTTP GET request for "+url);
                                    probe.get({url:url}, function (error, args) {
                                        if (!error) {
                                            var data = JSON.parse(args.body);
                                            if (data.spelling) {
                                                var url = 'https://api.spotify.com/v1/search?q='+encodeURIComponent(data.spelling.correctedQuery)+'&type=artist,track&limit=1';
                                                probe.log("["+exports.id+"] HTTP GET request for "+url);
                                                probe.get({url:url}, function (error, args) {
                                                    if (!error) {
                                                        var data = JSON.parse(args.body);
                                                        if (data.tracks.items.length) {
                                                            var track = data.tracks.items[0];
                                                            probe.log("["+exports.id+"] Found "+track.artists[0].name+" - "+track.name);
                                                            trackers[pathname].tracks[0] = {track:track, tweet:tweet};
                                                        } else {
                                                            probe.log("["+exports.id+"] No results");
                                                            trackers[pathname].tracks[0] = {track:null, tweet:tweet};
                                                        }
                                                        for (var i = 0; i < trackers[pathname].sockets.length; i++) send(trackers[pathname].sockets[i], {nowplaying:trackers[pathname].nowplaying, tracks:trackers[pathname].tracks});
                                                    } else {
                                                        probe.log("["+exports.id+"] HTTP GET error: "+error);
                                                    }
                                                });
                                            } else {
                                                probe.log("["+exports.id+"] No results");
                                                trackers[pathname].tracks[0] = {track:null, tweet:tweet};
                                                for (var i = 0; i < trackers[pathname].sockets.length; i++) send(trackers[pathname].sockets[i], {nowplaying:trackers[pathname].nowplaying, tracks:trackers[pathname].tracks});
                                            }
                                        } else {
                                            probe.log("["+exports.id+"] HTTP GET error: "+error);
                                        }
                                    });
                                }
                            } else {
                                probe.log("["+exports.id+"] HTTP GET error: "+error);
                            }
                        });
                    });
                } else {
                    trackers[pathname].sockets.push(socket);
                }
            } else {
                if (!trackers[pathname]) {
                    probe.log("["+exports.id+"] Serving #🎵"+pathname);
                    trackers[pathname] = {
                        sockets: [socket],
                        stream: null,
                        nowplaying: null,
                        tracks: null
                    };
                } else {
                    trackers[pathname].sockets.push(socket);
                }
            }
            socket.on('message', function (payload) {
                payload = JSON.parse(payload);
                var message = payload.message,
                    data = payload.data;
                switch (message) {
                    case 'heartbeat':
                        send(socket, {
                            message: 'heartbeat',
                            time: payload.time
                        });
                        break;
                }
            });
            send(socket, {nowplaying:trackers[pathname].nowplaying, tracks:trackers[pathname].tracks});
        });

        var message = exports.name+" server listening on port "+shell.twitspot.port;
        console.log(message);
        probe.log("["+exports.id+"] "+message);
    });
}
Script.prototype.init = init;

module.exports = exports = new Script();
