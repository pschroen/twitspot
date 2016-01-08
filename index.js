#!/usr/bin/env node
 
/**
 * twitspot.
 *
 * @author   Patrick Schroen / https://github.com/pschroen
 * @license  MIT Licensed
 */

/* jshint strict:true, eqeqeq:true, newcap:false, multistr:true, expr:true, loopfunc:true, shadow:true, node:true, indent:4 */
"use strict";

var fs = require('fs'),
    path = require('path'),
    prompt = require('prompt'),
    configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.twitspot'),
    config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : {};

if (process.argv[2]) config.hashmusictag = process.argv[2];

var lame = require('lame'),
    Speaker = require('speaker'),
    Spotify = require('spotify-web'),
    Twit = require('twit'),
    request = require('request'),
    xml2js = require('xml2js');

var nowplaying = null,
    tracks = [];

if (!config.hashmusictag ||
    !config.spotify_username ||
    !config.spotify_password ||
    !config.twitter_consumer_key ||
    !config.twitter_consumer_secret ||
    !config.twitter_access_token ||
    !config.twitter_access_token_secret) {
    prompt.start();
    prompt.get({
        properties: {
            spotify_username: {
                description: 'Spotify username',
                required: true
            },
            spotify_password: {
                description: 'Spotify password',
                hidden: true,
                required: true
            },
            twitter_consumer_key: {
                description: 'Twitter consumer key',
                required: true
            },
            twitter_consumer_secret: {
                description: 'Twitter consumer secret',
                required: true
            },
            twitter_access_token: {
                description: 'Twitter access token',
                required: true
            },
            twitter_access_token_secret: {
                description: 'Twitter access token secret',
                required: true
            },
            google_search_engine_id: {
                description: 'Google search engine ID (optional)'
            },
            google_key: {
                description: 'Google key (optional)'
            },
            twitspot: {
                description: 'Twitspot',
                default: 'twitspot.io'
            }
        }
    }, function (err, result) {
        if (err) throw err;
        if (!config.hashmusictag) {
            config = JSON.parse(JSON.stringify(result));
            prompt.get({
                properties: {
                    hashmusictag: {
                        description: 'Hashmusictag',
                        required: true
                    }
                }
            }, function (err, result) {
                if (err) throw err;
                config.hashmusictag = result.hashmusictag;
                fs.writeFileSync(configPath, JSON.stringify(config, null, '\t'));
                init(config);
            });
        } else {
            result.hashmusictag = config.hashmusictag;
            fs.writeFileSync(configPath, JSON.stringify(result, null, '\t'));
            init(result);
        }
    });
} else {
    init(config);
}

function init(config) {
    var T = new Twit({
        consumer_key: config.twitter_consumer_key,
        consumer_secret: config.twitter_consumer_secret,
        access_token: config.twitter_access_token,
        access_token_secret: config.twitter_access_token_secret
    });
    console.log("Logging into Spotify");
    Spotify.login(config.spotify_username, config.spotify_password, function (err, spotify) {
        if (err) throw err;
        console.log("Tracking #🎵"+config.hashmusictag);
        var stream = T.stream('statuses/filter', {track:['#🎵'+config.hashmusictag, '#\u1f3b5'+config.hashmusictag]});
        stream.on('tweet', function (tweet) {
            console.log("Request from "+tweet.user.name+" @"+tweet.user.screen_name+" - "+tweet.text);
            var match = (new RegExp(config.hashmusictag+'\\s(.*?)$', 'i')).exec(tweet.text.replace(/\shttp.*\b/g, ''));
            if (match) {
                var query = match[1];
                spotify.search(query, function (err, xml) {
                    if (err) throw err;
                    var parser = new xml2js.Parser();
                    parser.on('end', function (data) {
                        if (data.result.tracks.length && data.result.tracks[0]) {
                            var track = {name:data.result.tracks[0].track[0].title[0], artists:[{name:data.result.tracks[0].track[0].artist[0]}], album:{images:[{url:'https://i.scdn.co/image/'+data.result.tracks[0].track[0]['cover-large'][0]}]}, id:data.result.tracks[0].track[0].id[0]};
                            tracks.push({track:track, tweet:tweet});
                            if (tracks.length === 1) {
                                play(config, spotify);
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
                                        spotify.search(data.spelling.correctedQuery, function (err, xml) {
                                            if (err) throw err;
                                            var parser = new xml2js.Parser();
                                            parser.on('end', function (data) {
                                                if (data.result.tracks.length && data.result.tracks[0]) {
                                                    var track = {name:data.result.tracks[0].track[0].title[0], artists:[{name:data.result.tracks[0].track[0].artist[0]}], album:{images:[{url:'https://i.scdn.co/image/'+data.result.tracks[0].track[0]['cover-large'][0]}]}, id:data.result.tracks[0].track[0].id[0]};
                                                    tracks.push({track:track, tweet:tweet});
                                                    if (tracks.length === 1) {
                                                        play(config, spotify);
                                                    } else {
                                                        console.log("Queued "+track.artists[0].name+" - "+track.name);
                                                        twitspot(config);
                                                    }
                                                } else {
                                                    console.log("No results");
                                                    tracks.push({track:null, tweet:tweet});
                                                    if (tracks.length === 1) {
                                                        play(config, spotify);
                                                    } else {
                                                        twitspot(config);
                                                    }
                                                }
                                            });
                                            parser.parseString(xml);
                                        });
                                    } else {
                                        console.log("No results");
                                        tracks.push({track:null, tweet:tweet});
                                        if (tracks.length === 1) {
                                            play(config, spotify);
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
                                play(config, spotify);
                            } else {
                                twitspot(config);
                            }
                        }
                    });
                    parser.parseString(xml);
                });
            } else {
                console.log("No match");
                tracks.push({track:null, tweet:tweet});
                if (tracks.length === 1) {
                    play(config, spotify);
                } else {
                    twitspot(config);
                }
            }
        });
    });
}

function play(config, spotify) {
    if (tracks[0].track) {
        spotify.get(Spotify.id2uri('track', tracks[0].track.id), function (err, track) {
            if (err) throw err;
            console.log("Playing "+track.artist[0].name+" - "+track.name);
            track.play().pipe(new lame.Decoder()).pipe(new Speaker()).on('finish', function () {
                tracks.shift();
                if (tracks.length > 0) {
                    play(config, spotify);
                } else {
                    nowplaying = null;
                    twitspot(config);
                }
            });
            nowplaying = tracks[0];
            twitspot(config);
        });
    } else {
        tracks.shift();
        if (tracks.length > 0) {
            play(config, spotify);
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
