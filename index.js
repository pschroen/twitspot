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
    config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : {},
    version = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))).version;

if (process.argv[2]) config.hashmusictag = process.argv[2];

var twit = require('./lib/twit.js');

var debug = require('debug')('twitspot');

console.log('twitspot/'+version);

if (!config.hashmusictag ||
    !config.api ||
    (config.api === 'spotify' && (
        !config.spotify_username ||
        !config.spotify_password)) ||
    (config.api === 'tidal' && (
        !config.tidal_username ||
        !config.tidal_password ||
        !config.tidal_quality)) ||
    !config.twitter_consumer_key ||
    !config.twitter_consumer_secret ||
    !config.twitter_access_token ||
    !config.twitter_access_token_secret) {
    prompt.start();
    prompt.get({
        properties: {
            api: {
                description: 'Spotify or Tidal',
                required: true,
                default: 'spotify'
            },
            spotify_username: {
                description: 'Spotify username',
                ask: function () {
                    return prompt.history('api').value.toLowerCase() === 'spotify';
                }
            },
            spotify_password: {
                description: 'Spotify password',
                hidden: true,
                ask: function () {
                    return prompt.history('api').value.toLowerCase() === 'spotify';
                }
            },
            tidal_username: {
                description: 'Tidal username',
                ask: function () {
                    return prompt.history('api').value.toLowerCase() === 'tidal';
                }
            },
            tidal_password: {
                description: 'Tidal password',
                hidden: true,
                ask: function () {
                    return prompt.history('api').value.toLowerCase() === 'tidal';
                }
            },
            tidal_quality: {
                description: 'Tidal quality',
                default: 'lossless',
                ask: function () {
                    return prompt.history('api').value.toLowerCase() === 'tidal';
                }
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
                required: true,
                default: 'twitspot.io'
            }
        }
    }, function (err, result) {
        debug('prompt  : '+err+'  '+JSON.stringify(result));
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
                debug('prompt  : '+err+'  '+JSON.stringify(result));
                if (err) throw err;
                config.hashmusictag = result.hashmusictag;
                config.api = config.api.toLowerCase();
                config.spotify_quality = null;
                config.tidal_quality = config.tidal_quality.toLowerCase();
                fs.writeFileSync(configPath, JSON.stringify(config, null, '\t'));
                twit.init(config);
            });
        } else {
            result.hashmusictag = config.hashmusictag;
            result.api = result.api.toLowerCase();
            result.spotify_quality = null;
            result.tidal_quality = result.tidal_quality.toLowerCase();
            fs.writeFileSync(configPath, JSON.stringify(result, null, '\t'));
            twit.init(result);
        }
    });
} else {
    twit.init(config);
}
