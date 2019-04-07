// requires
const discord = require('discord.io');
const request = require('request-promise');
const auth = require('./auth.json');
const marketID = '521154088054816798';

// variable area
const Globals = {
    networkInfo: undefined,
    priceInfo: undefined,
    transactionInfo: undefined,
    bitcoinInfo: undefined
};

const bot = new discord.Client({
    token: auth.token,
    autorun: true
});

// function to format numbers with commas like currency
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// async block
async function update() {
    let networkQuery = await getData('http://blockapi.aeonclassic.org/block/header/top', 'networkQuery');
    if (networkQuery !== undefined) {
        Globals.networkInfo = networkQuery;
    } else {
        console.log('** Got undefined block header data from cache api')
    }
    let priceQuery = await getData('http://cratex.io/api/v1/get_markets.php?market=LCX/BTC', 'priceInfo');
    if (priceQuery !== undefined) {
        Globals.priceInfo = JSON.parse(priceQuery.trim());
    } else {
        console.log('** Got undefined price data from exchange')
    }
    let transactionQuery = await getData('https://blockapi.aeonclassic.org/transaction/pool', 'priceInfo');
    if (transactionQuery !== undefined) {
        Globals.transactionInfo = transactionQuery;
    } else {
        console.log('** Got undefined transaction pool data from cache api')
    }
    let bitcoinQuery = (await getData('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&order=market_cap_desc&per_page=100&page=1&sparkline=false', 'geckoBTCInfo'))[0];
    if (bitcoinQuery !== undefined) {
        Globals.bitcoinInfo = bitcoinQuery;
    } else {
        console.log('** Got undefined bitcoin price data from coingecko');
    }
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
    console.log('** Bot disconnected, reconnecting...');
    bot.connect()
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
            if (Globals.networkInfo.difficulty === undefined) {
                console.log('** Undefined difficulty requested');
                bot.sendMessage({
                    to: channelID,
                    message: 'Whoops! I\'m still gathering data for you, please try again later. 😄'
                });
            } else {
                console.log('** Current difficulty message sent');
                bot.sendMessage({
                    to: channelID,
                    message: `The current difficulty is **${numberWithCommas(Globals.networkInfo.difficulty)}**`
                });
            }
        }

        // hashrate command
        if (cmd === 'hashrate') {
            // check that none of the variables are undefined
            if (Globals.networkInfo.difficulty === undefined) {
                console.log('** Undefined hashrate requested');
                bot.sendMessage({
                    to: channelID,
                    message: 'Whoops! I\'m still gathering data for you, please try again later. 😄'
                });
            } else {
                console.log('** Current hashrate message sent');
                bot.sendMessage({
                    to: channelID,
                    message: `The current global hashrate is **${((Globals.networkInfo.difficulty / 120) / 1000).toFixed(2)} KH/s**`
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
                    '!network      :   Displays network information.\n' +
                    '!price        :   Displays current market information.\`\`\`'
            });
        }

        // network command
        if (cmd === 'network') {
            // check that none of the variables are undefined
            if (Globals.networkInfo === undefined || Globals.transactionInfo === undefined) {
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
                                name: 'Network Stats',
                                value: `Height: **${numberWithCommas(Globals.networkInfo.height)}**\n` +
                                    `Network Hashrate: **${numberWithCommas(((Globals.networkInfo.difficulty / 120) / 1000).toFixed(2))} KH/s**\n` +
                                    `Block Reward: **${(Globals.networkInfo.reward / 100000000).toFixed(2)} LCX**\n`
                            },
                            {
                                name: 'Coin Movement',
                                value: `TX in Mempool: **${Globals.transactionInfo.length}**\n` +
                                    `TX/Block: **${(Globals.networkInfo.alreadyGeneratedTransactions / Globals.networkInfo.height).toFixed(2)}**\n` +
                                    `Total Transactions: **${numberWithCommas(Globals.networkInfo.alreadyGeneratedTransactions)}**`

                            }
                        ],
                        footer: {
                            text: 'HashBot © 2019 LightChain Developers'
                        }
                    }
                });
            }
        }

        // price command
        if (cmd === 'price') {
            // check that none of the variables are undefined
            if (Globals.priceInfo === undefined || Globals.bitcoinInfo === undefined) {
                console.log('** Undefined price info requested');
                bot.sendMessage({
                    to: channelID,
                    message: 'Whoops! I\'m still gathering data for you, please try again later. 😄'
                });
            } else {
                console.log('** Price info message sent');
                bot.addReaction({
                    channelID: channelID,
                    messageID: evt.d.id,
                    reaction: '☑'
                })
                let originalPrice = Number(Globals.priceInfo.price24hago * 100000000).toFixed(0)
                let newPrice = Number(Globals.priceInfo.latest_price * 100000000).toFixed(0)
                bot.sendMessage({
                    to: channelID,
                    embed: {
                        color: 3066993,
                        thumbnail: {
                            url: 'https://raw.githubusercontent.com/lcxnetwork/HashBot/master/img/lcx.png',
                        },
                        fields: [{
                                name: 'Price',
                                value: `LCX/BTC: **${Number(Globals.priceInfo.latest_price  * 100000000).toFixed(0)} sat**\n` +
                                    `LCX/USD: **$${(Number(Globals.priceInfo.latest_price) * (Globals.bitcoinInfo.current_price)).toFixed(5)}**\n`
                            },
                            {
                                name: 'Movement',
                                value: `24hr Change: **${((newPrice - originalPrice) / originalPrice * 100).toFixed(2)}%**\n` +
                                    `24h Volume: **${numberWithCommas(Globals.priceInfo.volume24h.toFixed(0))} LCX**`

                            },
                            {
                                name: 'Supply',
                                value: `Circulating Supply: **${(Globals.networkInfo.alreadyGeneratedCoins / 100000000000000).toFixed(1)}M LCX**\n` +

                                    `Total Supply: **36.8M LCX**\n` +
                                    `Current Emission: **${((Globals.networkInfo.alreadyGeneratedCoins / 3680000000000000) * 100).toFixed(2)}%**`
                            }
                        ],
                        footer: {
                            text: `BTC: $${numberWithCommas(Globals.bitcoinInfo.current_price.toFixed(2))} `
                        }
                    }
                });
            }
        }


    }
});

// get data from http request and store it in variable
async function getData(apiURL, name) {
    const requestOptions = {
        method: 'GET',
        uri: apiURL,
        headers: {},
        json: true,
        // gzip: true
    };
    try {
        const result = await request(requestOptions);
        // console.log(apiURL, name, result);
        return result;
    } catch (err) {
        console.log(`Request failed, ${name} API call error: \n`, err);
        return undefined;
    }
}