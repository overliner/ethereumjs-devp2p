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
const async_1 = __importDefault(require("async"));
const tape_1 = __importDefault(require("tape"));
const util = __importStar(require("./util"));
const peer_1 = require("../../src/rlpx/peer");
tape_1.default('RLPX: add working node', async (t) => {
    const rlpxs = util.initTwoPeerRLPXSetup();
    rlpxs[0].on('peer:added', function (peer) {
        t.equal(peer._port, 30306, 'should have added peer on peer:added after successful handshake');
        t.equal(rlpxs[0].getPeers().length, 1, 'peer list length should be 1');
        t.equal(rlpxs[0]._getOpenSlots(), 9, 'should have maxPeers - 1 open slots left');
        util.destroyRLPXs(rlpxs);
        t.end();
    });
});
tape_1.default('RLPX: ban node with missing tcp port', async (t) => {
    const rlpxs = util.initTwoPeerRLPXSetup();
    rlpxs[0].on('peer:added', function () {
        const peer = {
            id: Buffer.from('abcd', 'hex'),
            address: '127.0.0.1',
            udpPort: 30308,
            tcpPort: null,
        };
        t.notOk(rlpxs[0]._dpt.banlist.has(peer), 'should not be in ban list before bad peer discovered');
        rlpxs[0]._dpt.emit('peer:new', peer);
        t.ok(rlpxs[0]._dpt.banlist.has(peer), 'should be in ban list after bad peer discovered');
        util.destroyRLPXs(rlpxs);
        t.end();
    });
});
tape_1.default('RLPX: remove node', async (t) => {
    const rlpxs = util.initTwoPeerRLPXSetup();
    async_1.default.series([
        function (cb) {
            rlpxs[0].on('peer:added', function (peer) {
                rlpxs[0].disconnect(peer._remoteId);
                cb(null);
            });
        },
        function (cb) {
            rlpxs[0].on('peer:removed', function (peer, reason) {
                t.equal(reason, peer_1.DISCONNECT_REASONS.CLIENT_QUITTING, 'should close with CLIENT_QUITTING disconnect reason');
                t.equal(rlpxs[0]._getOpenSlots(), 10, 'should have maxPeers open slots left');
                cb(null);
            });
        },
    ], function (err) {
        if (err) {
            t.fail('An unexpected error occured.');
        }
        util.destroyRLPXs(rlpxs);
        t.end();
    });
});
tape_1.default('RLPX: test peer queue / refill connections', async (t) => {
    const rlpxs = util.getTestRLPXs(3, 1);
    const peer = { address: util.localhost, udpPort: util.basePort + 1, tcpPort: util.basePort + 1 };
    rlpxs[0]._dpt.addPeer(peer);
    async_1.default.series([
        function (cb) {
            rlpxs[0].once('peer:added', function () {
                t.equal(rlpxs[0]._peersQueue.length, 0, 'peers queue should contain no peers');
                const peer2 = {
                    address: util.localhost,
                    udpPort: util.basePort + 2,
                    tcpPort: util.basePort + 2,
                };
                rlpxs[0]._dpt.addPeer(peer2);
                cb(null);
            });
        },
        function (cb) {
            rlpxs[0].once('peer:added', function () {
                // FIXME: values not as expected
                // t.equal(rlpxs[0]._peersQueue.length, 1, 'peers queue should contain one peer')
                cb(null);
            });
        },
    ], function (err) {
        if (err) {
            t.fail('An unexpected error occured.');
        }
        util.destroyRLPXs(rlpxs);
        t.end();
    });
});
//# sourceMappingURL=rlpx-simulator.js.map