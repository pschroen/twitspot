/**
 * Headless Slack Amp Bot.
 *
 * Play music with Slack, Spotify and TIDAL, requests are posted to a Twitspot URL.
 *
 * @author   Patrick Schroen / https://github.com/pschroen
 * @license  MIT Licensed
 */

/* jshint strict:true, eqeqeq:true, newcap:false, multistr:true, expr:true, loopfunc:true, shadow:true, node:true, indent:4 */
/* globals shell, user */
"use strict";

var utils = require(shell.path+'/modules/utils'),
    Script = utils.Script(module.id, "Slack Amp Bot");

var RtmClient = require('@slack/client').RtmClient,
    CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS,
    RTM_EVENTS = require('@slack/client').RTM_EVENTS,
    MemoryDataStore = require('@slack/client').MemoryDataStore,
    cp = require('child_process'),
    util = require('util'),
    Twit = require('twit'),
    request = require('request');

var debug = require('debug')('headless:slackamp');

var config = null,
    nowplaying = null,
    tweets = {},
    tracks = [],
    callbacks = [],
    callbackid = 0,
    rtm = null,
    api = null;

/**
 * Initialize.
 *
 * @param    {Probe} probe Instance
 * @param    {undefined|Object} [load] Payload
 * @param    {undefined|initCallback} [callback]
 */
function init(probe, load, callback) {
    log(probe, "Loading "+exports.name);
    config = shell.amp;
    config.username = config[config.api+'_username'];
    config.password = config[config.api+'_password'];
    config.quality = config[config.api+'_quality'];
    debug('init  : '+JSON.stringify(config));
    rtm = new RtmClient(config.token, {
        logLevel: 'error',
        dataStore: new MemoryDataStore()
    });
    rtm.start();
    rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
        log(probe, "Connected to "+rtm.dataStore.getTeamById(rtm.activeTeamId).name+" as "+rtm.dataStore.getUserById(rtm.activeUserId).name);
        var apiname = config.api.charAt(0).toUpperCase()+config.api.slice(1);
        log(probe, "Loading "+apiname+" API");
        api = cp.fork(shell.join(shell.path, 'users', user, 'scripts', config.api+'.js'));
        api.on('message', function (payload) {
            var data = payload.data,
                id = payload.id;
            callbacks[id](data);
            delete callbacks[id];
        });
        api.on('exit', function (code, signal) {
            init(probe);
        });
        callbacks[callbackid] = function () {
            debug('login callback');
            log(probe, "Logged into "+apiname);
            if (config.twitter_consumer_key &&
                config.twitter_consumer_secret &&
                config.twitter_access_token &&
                config.twitter_access_token_secret) {
                var T = new Twit({
                    consumer_key: config.twitter_consumer_key,
                    consumer_secret: config.twitter_consumer_secret,
                    access_token: config.twitter_access_token,
                    access_token_secret: config.twitter_access_token_secret
                });
                var stream = T.stream('statuses/filter', {track:['#🎵'+config.hashmusictag, '#\u1f3b5'+config.hashmusictag]});
                stream.on('connected', function (response) {
                    debug('connected  : '+JSON.stringify(response));
                    log(probe, "Tracking #🎵"+config.hashmusictag);
                });
                stream.on('tweet', function (tweet) {
                    debug('tweet  : '+JSON.stringify(tweet));
                    log(probe, "Request from "+tweet.user.name+" @"+tweet.user.screen_name+" - "+tweet.text);
                    search(probe, tweet, tweet.text.replace(/\s?http.*\b/g, '').replace(new RegExp('\\s?#..'+config.hashmusictag+'\\b', 'i'), '').trim().toLowerCase());
                });
            }
        };
        api.send({message:'login', data:{username:config.username, password:config.password, quality:config.quality}, id:callbackid});
        callbackid++;
    });
    rtm.on(RTM_EVENTS.MESSAGE, function (message) {
        // Normalize message data as tweet
        var tweet = {
                user: {
                    name: "#"+rtm.dataStore.getChannelGroupOrDMById(message.channel).name,
                    screen_name: rtm.dataStore.getUserById(message.user).name,
                    profile_image_url: 'https://headless.io/apple-touch-icon-152x152.png'
                },
                text: message.text
            };
        slack(probe, tweet.user.screen_name+" Searching...", message.channel);
        log(probe, "Request from "+tweet.user.screen_name+" in "+tweet.user.name+" - "+tweet.text);
        search(probe, tweet, message.text.trim().toLowerCase(), message.channel);
    });
}
Script.prototype.init = init;

/**
 * Search.
 *
 * @param    {Probe} probe Instance
 * @param    {Object} tweet
 * @param    {string} query
 * @param    {undefined|string} [channel] Slack channel id
 */
