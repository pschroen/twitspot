# twitspot - Twitter powered digital jukebox

Play music using Twitter and Spotify, user generated playlists and radio.


## Installation

1. Install [Node.js](http://nodejs.org/).
1. Visit [http://twitspot.io/](http://twitspot.io/) and create your Hashmusictag, #🎵. :)
1. From your Terminal enter the commands on your Hashmusictag page.
1. Enter your Spotify username and password, keys for Twitter can be obtained from your [Twitter Apps](https://apps.twitter.com/).
1. Return to your Hashmusictag page, and
1. Start a party! :)

```sh
sudo npm -g install twitspot
```


## Check spelling with Google's Custom Search Engine API

This approach for spelling correction doesn't always return results, however because Google's results are based on popular terms it works well for correcting the spelling of popular music.

Create your [Custom Search Engine](https://www.google.com/cse/) configured to [Search the entire web](https://support.google.com/customsearch/answer/2631040?hl=en) and get your [Search engine ID](https://support.google.com/customsearch/answer/2649143?hl=en). Keys for the API can be obtained from your [Google Developers Console](https://console.developers.google.com/).


## Usage

Currently there is only one parameter for your Hashmusictag. All other parameters are prompted from command-line and saved to the `.twitspot` configuration file in your home directory.

To listen for #🎵foobar.

```sh
twitspot foobar
```


## Running your own twitspot server

By default tracks are posted to your Hashmusictag page at twitspot.io, alternatively you can host your own server or run locally with the [Headless](https://headless.io/) framework.

```sh
cd headless-stable
curl -L -s https://github.com/pschroen/twitspot/archive/master.tar.gz | tar xvzf - --strip=2 -C users/<user>
npm install twit
```

Return to your Headless login page, before running the server you'll need to specify your `twit` configuration, add the following to your *Ghost* or *Shell* config.

```json
...
    "twitspot": {
        "port": 3000,
        "hashmusictag": ""
    },
    "twitter": {
        "consumer_key": "<consumer key>",
        "consumer_secret": "<consumer secret>",
        "access_token": "<access token>",
        "access_token_secret": "<access token secret>"
    },
    "google": {
        "customsearch": {
            "search_engine_id": "<search engine id>",
            "key": "<key>"
        }
    }
...
```

Run the script named `twitspot` from your *Scripts* *List*. Visit `http://<ip address>:3000/` where you should see the twitspot website running, tweet with the Hashmusictag specified and get the party started! :)


## Roadmap

##### v1.0.x:

* Test scripts
* Improved browser and mobile support
* Improved cross-platform support

##### v1.1.x:

* Playback control
* DJ mode

##### v1.2.x:

* Karaoke mode


## Changelog

* [Releases](https://github.com/pschroen/twitspot/releases)


## Copyright & License

Copyright (c) 2015 Patrick Schroen - Released under the [MIT License](LICENSE).
