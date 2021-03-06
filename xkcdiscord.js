// requires discord.js and html-entities
// npm install (either of those)
const discord = require('discord.js'),
	entities = require('html-entities').AllHtmlEntities,
	fs = require('fs'),
	https = require('https');

var clientID = "";
var token = "";
// permissions for the bot
var permissions = 0x00000400 | // READ_MESSAGES
	0x00000800 | // SEND_MESSAGES
	0x00002000 | // MANAGE_MESSAGES
	0x00004000 ; // EMBED_LINKS

var debugChannelID = "";

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
	if (settings.debugChannelID)
		debugChannelID = settings.debugChannelID;
} catch (e) {
	console.error("Error reading config.json.");
	process.exit(1);
}

console.info(`Invite link:\nhttps://discordapp.com/oauth2/authorize?client_id=${clientID}&scope=bot&permissions=${permissions}`);

const client = new discord.Client();

// tests whether or not the channel has a specified permission for the given user
function hasPermission(channel, permission, user = client.user) {
	if (channel.type != "dm" && channel.permissionsFor(user).hasPermission(permission))
		return true;
	else if (channel.type == "dm" && permission != "MANAGE_MESSAGES")
		return true;
	else if (channel.type == "dm" && permission == "MANAGE_MESSAGES")
		return false;
	else return false;
}

// message = the message to send
// priority is one of the following:
//   'error': This will @me and show it as an error
//   'normal': This just prints a message
//   'status': This states the bot's status/what it's doing
//   'warning': The warning message
function debugChannelMessage(priority, message) {
	if (debugChannelID == "") return;
	switch(priority) {
		case 'error':
			client.channels.get(debugChannelID).sendMessage(`:exclamation: **Error:** ${message}\n(cc <@111943010396229632>)`);
			break;
		case 'normal':
			client.channels.get(debugChannelID).sendMessage(`${message}`);
			break;
		case 'status':
			client.channels.get(debugChannelID).sendMessage(`:information_source: **Bot status:** ${message}`);
			break;
		case 'warning':
			client.channels.get(debugChannelID).sendMessage(`:warning: **Warning:** ${message}\n(cc <@111943010396229632>)`);
	}
}

// these will be used when the ready event fires, so that if the bot has just connected after an error it will tell you what that error was
var hadError = false;
var errorMessage = "";

client.on('ready', () => {
	console.info("Client ready.");
	debugChannelMessage('status', "Ready");
	if (hadError && errorMessage != "") {
		debugChannelMessage('error', `Just recovered from error:\n\`\`\`\n${errorMessage}\n\`\`\``);
		hadError = false;
		errorMessage = "";
	}
});

client.on('message', message => {
	if (!hasPermission(message.channel, "SEND_MESSAGES")) {
		return;
	}
	
	if (/^!xkcd\s*$/i.test(message.content)) {
		// just get the latest xkcd
		getcomic(null, message.channel);
	}
	else if (/^!xkcd\s+\d+/i.test(message.content)) {
		// this is where the bot finds and parses that xkcd
		// parse the comic number
		var id = parseInt(/\d+/.exec(message.content));
		getcomic(id, message.channel);
	} else if (/^!xkcdinvite/i.test(message.content)) {
		message.author.sendMessage(`Invite link:\nhttps://discordapp.com/oauth2/authorize?client_id=${clientID}&scope=bot&permissions=${permissions}`);
		if (hasPermission(message.channel, "MANAGE_MESSAGES"))
			message.delete();
	} else if (/^!xkcdhelp/i.test(message.content)) {
		message.author.sendMessage("Here is what I can do for you:\n```\n!xkcd\n  shows the most recent xkcd\n!xkcd <number>\n  shows xkcd <number>\n!xkcdinvite\n  gives you the invite link to add this bot to your discord server```");
		if (hasPermission(message.channel, "MANAGE_MESSAGES")) {
			message.delete();
		}
	}
});

// this is the function that downloads xkcds and then puts them in chat
function getcomic(comicNumber, channel) {
	// if comicNumber is null, then get today's
	var options = {
		hostname: "xkcd.com",
		path: "/info.0.json"
	};
	if (comicNumber != null)
		options.path = `/${comicNumber}/info.0.json`;
	console.info(`Requesting ${options.hostname}${options.path}`);
	var request = https.request(options, (res) => {
		var data = '';
		res.on('data', (chunk) => {
			data+=chunk;
		});
		res.on('end', () => {
			// handle the data returned here
			// parse out the title, alt text, and image url from this linel
			if (res.statusCode != 404) {
				sendComicEmbed(channel, JSON.parse(data));
			} else {
				console.error("404, not found: " + options.hostname + options.path);
				sendComicEmbed(channel, null);
			}
		});
	});
	request.on('error', (e) => {
		console.error("Error retrieving data:\n" + e);
		sendComicEmbed(channel, null);
	});
	request.end();
}

// channel to send embed in
function sendComicEmbed(channel, comicInfo) {
	var embed = new discord.RichEmbed();
	if (comicInfo != null) {
		// this means we can do things with the comic
		embed.setColor("#96A8C8"); // background color of the xkcd page :P
		embed.setTitle("xkcd " + comicInfo.num + ": " + htmldecode(comicInfo.title));
		embed.setImage(comicInfo.img);
		embed.setDescription(htmldecode(comicInfo.alt));
	} else {
		// error getting the comic, we can do a fancy little red embed thingy
		embed.setTitle("Error retrieving comic.");
		embed.setColor("#ff0000");
	}
	channel.sendEmbed(embed);
}

function htmldecode(s) {
	var ents = new entities();
	return ents.decode(s);
}

client.on('error', (error) => {
	console.error("Encountered error:\n" + error);
	hadError = true;
	errorMessage = error;
});

client.on('warn', (warning) => {
	debugChannelMessage('warning', warning);
});

client.on('disconnect', () => {
	console.info("Disconnected from Discord, attempting to log in...");
});

client.login(token);

// gracefully handle the control c
process.on('SIGINT', () => {
	console.info("Destroying bot and exiting...");
	client.destroy();
	process.exit(0);
});
