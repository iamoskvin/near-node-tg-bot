## Installation:

Clone repository & install dependencies

```bash
git clone https://github.com/ruziev-dev/near-node-tg-bot.git

cd near-node-tg-bot

npm i
```

Make your `.env` file by example `.env.example`

```bash
cp .env.example .env
```

Set your settings to `.env`

```bash
vim .env

# set your values
RPC_IP='127.0.0.1'
RPC_PORT='3030'
TG_API_KEY=''
TG_CHAT_ID=''
POOL_ID='xx.factory.shardnet.near'
TIMEOUT_MINUTES=30
MIN_PEERS=15
MIN_UPTIME_PERCENT=95
```

- TG_API_KEY - you can get from [**@BotFather**](https://t.me/BotFather)
- TG_CHAT_ID - you can by using [**@GetIDs Bot**](https://t.me/getidsbot)

## Run

```
node index.js
```

## To automate running script find path to Node.js
```bash
which node

# use this path to in crontask
> /usr/bin/node

```

Add chron task every minute

```
crontab -e
```

Add this row with setting path to Node.js and script

```bash
# set your path
* * * * * cd /home/<USERNAME>/near-node-tg-bot/ && /usr/bin/node index.js > /dev/null 2>&1
```

Reload cron service to start execute script

```bash
sudo service cron reload
```