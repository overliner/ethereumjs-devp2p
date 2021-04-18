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
const testdata_json_1 = __importDefault(require("../testdata.json"));
async function delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
tape_1.default('DPT: new working node', async (t) => {
    const dpts = util.initTwoPeerDPTSetup();
    dpts[0].on('peer:new', function (peer) {
        t.equal(peer.address, '127.0.0.1', 'should have added peer on peer:new');
        util.destroyDPTs(dpts);
        t.end();
    });
});
tape_1.default('DPT: working node added', async (t) => {
    const dpts = util.initTwoPeerDPTSetup();
    dpts[0].on('peer:added', function () {
        t.equal(dpts[0].getPeers().length, 1, 'should have added peer to k-bucket on peer:added');
        util.destroyDPTs(dpts);
        t.end();
    });
});
tape_1.default('DPT: remove node', async (t) => {
    const dpts = util.initTwoPeerDPTSetup();
    async_1.default.series([
        function (cb) {
            dpts[0].on('peer:added', function (peer) {
                dpts[0].removePeer(peer);
                cb(null);
            });
        },
        function (cb) {
            dpts[0].on('peer:removed', function () {
                t.equal(dpts[0].getPeers().length, 0, 'should have removed peer from k-bucket on peer:removed');
                cb(null);
            });
        },
    ], function (err) {
        if (err) {
            t.fail('An unexpected error occured.');
        }
        util.destroyDPTs(dpts);
        t.end();
    });
});
tape_1.default('DPT: ban node', async (t) => {
    const dpts = util.initTwoPeerDPTSetup();
    async_1.default.series([
        function (cb) {
            dpts[0].on('peer:added', function (peer) {
                dpts[0].banPeer(peer);
                cb(null);
            });
        },
        function (cb) {
            dpts[0].on('peer:removed', function (peer) {
                t.equal(dpts[0].banlist.has(peer), true, 'ban-list should contain peer');
                t.equal(dpts[0].getPeers().length, 0, 'should have removed peer from k-bucket on peer:removed');
                cb(null);
            });
        },
    ], function (err) {
        if (err) {
            t.fail('An unexpected error occured.');
        }
        util.destroyDPTs(dpts);
        t.end();
    });
});
tape_1.default('DPT: k-bucket ping', async (t) => {
    const dpts = util.initTwoPeerDPTSetup();
    async_1.default.series([
        function (cb) {
            dpts[0].on('peer:added', function (peer) {
                dpts[0]._onKBucketPing([peer], peer);
                setTimeout(function () {
                    cb(null);
                }, 400);
            });
        },
        function (cb) {
            t.equal(dpts[0].getPeers().length, 1, 'should still have one peer in k-bucket');
            cb(null);
        },
    ], function (err) {
        if (err) {
            t.fail('An unexpected error occured.');
        }
        util.destroyDPTs(dpts);
        t.end();
    });
});
tape_1.default('DPT: add non-available node', async (t) => {
    const dpts = util.getTestDPTs(1);
    const peer = { address: util.localhost, udpPort: util.basePort + 1 };
    await dpts[0].addPeer(peer).catch((e) => {
        t.equal(e.message, 'Timeout error: ping 127.0.0.1:30307', 'should throw Timeout error');
        util.destroyDPTs(dpts);
        t.end();
    });
});
tape_1.default('DPT: simulate bootstrap', async (t) => {
    const numDPTs = 6;
    const dpts = util.getTestDPTs(numDPTs);
    await delay(250);
    await dpts[0].addPeer({ address: util.localhost, udpPort: util.basePort + 1 });
    await delay(100);
    for (const dpt of dpts.slice(2)) {
        await dpt.bootstrap({ address: util.localhost, udpPort: util.basePort + 1 });
    }
    for (const dpt of dpts) {
        for (let i = 0; i < 10; i++) {
            dpt.refresh();
        }
        await delay(400);
    }
    await delay(250);
    // dpts.forEach((dpt, i) => console.log(`${i}:${dpt.getPeers().length}`))
    for (const dpt of dpts) {
        t.equal(dpt.getPeers().length, numDPTs, 'Peers should be distributed to all DPTs');
    }
    await delay(1000);
    util.destroyDPTs(dpts);
    t.end();
});
tape_1.default('DPT: simulate acquiring peers via DNS', async (t) => {
    const dpts = util.getTestDPTsWithDns(1);
    const mockDns = {
        resolve: () => {
            return [[testdata_json_1.default.dns.enr]];
        },
    };
    dpts[0].dns.__setNativeDNSModuleResolve(mockDns);
    dpts[0].refresh();
    await delay(400);
    util.destroyDPTs(dpts);
    t.end();
});
//# sourceMappingURL=dpt-simulator.js.map