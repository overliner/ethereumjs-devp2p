"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.destroyRLPXs = exports.twoPeerMsgExchange = exports.initTwoPeerRLPXSetup = exports.getTestRLPXs = exports.destroyDPTs = exports.initTwoPeerDPTSetup = exports.getTestDPTsWithDns = exports.getTestDPTs = exports.basePort = exports.localhost = void 0;
const src_1 = require("../../src");
const common_1 = __importDefault(require("@ethereumjs/common"));
const testdata_json_1 = __importDefault(require("../testdata.json"));
exports.localhost = '127.0.0.1';
exports.basePort = 30306;
function getTestDPTs(numDPTs) {
    const dpts = [];
    for (let i = 0; i < numDPTs; ++i) {
        const dpt = new src_1.DPT(src_1.genPrivateKey(), {
            endpoint: {
                address: exports.localhost,
                udpPort: exports.basePort + i,
                tcpPort: exports.basePort + i,
            },
            timeout: 100,
        });
        dpt.bind(exports.basePort + i);
        dpts.push(dpt);
    }
    return dpts;
}
exports.getTestDPTs = getTestDPTs;
function getTestDPTsWithDns(numDPTs) {
    const dpts = [];
    for (let i = 0; i < numDPTs; ++i) {
        const dpt = new src_1.DPT(src_1.genPrivateKey(), {
            endpoint: {
                address: exports.localhost,
                udpPort: exports.basePort + i,
                tcpPort: exports.basePort + i,
            },
            timeout: 100,
            refreshInterval: 10,
            dnsNetworks: [testdata_json_1.default.dns.enrTree],
            shouldFindNeighbours: false,
            shouldGetDnsPeers: true,
        });
        dpt.bind(exports.basePort + i);
        dpts.push(dpt);
    }
    return dpts;
}
exports.getTestDPTsWithDns = getTestDPTsWithDns;
function initTwoPeerDPTSetup() {
    const dpts = getTestDPTs(2);
    const peer = { address: exports.localhost, udpPort: exports.basePort + 1 };
    dpts[0].addPeer(peer);
    return dpts;
}
exports.initTwoPeerDPTSetup = initTwoPeerDPTSetup;
function destroyDPTs(dpts) {
    for (const dpt of dpts)
        dpt.destroy();
}
exports.destroyDPTs = destroyDPTs;
function getTestRLPXs(numRLPXs, maxPeers = 10, capabilities, common) {
    const rlpxs = [];
    if (!capabilities) {
        capabilities = [src_1.ETH.eth65, src_1.ETH.eth64, src_1.ETH.eth63, src_1.ETH.eth62];
    }
    if (!common) {
        common = new common_1.default({ chain: 'mainnet' });
    }
    const dpts = getTestDPTs(numRLPXs);
    for (let i = 0; i < numRLPXs; ++i) {
        const rlpx = new src_1.RLPx(dpts[i].privateKey, {
            dpt: dpts[i],
            maxPeers: maxPeers,
            capabilities: capabilities,
            common: common.constructor === Array ? common[i] : common,
            listenPort: exports.basePort + i,
        });
        rlpx.listen(exports.basePort + i);
        rlpxs.push(rlpx);
    }
    return rlpxs;
}
exports.getTestRLPXs = getTestRLPXs;
function initTwoPeerRLPXSetup(maxPeers, capabilities, common) {
    const rlpxs = getTestRLPXs(2, maxPeers, capabilities, common);
    const peer = { address: exports.localhost, udpPort: exports.basePort + 1, tcpPort: exports.basePort + 1 };
    rlpxs[0]._dpt.addPeer(peer);
    return rlpxs;
}
exports.initTwoPeerRLPXSetup = initTwoPeerRLPXSetup;
/**
 * @param {Test} t
 * @param {Array} capabilities Capabilities
 * @param {Object} opts
 * @param {Dictionary} opts.status0 Status values requested by protocol
 * @param {Dictionary} opts.status1 Status values requested by protocol
 * @param {Function} opts.onOnceStatus0 (rlpxs, protocol) Optional handler function
 * @param {Function} opts.onPeerError0 (err, rlpxs) Optional handler function
 * @param {Function} opts.onPeerError1 (err, rlpxs) Optional handler function
 * @param {Function} opts.onOnMsg0 (rlpxs, protocol, code, payload) Optional handler function
 * @param {Function} opts.onOnMsg1 (rlpxs, protocol, code, payload) Optional handler function
 */
function twoPeerMsgExchange(t, opts, capabilities, common) {
    const rlpxs = initTwoPeerRLPXSetup(null, capabilities, common);
    rlpxs[0].on('peer:added', function (peer) {
        const protocol = peer.getProtocols()[0];
        protocol.sendStatus(opts.status0); // (1 ->)
        protocol.once('status', () => {
            if (opts.onOnceStatus0)
                opts.onOnceStatus0(rlpxs, protocol);
        }); // (-> 2)
        protocol.on('message', async (code, payload) => {
            if (opts.onOnMsg0)
                opts.onOnMsg0(rlpxs, protocol, code, payload);
        });
        peer.on('error', (err) => {
            if (opts.onPeerError0) {
                opts.onPeerError0(err, rlpxs);
            }
            else {
                t.fail(`Unexpected peer 0 error: ${err}`);
            }
        }); // (-> 2)
    });
    rlpxs[1].on('peer:added', function (peer) {
        const protocol = peer.getProtocols()[0];
        protocol.on('message', async (code, payload) => {
            switch (code) {
                // Comfortability hack, use constants like devp2p.ETH.MESSAGE_CODES.STATUS
                // in production use
                case 0x00: // (-> 1)
                    t.pass('should receive initial status message');
                    protocol.sendStatus(opts.status1); // (2 ->)
                    break;
            }
            if (opts.onOnMsg1)
                opts.onOnMsg1(rlpxs, protocol, code, payload);
        });
        peer.on('error', (err) => {
            if (opts.onPeerError1) {
                opts.onPeerError1(err, rlpxs);
            }
            else {
                t.fail(`Unexpected peer 1 error: ${err}`);
            }
        });
    });
}
exports.twoPeerMsgExchange = twoPeerMsgExchange;
function destroyRLPXs(rlpxs) {
    for (const rlpx of rlpxs) {
        // FIXME: Call destroy() on dpt instance from the rlpx.destroy() method
        rlpx._dpt.destroy();
        rlpx.destroy();
    }
}
exports.destroyRLPXs = destroyRLPXs;
//# sourceMappingURL=util.js.map