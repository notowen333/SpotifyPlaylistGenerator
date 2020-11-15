const SpotifyWebApi = require('spotify-web-api-node');
const { prompt } = require('enquirer');
require('dotenv').config();

const alphanumeric = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890"
const possibleTitles = ["quirky", "cool", "ion", "atom", "marxism", "willtoplato", "yellow", "unit", "plate" ]

function randomInt(min, max) {
    return Math.floor(
        Math.random() * (max - min) + min
    );
}

function generateState(len) {
    var state = [];
    for (let i = 0; i < len; ++i) {
        let char = alphanumeric[randomInt(0, alphanumeric.length)];
        state.push(char);
    }
    return state.join("");
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
  }



async function main() {
    const spotifyApi = new SpotifyWebApi({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: 'https://spotify.com',
    });

    const scopes = ['user-read-email', 'user-library-read','user-read-currently-playing', 'user-top-read','playlist-modify-private','playlist-modify-public','playlist-read-private','playlist-read-collaborative', 'user-library-modify'];
    const state = generateState(100);

    let authnUrl = spotifyApi.createAuthorizeURL(scopes, state);

    console.log(`authorization url: ${authnUrl}`);
    let code = await prompt([{
        type: 'input',
        name: 'url',
        message: 'Enter your url from your browser'
    }]).then(data => {
        console.assert(data.url);
        const url = new URL(data.url);
        let code = url.searchParams.get('code');
        return code;
    });

    await spotifyApi.authorizationCodeGrant(code).then(
        data => {
            spotifyApi.setAccessToken(data.body['access_token']);
            spotifyApi.setRefreshToken(data.body['refresh_token']);
        },
        err => { console.error(`authorizationCodeGrant ${err}`); throw err; }
    );

    
    const result = await spotifyApi.getMe()
        .catch(err => { console.error(err); throw err; })

    


    // create playlist for authenticated user


    const title = possibleTitles[randomInt(0, possibleTitles.length - 1)] + " " + possibleTitles[randomInt(0, possibleTitles.length - 1)];

    await spotifyApi.getMe().then(
        data => {
            spotifyApi.createPlaylist(data.body.id,title).then(
                data => {
                    console.log('Playlist ID: ' + data.body.id);
                },
                err =>
                    { console.error(err); }
            );
        },
        err => { console.error(err); }
    )
    
    


    // saves the artist ids of your top 20 tracks to variable artistIds
    const artistIds = await spotifyApi.getMyTopTracks().then(
        data => {
            let topTracks = data.body.items;
            let topArtists = topTracks.map(function(t){
                return t.artists;
            });

            topIds = [];
            for ( i=0; i < topArtists.length; ++i)
            {
                topIds.push(topArtists[i][0].id);
            }
            return topIds;   
        },
        err => { console.error(err); }
    ); 


    // saves the artistsIds of related artists of your top tracks to list l, then saves uniques to uniqueSongslist
    l = [];
    for (i = 0; i < artistIds.length; ++i)
    {
        await spotifyApi.getArtistRelatedArtists(artistIds[i]).then(
            data => 
            {
                let relatedArtists = data.body.artists;
                for (k = 0; k < relatedArtists.length; ++k)
                {
                    l.push(relatedArtists[k].id);
                }
            },
            err => { console.error(err); }
        );
    }
    let uniqueSongs = new Set(l);
    let uniqueSongslist = Array.from(uniqueSongs);
    shuffle(uniqueSongslist);



    // takes top track from each suggested artist
    suggestedSongIds = [];
    for (i = 0; i < 10; ++i)
    {
        await spotifyApi.getArtistTopTracks(uniqueSongslist[i],'US').then(
            data =>
            {
                let topTracks = data.body.tracks;
                suggestedSongIds.push('spotify:track:' + topTracks[0].id);
            },
            err => { console.error(err); }
        );
    }

    
    // add tracks
    await prompt([{
        type: 'input',
        name: 'id',
        message: 'Enter your playlistID from above'
    }]).then(
        data =>
        {
            const id = new String(data.id)
            spotifyApi.addTracksToPlaylist(id, suggestedSongIds).then(
                data =>
                {
                    console.log('Nice!')
                },
                err => { console.error(err); }
            );
        }
    );
    




}

if (require.main === module) {
    main().catch(
        err => { console.error(err); }
    )
}




  /*

    a number of example calls to the api

    spotifyApi.getArtistAlbums('43ZHCT0cAZBISjO8DG9PnE', {limit: 5, offset: 0}).then(
    data => {
        console.log('Album Information', data.body);
    },
    err => { console.error(err); }
    );
    

    spotifyApi.searchTracks('Beautiful').then(
        data => {
            console.log('Search tracks by "Beautiful"',data.body);
        },
        err => { console.error(err); }
    );

    spotifyApi.getMyCurrentPlayingTrack().then(
        data => {
            console.log('Now playing: ' + data.body.item.name);
        },
        err => { console.error(err); }
    );
    

    */
    