function search(probe, tweet, query, channel) {
    debug('search  : '+JSON.stringify(tweet)+'  '+query+'  '+channel);
    probe.log('['+exports.id+'] "'+query+'"');
    callbacks[callbackid] = function (track) {
        debug('search callback  : '+JSON.stringify(track));
        if (track) {
            push({track:track, tweet:tweet, query:query});
            if (!nowplaying) {
                play(probe);
                log(probe, "Playing "+track.artists[0].name+" - "+track.name, channel);
            } else {
                log(probe, "Queued "+track.artists[0].name+" - "+track.name, channel);
                twitspot(probe);
            }
        } else if (config.google_search_engine_id && config.google_key) {
            var url = 'https://www.googleapis.com/customsearch/v1?q='+encodeURIComponent(query)+'&cx='+config.google_search_engine_id+'&key='+config.google_key;
            debug('google customsearch  : '+url);
            log(probe, tweet.user.screen_name+" Checking spelling...", channel);
            request({url:url}, function (error, response, body) {
                debug('google customsearch  : '+error+'  '+JSON.stringify(response)+'  '+body);
                if (!error) {
                    var data = JSON.parse(body);
                    if (data.spelling) {
                        query = data.spelling.correctedQuery;
                        callbacks[callbackid] = function (track) {
                            debug('search callback  : '+JSON.stringify(track));
                            if (track) {
                                push({track:track, tweet:tweet, query:query});
                                if (!nowplaying) {
                                    play(probe);
                                    log(probe, "Playing "+track.artists[0].name+" - "+track.name, channel);
                                } else {
                                    log(probe, "Queued "+track.artists[0].name+" - "+track.name, channel);
                                    twitspot(probe);
                                }
                            } else {
                                log(probe, "No results :(", channel);
                                push({track:null, tweet:tweet, query:query});
                                if (!nowplaying) {
                                    play(probe);
                                } else {
                                    twitspot(probe);
                                }
                            }
                        };
                        api.send({message:'search', data:{query:query}, id:callbackid});
                        callbackid++;
                    } else {
                        log(probe, "No results :(", channel);
                        push({track:null, tweet:tweet, query:query});
                        if (!nowplaying) {
                            play(probe);
                        } else {
                            twitspot(probe);
                        }
                    }
                } else {
                    log(probe, "HTTP GET error: "+error, channel);
                }
            });
        } else {
            log(probe, "No results :(", channel);
            push({track:null, tweet:tweet, query:query});
            if (!nowplaying) {
                play(probe);
            } else {
                twitspot(probe);
            }
        }
    };
    api.send({message:'search', data:{query:query}, id:callbackid});
    callbackid++;
}

/**
 * Push.
 *
 * @param    {Object} track
 */
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

/**
 * Play.
 *
 * @param    {Probe} probe Instance
 */
function play(probe) {
    debug('play');
    if (tracks[0] && tracks[0].track) {
        callbacks[callbackid] = function () {
            debug('get callback');
            tracks.shift();
            if (tracks.length > 0) {
                play(probe);
            } else {
                nowplaying = null;
                twitspot(probe);
            }
        };
        api.send({message:'get', data:{id:tracks[0].track.id}, id:callbackid});
        callbackid++;
        nowplaying = tracks[0];
        twitspot(probe);
    } else {
        tracks.shift();
        if (tracks.length > 0) {
            play(probe);
        } else {
            nowplaying = null;
            twitspot(probe);
        }
    }
}

/**
 * Twitspot.
 *
 * @param    {Probe} probe Instance
 */
function twitspot(probe) {
    debug('twitspot');
    var url = 'http://'+config.twitspot+'/'+config.hashmusictag,
        form = JSON.stringify({nowplaying:nowplaying, tracks:tracks});
    log(probe, "Posting to "+url);
    request.post({url:url, form:form}, function (error, response, body) {
        debug('twitspot post  : '+error+'  '+JSON.stringify(response)+'  '+body);
    });
}

/**
 * Slack send message.
 *
 * @param    {Probe} probe Instance
 * @param    {string} message Text
 * @param    {string} channel Channel id
 */
function slack(probe, message, channel) {
    debug('slack  : '+message+'  '+channel);
    log(probe, "Sending to #"+rtm.dataStore.getChannelGroupOrDMById(channel).name);
    rtm.sendMessage(message, channel);
}

/**
 * Log helper.
 *
 * @param    {Probe} probe Instance
 * @param    {string} message
 * @param    {undefined|string} [channel] Slack channel id
 */
function log(probe, message, channel) {
    debug('log  : '+message+'  '+channel);
    utils.log(message);
    probe.log("["+exports.id+"] "+message);
    if (channel) slack(probe, message, channel);
}

module.exports = exports = new Script();
