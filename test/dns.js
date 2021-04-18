"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tape_1 = __importDefault(require("tape"));
const testdouble_1 = __importDefault(require("testdouble"));
const testdata_json_1 = __importDefault(require("./testdata.json"));
const dns_1 = require("../src/dns");
tape_1.default('DNS', async (t) => {
    const mockData = testdata_json_1.default.dns;
    const mockDns = testdouble_1.default.replace('dns');
    let dns;
    function initializeDns() {
        dns = new dns_1.DNS();
        // td is not intercepting the native `dns` import in ../src/dns
        // even if it's imported after the td.replace statement above.
        // (td.replaceEsm can address this problem for Node >= 13)
        // This manually sets the fixture:
        dns.__setNativeDNSModuleResolve(mockDns);
    }
    const host = 'nodes.example.org';
    const rootDomain = 'JORXBYVVM7AEKETX5DGXW44EAY';
    const branchDomainA = 'D2SNLTAGWNQ34NTQTPHNZDECFU';
    const branchDomainB = 'D3SNLTAGWNQ34NTQTPHNZDECFU';
    const branchDomainC = 'D4SNLTAGWNQ34NTQTPHNZDECFU';
    const branchDomainD = 'D5SNLTAGWNQ34NTQTPHNZDECFU';
    const partialBranchA = 'AAAA';
    const partialBranchB = 'BBBB';
    const singleBranch = `enrtree-branch:${branchDomainA}`;
    const doubleBranch = `enrtree-branch:${branchDomainA},${branchDomainB}`;
    const multiComponentBranch = [
        `enrtree-branch:${branchDomainA},${partialBranchA}`,
        `${partialBranchB},${branchDomainB}`,
    ];
    // Note: once td.when is asked to throw for an input it will always throw.
    // Input can't be re-used for a passing case.
    const errorBranchA = `enrtree-branch:${branchDomainC}`;
    const errorBranchB = `enrtree-branch:${branchDomainD}`;
    testdouble_1.default.when(mockDns.resolve(host, 'TXT')).thenReturn([[mockData.enrRoot]]);
    t.test('retrieves a single peer', async (t) => {
        testdouble_1.default.when(mockDns.resolve(`${rootDomain}.${host}`, 'TXT')).thenReturn([[singleBranch]]);
        testdouble_1.default.when(mockDns.resolve(`${branchDomainA}.${host}`, 'TXT')).thenReturn([[mockData.enrA]]);
        initializeDns();
        const peers = await dns.getPeers(1, [mockData.enrTree]);
        t.equal(peers.length, 1, 'returns single peer');
        t.equal(peers[0].address, '45.77.40.127', 'peer has correct address');
        t.equal(peers[0].tcpPort, 30303, 'peer has correct port');
        t.end();
    });
    t.test('retrieves all peers (2) when maxQuantity larger than DNS tree size', async (t) => {
        testdouble_1.default.when(mockDns.resolve(`${rootDomain}.${host}`, 'TXT')).thenReturn([[doubleBranch]]);
        testdouble_1.default.when(mockDns.resolve(`${branchDomainA}.${host}`, 'TXT')).thenReturn([[mockData.enrA]]);
        testdouble_1.default.when(mockDns.resolve(`${branchDomainB}.${host}`, 'TXT')).thenReturn([[mockData.enrB]]);
        initializeDns();
        const peers = await dns.getPeers(50, [mockData.enrTree]);
        t.equal(peers.length, 2, 'returns two peers');
        t.ok(peers[0].address !== peers[1].address, 'peer addresses are different');
        t.end();
    });
    t.test('retrieves all peers (3) when branch entries are composed of multiple strings', async (t) => {
        testdouble_1.default.when(mockDns.resolve(`${rootDomain}.${host}`, 'TXT')).thenReturn([multiComponentBranch]);
        testdouble_1.default.when(mockDns.resolve(`${branchDomainA}.${host}`, 'TXT')).thenReturn([[mockData.enr]]);
        testdouble_1.default.when(mockDns.resolve(`${branchDomainB}.${host}`, 'TXT')).thenReturn([[mockData.enrA]]);
        testdouble_1.default.when(mockDns.resolve(`${partialBranchA}${partialBranchB}.${host}`, 'TXT')).thenReturn([
            [mockData.enrB],
        ]);
        initializeDns();
        const peers = await dns.getPeers(50, [mockData.enrTree]);
        t.equal(peers.length, 3, 'returns three peers');
        t.ok(peers[0].address !== peers[1].address, 'peer 0 is not peer 1');
        t.ok(peers[0].address !== peers[2].address, 'peer 0 is not peer 2');
        t.ok(peers[1].address !== peers[2].address, 'peer 1 is not peer 2');
        t.end();
    });
    t.test('it tolerates circular branch references', async (t) => {
        // root --> branchA
        // branchA --> branchA
        testdouble_1.default.when(mockDns.resolve(`${rootDomain}.${host}`, 'TXT')).thenReturn([[singleBranch]]);
        testdouble_1.default.when(mockDns.resolve(`${branchDomainA}.${host}`, 'TXT')).thenReturn([[singleBranch]]);
        initializeDns();
        const peers = await dns.getPeers(1, [mockData.enrTree]);
        t.equal(peers.length, 0, 'method resolves (zero peers)');
        t.end();
    });
    t.test('recovers when dns.resolve returns empty', async (t) => {
        testdouble_1.default.when(mockDns.resolve(`${rootDomain}.${host}`, 'TXT')).thenReturn([[singleBranch]]);
        // Empty response case
        testdouble_1.default.when(mockDns.resolve(`${branchDomainA}.${host}`, 'TXT')).thenReturn([]);
        initializeDns();
        let peers = await dns.getPeers(1, [mockData.enrTree]);
        t.equal(peers.length, 0, 'method resolves when dns response is [] (zero peers)');
        // No TXT records case
        testdouble_1.default.when(mockDns.resolve(`${branchDomainA}.${host}`, 'TXT')).thenReturn([[]]);
        peers = await dns.getPeers(1, [mockData.enrTree]);
        t.equal(peers.length, 0, 'method resolves when dns response is [[]] (zero peers)');
        t.end();
    });
    t.test('ignores domain fetching errors', async (t) => {
        testdouble_1.default.when(mockDns.resolve(`${rootDomain}.${host}`, 'TXT')).thenReturn([[errorBranchA]]);
        testdouble_1.default.when(mockDns.resolve(`${branchDomainC}.${host}`, 'TXT')).thenThrow(new Error('failure'));
        initializeDns();
        const peers = await dns.getPeers(1, [mockData.enrTree]);
        t.equal(peers.length, 0, 'method resolves (zero peers)');
        t.end();
    });
    t.test('ignores unrecognized TXT record formats', async (t) => {
        testdouble_1.default.when(mockDns.resolve(`${rootDomain}.${host}`, 'TXT')).thenReturn([
            [mockData.enrBranchBadPrefix],
        ]);
        initializeDns();
        const peers = await dns.getPeers(1, [mockData.enrTree]);
        t.equal(peers.length, 0, 'method resolves (zero peers)');
        t.end();
    });
    t.test('caches peers it previously fetched', async (t) => {
        testdouble_1.default.when(mockDns.resolve(`${rootDomain}.${host}`, 'TXT')).thenReturn([[errorBranchB]]);
        testdouble_1.default.when(mockDns.resolve(`${branchDomainD}.${host}`, 'TXT')).thenReturn([[mockData.enrA]]);
        // Run initial fetch...
        initializeDns();
        const peersA = await dns.getPeers(1, [mockData.enrTree]);
        t.equal(peersA.length, 1, 'returns a  network fetched peer');
        // Specify that a subsequent network call retrieving the same peer should throw.
        // This test passes only if the peer is fetched from cache
        testdouble_1.default.when(mockDns.resolve(`${branchDomainD}.${host}`, 'TXT')).thenThrow(new Error('failure'));
        const peersB = await dns.getPeers(1, [mockData.enrTree]);
        t.equal(peersB.length, 1, 'returns a cached peer');
        t.equal(peersA[0].address, peersB[0].address, 'network fetched and cached peers are same');
        t.end();
    });
    t.test('should reset td', (t) => {
        testdouble_1.default.reset();
        t.end();
    });
});
tape_1.default('DNS: (integration)', async (t) => {
    const publicKey = 'AKA3AM6LPBYEUDMVNU3BSVQJ5AD45Y7YPOHJLEF6W26QOE4VTUDPE';
    const goerliDNS = 'all.goerli.ethdisco.net';
    const enrTree = `enrtree://${publicKey}@${goerliDNS}`;
    const ipTestRegex = /^\d+\.\d+\.\d+\.\d+$/; // e.g 123.44.55.77
    t.test('should retrieve 5 PeerInfos for goerli', async (t) => {
        // Google's dns server address. Needs to be set explicitly to run in CI
        const dns = new dns_1.DNS({ dnsServerAddress: '8.8.8.8' });
        const peers = await dns.getPeers(5, [enrTree]);
        t.equal(peers.length, 5, 'returns 5 peers');
        const seen = [];
        for (const peer of peers) {
            t.ok(peer.address.match(ipTestRegex), 'address is a valid ip');
            t.ok(!seen.includes(peer.address), 'peer is not duplicate');
            seen.push(peer.address);
        }
        t.end();
    });
});
//# sourceMappingURL=dns.js.map