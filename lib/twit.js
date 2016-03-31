/**
 * twitspot.
 *
 * @author   Patrick Schroen / https://github.com/pschroen
 * @license  MIT Licensed
 */

/* jshint strict:true, eqeqeq:true, newcap:false, multistr:true, expr:true, loopfunc:true, shadow:true, node:true, indent:4 */
"use strict";

var cp = require('child_process'),
    Twit = require('twit'),
    request = require('request');

var debug = require('debug')('twitspot:twit');

var config = null,
    nowplaying = null,
    tweets = {},
    tracks = [],
    callbacks = [],
    callbackid = 0;

var spot = cp.fork(__dirname+'/spot.js');
spot.on('message', function (payload) {
    var data = payload.data,
        id = payload.id;
    callbacks[id](data);
    delete callbacks[id];
});
spot.on('exit', function (code, signal) {
    spot = cp.fork(__dirname+'/spot.js');
    init(config);
});

/**
 * Twitspot constructor.
 *
 * @constructor
 */
var Twitspot = function () {};

function init(options) {
    debug('init  : '+JSON.stringify(options));
    config = options;
    var T = new Twit({
        consumer_key: config.twitter_consumer_key,
        consumer_secret: config.twitter_consumer_secret,
        access_token: config.twitter_access_token,
        access_token_secret: config.twitter_access_token_secret
    });
    console.log("Logging into Spotify");
    callbacks[callbackid] = function () {
        debug('login callback');
        var stream = T.stream('statuses/filter', {track:['#🎵'+config.hashmusictag, '#\u1f3b5'+config.hashmusictag]});
        stream.on('connected', function (response) {
            debug('connected  : '+JSON.stringify(response));
            console.log("Tracking #🎵"+config.hashmusictag);
        });
        stream.on('tweet', function (tweet) {
            debug('tweet  : '+JSON.stringify(tweet));
            console.log("Request from "+tweet.user.name+" @"+tweet.user.screen_name+" - "+tweet.text);
            var query = tweet.text.replace(/\s?http.*\b/g, '').replace(new RegExp('\\s?#..'+config.hashmusictag+'\\b', 'i'), '').trim().toLowerCase();
            console.log('"'+query+'"');
            callbacks[callbackid] = function (data) {
                debug('search callback  : '+JSON.stringify(data));
                if (data.tracks.items.length) {
                    var track = data.tracks.items[0];
                    push({track:track, tweet:tweet, query:query});
                    if (!nowplaying) {
                        play(config);
                    } else {
                        console.log("Queued "+track.artists[0].name+" - "+track.name);
                        twitspot(config);
                    }
                } else if (config.google_search_engine_id && config.google_key) {
                    var url = 'https://www.googleapis.com/customsearch/v1?q='+encodeURIComponent(query)+'&cx='+config.google_search_engine_id+'&key='+config.google_key;
                    debug('google customsearch  : '+url);
                    console.log("Checking spelling");
                    request({url:url}, function (error, response, body) {
                        debug('google customsearch  : '+error+'  '+JSON.stringify(response)+'  '+body);
                        if (!error) {
                            var data = JSON.parse(body);
                            if (data.spelling) {
                                query = data.spelling.correctedQuery;
                                callbacks[callbackid] = function (data) {
                                    debug('search callback  : '+JSON.stringify(data));
                                    if (data.tracks.items.length) {
                                        var track = data.tracks.items[0];
                                        push({track:track, tweet:tweet, query:query});
                                        if (!nowplaying) {
                                            play(config);
                                        } else {
                                            console.log("Queued "+track.artists[0].name+" - "+track.name);
                                            twitspot(config);
                                        }
                                    } else {
                                        console.log("No results");
                                        push({track:null, tweet:tweet, query:query});
                                        if (!nowplaying) {
                                            play(config);
                                        } else {
                                            twitspot(config);
                                        }
                                    }
                                };
                                spot.send({message:'search', data:{query:query}, id:callbackid});
                                callbackid++;
                            } else {
                                console.log("No results");
                                push({track:null, tweet:tweet, query:query});
                                if (!nowplaying) {
                                    play(config);
                                } else {
                                    twitspot(config);
                                }
                            }
                        } else {
                            console.log("HTTP GET error: "+error);
                        }
                    });
                } else {
                    console.log("No results");
                    push({track:null, tweet:tweet, query:query});
                    if (!nowplaying) {
                        play(config);
                    } else {
                        twitspot(config);
                    }
                }
            };
            spot.send({message:'search', data:{query:query}, id:callbackid});
            callbackid++;
        });
    };
    spot.send({message:'login', data:{spotify_username:config.spotify_username, spotify_password:config.spotify_password}, id:callbackid});
    callbackid++;
}
Twitspot.prototype.init = init;

function push(track) {
    debug('push  : '+JSON.stringify(track));
    var name = track.tweet.user.name;
    if (!tweets[name]) tweets[name] = [];
    tweets[name].push(track);
    if (tweets[name].length > 1) {
        var previous = tweets[name][tweets[name].length-2],
            match = (new RegExp(previous.query, 'i')).exec(track.tweet.text);
        if (match) {
            debug('push previous  : '+previous.query);
            if (nowplaying) {
                match = (new RegExp(previous.query, 'i')).exec(nowplaying.tweet.text);
                if (!match) {
                    debug('push splice  : '+track.query);
                    for (var i = tracks.length-1; i >= 0; i--) {
                        if (tracks[i].tweet.user.name === name && tracks[i].query === previous.query) tracks.splice(i, 1, track);
                    }
                } else {
                    tracks.push(track);
                }
            } else {
                tracks.push(track);
            }
        } else {
            tracks.push(track);
        }
    } else {
        tracks.push(track);
    }
}

function play(config) {
    debug('play');
    if (tracks[0] && tracks[0].track) {
        console.log("Playing "+tracks[0].track.artists[0].name+" - "+tracks[0].track.name);
        callbacks[callbackid] = function () {
            debug('get callback');
            tracks.shift();
            if (tracks.length > 0) {
                play(config);
            } else {
                nowplaying = null;
                twitspot(config);
            }
        };
        spot.send({message:'get', data:{uri:tracks[0].track.uri}, id:callbackid});
        callbackid++;
        nowplaying = tracks[0];
        twitspot(config);
    } else {
        tracks.shift();
        if (tracks.length > 0) {
            play(config);
        } else {
            nowplaying = null;
            twitspot(config);
        }
    }
}

function twitspot(config) {
    debug('twitspot');
    var url = 'http://'+config.twitspot+'/'+config.hashmusictag,
        form = JSON.stringify({nowplaying:nowplaying, tracks:tracks});
    console.log("Posting to "+url);
    request.post({url:url, form:form}, function (error, response, body) {
        debug('twitspot post  : '+error+'  '+JSON.stringify(response)+'  '+body);
    });
}

module.exports = exports = new Twitspot();
