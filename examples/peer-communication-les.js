"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const devp2p = __importStar(require("../src/index"));
const common_1 = __importDefault(require("@ethereumjs/common"));
const block_1 = require("@ethereumjs/block");
const ms_1 = __importDefault(require("ms"));
const chalk_1 = __importDefault(require("chalk"));
const assert_1 = __importDefault(require("assert"));
const crypto_1 = require("crypto");
const PRIVATE_KEY = crypto_1.randomBytes(32);
const GENESIS_TD = 1;
const GENESIS_HASH = Buffer.from('6341fd3daf94b748c72ced5a5b26028f2474f5f00d824504e4fa37a75767e177', 'hex');
const common = new common_1.default({ chain: 'rinkeby' });
const bootstrapNodes = common.bootstrapNodes();
const BOOTNODES = bootstrapNodes.map((node) => {
    return {
        address: node.ip,
        udpPort: node.port,
        tcpPort: node.port,
    };
});
const REMOTE_CLIENTID_FILTER = [
    'go1.5',
    'go1.6',
    'go1.7',
    'Geth/v1.7',
    'quorum',
    'pirl',
    'ubiq',
    'gmc',
    'gwhale',
    'prichain',
];
const getPeerAddr = (peer) => `${peer._socket.remoteAddress}:${peer._socket.remotePort}`;
// DPT
const dpt = new devp2p.DPT(PRIVATE_KEY, {
    refreshInterval: 30000,
    endpoint: {
        address: '0.0.0.0',
        udpPort: null,
        tcpPort: null,
    },
});
/* eslint-disable no-console */
dpt.on('error', (err) => console.error(chalk_1.default.red(`DPT error: ${err}`)));
/* eslint-disable @typescript-eslint/no-use-before-define */
// RLPx
const rlpx = new devp2p.RLPx(PRIVATE_KEY, {
    dpt,
    maxPeers: 25,
    capabilities: [devp2p.LES.les2],
    common,
    remoteClientIdFilter: REMOTE_CLIENTID_FILTER,
});
rlpx.on('error', (err) => console.error(chalk_1.default.red(`RLPx error: ${err.stack || err}`)));
rlpx.on('peer:added', (peer) => {
    const addr = getPeerAddr(peer);
    const les = peer.getProtocols()[0];
    const requests = { headers: [], bodies: [] };
    const clientId = peer.getHelloMessage().clientId;
    console.log(chalk_1.default.green(`Add peer: ${addr} ${clientId} (les${les.getVersion()}) (total: ${rlpx.getPeers().length})`));
    les.sendStatus({
        headTd: devp2p.int2buffer(GENESIS_TD),
        headHash: GENESIS_HASH,
        headNum: Buffer.from([]),
        genesisHash: GENESIS_HASH,
    });
    les.once('status', (status) => {
        const msg = [devp2p.buffer2int(status['headNum']), 1, 0, 1];
        les.sendMessage(devp2p.LES.MESSAGE_CODES.GET_BLOCK_HEADERS, 1, msg);
    });
    les.on('message', async (code, payload) => {
        switch (code) {
            case devp2p.LES.MESSAGE_CODES.BLOCK_HEADERS: {
                if (payload[2].length > 1) {
                    console.log(`${addr} not more than one block header expected (received: ${payload[2].length})`);
                    break;
                }
                const header = block_1.BlockHeader.fromValuesArray(payload[2][0], {});
                setTimeout(() => {
                    les.sendMessage(devp2p.LES.MESSAGE_CODES.GET_BLOCK_BODIES, 2, [header.hash()]);
                    requests.bodies.push(header);
                }, ms_1.default('0.1s'));
                break;
            }
            case devp2p.LES.MESSAGE_CODES.BLOCK_BODIES: {
                if (payload[2].length !== 1) {
                    console.log(`${addr} not more than one block body expected (received: ${payload[2].length})`);
                    break;
                }
                const header2 = requests.bodies.shift();
                const txs = payload[2][0][0];
                const uncleHeaders = payload[2][0][1];
                const block = block_1.Block.fromValuesArray([header2.raw(), txs, uncleHeaders]);
                const isValid = await isValidBlock(block);
                let isValidPayload = false;
                if (isValid) {
                    isValidPayload = true;
                    onNewBlock(block, peer);
                    break;
                }
                if (!isValidPayload) {
                    console.log(`${addr} received wrong block body`);
                }
                break;
            }
        }
    });
});
rlpx.on('peer:removed', (peer, reasonCode, disconnectWe) => {
    const who = disconnectWe ? 'we disconnect' : 'peer disconnect';
    const total = rlpx.getPeers().length;
    console.log(chalk_1.default.yellow(`Remove peer: ${getPeerAddr(peer)} - ${who}, reason: ${peer.getDisconnectPrefix(reasonCode)} (${String(reasonCode)}) (total: ${total})`));
});
rlpx.on('peer:error', (peer, err) => {
    if (err.code === 'ECONNRESET')
        return;
    if (err instanceof assert_1.default.AssertionError) {
        const peerId = peer.getId();
        if (peerId !== null)
            dpt.banPeer(peerId, ms_1.default('5m'));
        console.error(chalk_1.default.red(`Peer error (${getPeerAddr(peer)}): ${err.message}`));
        return;
    }
    console.error(chalk_1.default.red(`Peer error (${getPeerAddr(peer)}): ${err.stack || err}`));
});
// uncomment, if you want accept incoming connections
// rlpx.listen(30303, '0.0.0.0')
// dpt.bind(30303, '0.0.0.0')
for (const bootnode of BOOTNODES) {
    dpt.bootstrap(bootnode).catch((err) => {
        console.error(chalk_1.default.bold.red(`DPT bootstrap error: ${err.stack || err}`));
    });
}
// connect to local ethereum node (debug)
/*
dpt.addPeer({ address: '127.0.0.1', udpPort: 30303, tcpPort: 30303 })
  .then((peer) => {
    return rlpx.connect({
      id: peer.id,
      address: peer.address,
      port: peer.tcpPort
    })
  })
  .catch((err) => console.log(`error on connection to local node: ${err.stack || err}`)) */
function onNewBlock(block, peer) {
    const blockHashHex = block.hash().toString('hex');
    const blockNumber = block.header.number.toNumber();
    console.log(`----------------------------------------------------------------------------------------------------------`);
    console.log(`block ${blockNumber} received: ${blockHashHex} (from ${getPeerAddr(peer)})`);
    console.log(`----------------------------------------------------------------------------------------------------------`);
}
function isValidTx(tx) {
    return tx.validate();
}
async function isValidBlock(block) {
    return (block.validateUnclesHash() &&
        block.transactions.every(isValidTx) &&
        block.validateTransactionsTrie());
}
setInterval(() => {
    const peersCount = dpt.getPeers().length;
    const openSlots = rlpx._getOpenSlots();
    const queueLength = rlpx._peersQueue.length;
    const queueLength2 = rlpx._peersQueue.filter((o) => o.ts <= Date.now()).length;
    console.log(chalk_1.default.yellow(`Total nodes in DPT: ${peersCount}, open slots: ${openSlots}, queue: ${queueLength} / ${queueLength2}`));
}, ms_1.default('30s'));
//# sourceMappingURL=peer-communication-les.js.map