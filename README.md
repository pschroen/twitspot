# twitspot - Twitter jukebox

Play music with Twitter, Spotify and TIDAL, user generated playlists and party starter! :)


## Installation

1. Install [Node.js](http://nodejs.org/).
1. Visit [http://twitspot.io/](http://twitspot.io/) and create your Hashmusictag, #🎵. :)
1. From your Terminal enter the commands on your Hashmusictag page.
1. Enter your Spotify or TIDAL username and password, keys for Twitter can be obtained from your [Twitter Apps](https://apps.twitter.com/).
1. Return to your Hashmusictag page, and
1. Start a party! :)

```sh
sudo npm -g install twitspot
```


## TIDAL support

The unofficial Node.js [TidalAPI](https://github.com/pschroen/TidalAPI) requires `ffmpeg` for playback, for example on OS X you can install with [Homebrew](http://brew.sh/). Note you'll also need Xcode and the command line tools installed before installing Homebrew.

```sh
xcode-select --install
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
brew install ffmpeg
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


## Stable playback with the `libspotify` branch

For production use and installation on embedded computers it's recommended to instead use [node-spotify](https://github.com/pschroen/node-spotify) and make use of [libspotify](https://developer.spotify.com/technologies/libspotify/). This configuration however requires many more steps to get working, refer to the [libspotify branch](https://github.com/pschroen/twitspot/wiki/libspotify-branch) wiki for your environment.


## Resources

* [The Wiki](https://github.com/pschroen/twitspot/wiki)
* [Website](http://twitspot.io/)


## Copyright & License

Copyright (c) 2016 Patrick Schroen - Released under the [MIT License](LICENSE).
