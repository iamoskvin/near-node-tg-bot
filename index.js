const { default: axios } = require("axios");
const fs = require('fs');
const { exit } = require("process");
require('dotenv').config()

const RPC_TIMEOUT = 10000;
let state = {};
let TIMEOUT_MINUTES;
let MIN_PEERS;
let MIN_UPTIME_PERCENT;

const TIMEOUT_MINUTES_STR = process.env.TIMEOUT_MINUTES;
if (TIMEOUT_MINUTES_STR) {
    TIMEOUT_MINUTES = +TIMEOUT_MINUTES_STR
} else{
    TIMEOUT_MINUTES = 30
}
const MIN_PEERS_STR = process.env.MIN_PEERS;
if (MIN_PEERS_STR) {
    MIN_PEERS = +MIN_PEERS_STR
} else {
    MIN_PEERS = 15
} 

const MIN_UPTIME_STR = process.env.MIN_UPTIME_PERCENT;
if (MIN_UPTIME_STR) {
    MIN_UPTIME_PERCENT = +MIN_UPTIME_STR
} else {
    MIN_UPTIME_PERCENT = 95
} 

const RPC_IP = process.env.RPC_IP || '127.0.0.1'
const RPC_PORT = '3030'
const RPC = `http://${RPC_IP}:${RPC_PORT}`
const TG_API_KEY= process.env.TG_API_KEY
const TG_CHAT_ID = process.env.TG_CHAT_ID
const POOL_ID = process.env.POOL_ID

const now = Date.now() / 1000;
const filePath = './botstate.txt';

async function notify(text) {
    axios.post(`https://api.telegram.org/bot${TG_API_KEY}/sendMessage`,
    {'chat_id': TG_CHAT_ID, 'text': text})

}

async function protocolVers() {
    let res;
    try {
        res = await axios.post(RPC, {"jsonrpc": "2.0", "method": "status", "id": "dontcare", "params": [null]}, 
        {timeout: RPC_TIMEOUT});
    } catch (error) {        
        await doExit();
        return
    }
    
    const status = res.data.result;
    status['protocol_version'] = 101 //testing
    if (status['protocol_version'] == status['latest_protocol_version']) {
        return 
    }
    
    if (!state.protocol_version || status['latest_protocol_version'] != state.protocol_version) {
        await notify(`New protocol version.\n Your version - ${status['protocol_version']}. New version - ${status['latest_protocol_version']}`);
        state.protocol_version = status['latest_protocol_version']
    }
}

async function peers() {        
    const ts = state.peers_timestamp
    if ( (now - ts) / 60 <= TIMEOUT_MINUTES) {
        return
    }

    let res;
    try {
        res = await axios.post(RPC, {"jsonrpc": "2.0", "method": "network_info", "id": "dontcare", "params": [null]}, 
        {timeout: RPC_TIMEOUT});
    } catch (error) {
        await doExit();
        return
    }
    
    const data = res.data.result;
    if (data.num_active_peers < MIN_PEERS) {
        await notify(`Too few peers.\n Active peers now - ${data['num_active_peers']}. Min peers setting - ${MIN_PEERS}`);
        state.peers_timestamp = now;
    }      
}

async function uptime() {
    const ts = state.uptime_timestamp
    if ( (now - ts) / 60 <= TIMEOUT_MINUTES) {
        return
    }
    let res;
    try {
        res = await axios.post(RPC, {"jsonrpc": "2.0", "method": "validators", "id": "dontcare", "params": [null]}, 
        {timeout: RPC_TIMEOUT});
    } catch (error) {        
        await doExit();
        return
    }    
    
    const data = res.data;
    const validators = data.result.current_validators;
    const validator = validators.find(val => val.account_id === POOL_ID)
    
    if (validator.num_expected_chunks < 10) {
        return
    }    
    const uptime = validator.num_produced_chunks/validator.num_expected_chunks *100;
    if (uptime < MIN_UPTIME_PERCENT) {
        await notify(`% chunks problem: \n expected - ${validator.num_expected_chunks}, produced - ${validator.num_produced_chunks}, \n uptime - ${uptime}%`)        
        state.uptime_timestamp = now;
    }
    
}

function loadFile() {    
    if (!fs.existsSync(filePath)) {        
        return
    }     
    state = JSON.parse(fs.readFileSync(filePath).toString());    
}

function writeFile() {
    fs.writeFileSync(filePath, JSON.stringify(state))    
}

async function doExit() {
    const ts = state.rpc_timestamp    
    if ( !ts ||  ((now - ts) / 60 > TIMEOUT_MINUTES) ) {        
        await notify("can't connect to node RPC");        
        state.rpc_timestamp = now;
        writeFile();
    }
}

async function main() {    
    loadFile();
    await protocolVers();
    await peers();
    await uptime();
    writeFile();    
}

main()