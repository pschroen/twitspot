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

var config = null,
    nowplaying = null,
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
    init(config);
});

/**
 * Twitspot constructor.
 *
 * @constructor
 */
var Twitspot = function () {};

function init(options) {
    config = options;
    var T = new Twit({
        consumer_key: config.twitter_consumer_key,
        consumer_secret: config.twitter_consumer_secret,
        access_token: config.twitter_access_token,
        access_token_secret: config.twitter_access_token_secret
    });
    console.log("Logging into Spotify");
    callbacks[callbackid] = function () {
        console.log("Tracking #🎵"+config.hashmusictag);
        var stream = T.stream('statuses/filter', {track:['#🎵'+config.hashmusictag, '#\u1f3b5'+config.hashmusictag]});
        stream.on('tweet', function (tweet) {
            console.log("Request from "+tweet.user.name+" @"+tweet.user.screen_name+" - "+tweet.text);
            var query = tweet.text.replace(/\s?http.*\b/g, '').replace(new RegExp('\\s?#..'+config.hashmusictag+'\\b', 'i'), '').trim().toLowerCase();
            console.log('"'+query+'"');
            callbacks[callbackid] = function (data) {
                if (data.result.tracks.length && data.result.tracks[0]) {
                    var track = {name:data.result.tracks[0].track[0].title[0], artists:[{name:data.result.tracks[0].track[0].artist[0]}], album:{images:[{url:'https://i.scdn.co/image/'+data.result.tracks[0].track[0]['cover-large'][0]}]}, id:data.result.tracks[0].track[0].id[0]};
                    tracks.push({track:track, tweet:tweet});
                    if (tracks.length === 1) {
                        play(config);
                    } else {
                        console.log("Queued "+track.artists[0].name+" - "+track.name);
                        twitspot(config);
                    }
                } else if (config.google_search_engine_id && config.google_key) {
                    var url = 'https://www.googleapis.com/customsearch/v1?q='+encodeURIComponent(query)+'&cx='+config.google_search_engine_id+'&key='+config.google_key;
                    console.log("Checking spelling");
                    request({url:url}, function (error, response, body) {
                        if (!error) {
                            var data = JSON.parse(body);
                            if (data.spelling) {
                                callbacks[callbackid] = function (data) {
                                    if (data.result.tracks.length && data.result.tracks[0]) {
                                        var track = {name:data.result.tracks[0].track[0].title[0], artists:[{name:data.result.tracks[0].track[0].artist[0]}], album:{images:[{url:'https://i.scdn.co/image/'+data.result.tracks[0].track[0]['cover-large'][0]}]}, id:data.result.tracks[0].track[0].id[0]};
                                        tracks.push({track:track, tweet:tweet});
                                        if (tracks.length === 1) {
                                            play(config);
                                        } else {
                                            console.log("Queued "+track.artists[0].name+" - "+track.name);
                                            twitspot(config);
                                        }
                                    } else {
                                        console.log("No results");
                                        tracks.push({track:null, tweet:tweet});
                                        if (tracks.length === 1) {
                                            play(config);
                                        } else {
                                            twitspot(config);
                                        }
                                    }
                                };
                                spot.send({message:'search', data:{query:data.spelling.correctedQuery}, id:callbackid});
                                callbackid++;
                            } else {
                                console.log("No results");
                                tracks.push({track:null, tweet:tweet});
                                if (tracks.length === 1) {
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
                    tracks.push({track:null, tweet:tweet});
                    if (tracks.length === 1) {
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

function play(config) {
    if (tracks[0].track) {
        console.log("Playing "+tracks[0].track.artists[0].name+" - "+tracks[0].track.name);
        callbacks[callbackid] = function () {
            tracks.shift();
            if (tracks.length > 0) {
                play(config);
            } else {
                nowplaying = null;
                twitspot(config);
            }
        };
        spot.send({message:'get', data:{id:tracks[0].track.id}, id:callbackid});
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
    var url = 'http://'+config.twitspot+'/'+config.hashmusictag,
        form = JSON.stringify({nowplaying:nowplaying, tracks:tracks});
    console.log("Posting to "+url);
    request.post({url:url, form:form}, function (error, response, body) {});
}

module.exports = exports = new Twitspot();
