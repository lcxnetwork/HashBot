// requires
const discord = require('discord.io');
const request = require('request-promise');
const auth = require('./auth.json');
const marketID = '521154088054816798';

// variable area
const Globals = {
    networkInfo: undefined,
    networkQuery: undefined,
    avgTx: undefined,
    netHash: undefined,
};
const bot = new discord.Client({
    token: auth.token,
    autorun: true
});

// function to format numbers with commas like currency
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// function to get random integer in a range
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// function to get random insult
function getInsult() {
    return insults[getRandomInt(0, insults.length)];
}  

// async block
async function update() {
    /*
    Globals.ogreLTCInfo = await getOgreLTCInfo();
    Globals.ogreBTCInfo = await getOgreBTCInfo();
    Globals.geckoInfo = await getGeckoInfo();
    */
    Globals.networkQuery = await getNetworkInfo();
    if (Globals.networkQuery !== undefined) {
        Globals.networkInfo = Globals.networkQuery;
    } else {
        console.log("** Got undefined data from node")
    }
    Globals.avgTx = Globals.networkInfo.tx_count / Globals.networkInfo.height;
    Globals.netHash = Globals.networkInfo.hashrate / 1000;
}

// refreshes variables every 5s
async function init() {
    await update();
    setInterval(update, 5000);
}

// Initialize Discord Bot
(async () => {
    await init();
})()

// on log in
bot.on('ready', (evt) => {
    console.log(`** Connected, logged in as ${bot.username}-${bot.id} and listening for commands.`);
});

// error logging
bot.on('error', console.error);

/*
// logs every single event
bot.on('any', (event) => {
	console.log(event)
}); 
*/

// reconnect if disconected
bot.on('disconnect', function() {
	console.log("** Bot disconnected, reconnecting...");
	bot.connect()  //Auto reconnect
});

// on new member joining
bot.on('guildMemberAdd', (member) => {
    console.log('** New member joined server, welcome message sent');
    bot.sendMessage({
        to: marketID,
        message: `Hey <@${member.id}>, welcome to LightChain Network!`
    }); 
});

// on message handling
bot.on('message', (user, userID, channelID, message, evt) => {
    // It will listen for messages that will start with `!`
    if (message[0] === '!') {
        const [cmd, args] = message.substring(1).split(' ');

        // difficulty command
        if (cmd === 'difficulty') {
            // check that none of the variables are undefined
            if (Globals.networkInfo.hashrate === undefined) {
                console.log('** Undefined difficulty requested');
                bot.sendMessage({
                    to: channelID,
                    message: 'Whoops! I\'m still gathering data for you, please try again later. 😄'
                });
            } else {
                console.log('** Current difficulty message sent');
                bot.sendMessage({
                    to: channelID,
                    message: `The current difficulty is **${numberWithCommas(Globals.networkInfo.hashrate * 30)}**`
                });
            }
        }

        // hashrate command
        if (cmd === 'hashrate') {
            // check that none of the variables are undefined
            if (Globals.netHash === undefined) {
                console.log('** Undefined hashrate requested');
                bot.sendMessage({
                    to: channelID,
                    message: 'Whoops! I\'m still gathering data for you, please try again later. 😄'
                });
            } else {
                console.log('** Current hashrate message sent');
                bot.sendMessage({
                    to: channelID,
                    message: `The current global hashrate is **${Globals.netHash.toFixed(2)} KH/s**`
                });
            }
        }   

        // height command
        if (cmd === 'height') {
            // check that none of the variables are undefined
            if (Globals.networkInfo.height === undefined) {
                console.log('** Undefined block height requested');
                bot.sendMessage({
                    to: channelID,
                    message: 'Whoops! I\'m still gathering data for you, please try again later. 😄'
                });
            } else {
                console.log('** Current block height message sent');
                bot.sendMessage({
                    to: channelID,
                    message: `The current  block height is **${numberWithCommas(Globals.networkInfo.height)}**`
                });
            }
        }   
        
        // help command
        if (cmd === 'help') {
            console.log('** Help menu message sent');
            bot.sendMessage({
                to: channelID,
                message: '\`\`\`!difficulty   :   Displays current difficulty.\n' +
                    '!hashrate     :   Displays current network hashrate.\n' +
                    '!height       :   Displays current block height.\n' +
                    '!help         :   Displays this menu.\n' +
                    '!network      :   Displays network information.\n\`\`\`'
            });
        }

         // network command
         if (cmd === 'network') {
            // check that none of the variables are undefined
            if (Globals.netHash === undefined || Globals.networkInfo === undefined) {
                console.log('** Undefined network info requested');
                bot.sendMessage({
                    to: channelID,
                    message: 'Whoops! I\'m still gathering data for you, please try again later. 😄'
                });
            } else {
                console.log('** Network info message sent');
                bot.sendMessage({
                    to: channelID,
                    embed: {
                        color: 3066993,
                        thumbnail: {
                            url: 'https://raw.githubusercontent.com/lcxnetwork/HashBot/master/img/lcx.png',
                        },
                        fields: [{
                                name: "Stats",
                                value: `Network Hashrate: **${Globals.netHash.toFixed(2)} KH/s**\n` +
                                    `Current Height: **${numberWithCommas(Globals.networkInfo.height)}**\n`
                            },
                            {
                                name: "Transactions",
                                value: `TX in Mempool: **${numberWithCommas(Globals.networkInfo.tx_pool_size)}**`
                            }
                        ],
                        footer: {
                            text: 'HashBot © 2019 LightChain Developers'
                        }
                    }
                });
            }
        }

    }
});

// get TRTL Network Info from LightChain node
async function getNetworkInfo() {
    const requestOptions = {
        method: 'GET',
        uri: 'http://xmlc.ml:10002/getinfo',
        headers: {},
        json: true,
        gzip: true
    };
    try {
        const result = await request(requestOptions);
        //console.log(result);
        return result;
    } catch (err) {
        console.log('Request failed, LightChain Node API call error');
        return undefined;
    }
}
