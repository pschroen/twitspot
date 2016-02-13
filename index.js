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

var twit = require('./lib/twit.js');

var debug = require('debug')('twitspot');

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
                fs.writeFileSync(configPath, JSON.stringify(config, null, '\t'));
                twit.init(config);
            });
        } else {
            result.hashmusictag = config.hashmusictag;
            fs.writeFileSync(configPath, JSON.stringify(result, null, '\t'));
            twit.init(result);
        }
    });
} else {
    twit.init(config);
}
