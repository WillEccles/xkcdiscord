const discord = require('discord.js'),
	fs = require('fs');

var clientID = "";
var token = "";

// load stuff
try {
	fs.accessSync("config.json", fs.F_OK);
	var settings = JSON.parse(fs.readFileSync("config.json"));
	if (settings.token) {
		token = settings.token;
	} else {
		console.error("Please set your token in config.json.");
		process.exit(1);
	}
	if (settings.clientID) {
		clientID = settings.clientID;
	} else {
		console.error("Please set your clientID in config.json.");
		process.exit(1);
	}
} catch (e) {
	console.error("Error reading config.json.");
	process.exit(1);
}

client.on('ready', () => {
	console.info("Client ready.");
});

client.on('message', message => {
	if (/^!xkcd\s*$/i.test(message.content)) {
		// just get the latest xkcd
		getcomic(null, message.channel);
	}
	else if (/^!xkcd\s+\d+/i.test(message.content)) {
		// this is where the bot finds and parses that xkcd
		// parse the comic number
		var id = parseInt(/\d+/.exec(message.content));
		getcomic(id, message.channel);
	}
});

// this is the function that downloads xkcds and then puts them in chat
function getcomic(comicNumber, channel) {
	// if comicNumber is null, then get today's
	
}
