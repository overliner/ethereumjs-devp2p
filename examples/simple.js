"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const common_1 = __importDefault(require("@ethereumjs/common"));
const index_1 = require("../src/index");
const PRIVATE_KEY = 'd772e3d6a001a38064dd23964dd2836239fa0e6cec8b28972a87460a17210fe9';
const config = new common_1.default({ chain: 'mainnet' });
const bootstrapNodes = config.bootstrapNodes();
const BOOTNODES = bootstrapNodes.map((node) => {
    return {
        address: node.ip,
        udpPort: node.port,
        tcpPort: node.port,
    };
});
const dpt = new index_1.DPT(Buffer.from(PRIVATE_KEY, 'hex'), {
    endpoint: {
        address: '0.0.0.0',
        udpPort: null,
        tcpPort: null,
    },
});
/* eslint-disable no-console */
dpt.on('error', (err) => console.error(chalk_1.default.red(err.stack || err)));
dpt.on('peer:added', (peer) => {
    const info = `(${peer.id.toString('hex')},${peer.address},${peer.udpPort},${peer.tcpPort})`;
    console.log(chalk_1.default.green(`New peer: ${info} (total: ${dpt.getPeers().length})`));
});
dpt.on('peer:removed', (peer) => {
    console.log(chalk_1.default.yellow(`Remove peer: ${peer.id.toString('hex')} (total: ${dpt.getPeers().length})`));
});
// for accept incoming connections uncomment next line
// dpt.bind(30303, '0.0.0.0')
for (const bootnode of BOOTNODES) {
    dpt.bootstrap(bootnode).catch((err) => console.error(chalk_1.default.bold.red(err.stack || err)));
}
//# sourceMappingURL=simple.js.map