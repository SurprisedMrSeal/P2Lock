# [P2Lock!!](https://p2lock.carrd.co/)

This is a discord bot that Locks your hunts, rares and regionals and more! (toggleable).

Basically does the same-ish thing as Poké-Lock (+ Rare/Regional lock)

[Bot invite if you wanna add the actual bot](https://discord.com/oauth2/authorize?client_id=806723110761136169&permissions=67696&scope=bot)
---
## Building the bot

- [Go to the discord developer portal](https://discord.com/developers/applications)
- Click on "New Application" and give it a name (can be changed later). Click on copy ID.
- Customise whatever you want and then click on "Bot" on the left side.
- Scroll down and enable all the three intents and then get the bot's token.
- You can toggle whether you want the bot to be Public or not (Public allows others to add the bot to their servers)
- Then go  up to "Oauth2" and click on URL Generator.
- Under "Scopes" click on "bot" and then scroll down to select the bot's permissions (mostly needs Manage Channels)
- After doing this you can invite the bot to your server

## Making the bot alive

- Download all the files and put them wherever you're hosting the bot.
(If you're hosting it on your device, you'll need to download [Node.js](https://nodejs.org/)).
- You will probably need to run "npm i discord.js" in the terminal if you're hosting it locally.
- Click on "run" or type "npm run bot" in the console!
- You may change the ID "Seal" in utils.js to your ID to help with testing.

## Mongo

This lets you use configurable features without having to store the information wherever you're hosting it. If you're not going to be using these features (toggling some features, changing prefixes etc.) You can check out the mongo-less version ['without-DB (1.14.3)'](https://github.com/SurprisedMrSeal/P2Lock/tree/without-DB-(1.14.3)) (This is an old version and may/may not be be updated in the future).

- You will need to create a database in Mongo and name it P2Lock (can change it if you change it in mongoUtils.js too (const DB = ))
- copy your uri and paste it in the .env file
- allow your ip or the ip of the place you're hosting from if needed
---
Congrats you made a locking bot!

- `80% of the code was made by ChatGPT because I have no skill. Thanks for downloading!`
- `- @mrspheal`

### Links
- [Bot Invite](https://discord.com/oauth2/authorize?client_id=806723110761136169&permissions=67696&scope=bot)
- [GitHub](https://github.com/SurprisedMrSeal/P2Lock)
- [Support Server](https://discord.com/invite/rvrckpjRVj)
- [TOS](https://p2lock.carrd.co/#tos)
- [Privacy Policy](https://p2lock.carrd.co/#privacy)
---