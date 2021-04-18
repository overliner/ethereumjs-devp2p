"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tape_1 = __importDefault(require("tape"));
const dns_1 = require("../src/dns");
const testdata_json_1 = __importDefault(require("./testdata.json"));
const dns = testdata_json_1.default.dns;
// Root DNS entries
tape_1.default('ENR (root): should parse and verify and DNS root entry', (t) => {
    const subdomain = dns_1.ENR.parseAndVerifyRoot(dns.enrRoot, dns.publicKey);
    t.equal(subdomain, 'JORXBYVVM7AEKETX5DGXW44EAY', 'returns correct subdomain');
    t.end();
});
tape_1.default('ENR (root): should error if DNS root entry is mis-prefixed', (t) => {
    try {
        dns_1.ENR.parseAndVerifyRoot(dns.enrRootBadPrefix, dns.publicKey);
    }
    catch (e) {
        t.ok(e.toString().includes("ENR root entry must start with 'enrtree-root:'"), 'has correct error message');
        t.end();
    }
});
tape_1.default('ENR (root): should error if DNS root entry signature is invalid', (t) => {
    try {
        dns_1.ENR.parseAndVerifyRoot(dns.enrRootBadSig, dns.publicKey);
    }
    catch (e) {
        t.ok(e.toString().includes('Unable to verify ENR root signature'), 'has correct error message');
        t.end();
    }
});
tape_1.default('ENR (root): should error if DNS root entry is malformed', (t) => {
    try {
        dns_1.ENR.parseAndVerifyRoot(dns.enrRootMalformed, dns.publicKey);
    }
    catch (e) {
        t.ok(e.toString().includes("Could not parse 'l' value from ENR root entry"), 'has correct error message');
        t.end();
    }
});
// Tree DNS entries
tape_1.default('ENR (tree): should parse a DNS tree entry', (t) => {
    const { publicKey, domain } = dns_1.ENR.parseTree(dns.enrTree);
    t.equal(publicKey, dns.publicKey, 'returns correct public key');
    t.equal(domain, 'nodes.example.org', 'returns correct url');
    t.end();
});
tape_1.default('ENR (tree): should error if DNS tree entry is mis-prefixed', (t) => {
    try {
        dns_1.ENR.parseTree(dns.enrTreeBadPrefix);
    }
    catch (e) {
        t.ok(e.toString().includes("ENR tree entry must start with 'enrtree:'"), 'has correct error message');
        t.end();
    }
});
tape_1.default('ENR (tree): should error if DNS tree entry is misformatted', (t) => {
    try {
        dns_1.ENR.parseTree(dns.enrTreeMalformed);
    }
    catch (e) {
        t.ok(e.toString().includes('Could not parse domain from ENR tree entry'), 'has correct error message');
        t.end();
    }
});
// Branch entries
tape_1.default('ENR (branch): should parse and verify a single component DNS branch entry', (t) => {
    const expected = [
        'D2SNLTAGWNQ34NTQTPHNZDECFU',
        '67BLTJEU5R2D5S3B4QKJSBRFCY',
        'A2HDMZBB4JIU53VTEGC4TG6P4A',
    ];
    const branches = dns_1.ENR.parseBranch(dns.enrBranch);
    t.deepEqual(branches, expected, 'returns array of subdomains');
    t.end();
});
tape_1.default('ENR (branch): should error if DNS branch entry is mis-prefixed', (t) => {
    try {
        dns_1.ENR.parseBranch(dns.enrBranchBadPrefix);
    }
    catch (e) {
        t.ok(e.toString().includes("ENR branch entry must start with 'enrtree-branch:'"), 'has correct error message');
        t.end();
    }
});
// ENR DNS entries
tape_1.default('ENR (enr): should convert an Ethereum Name Record string', (t) => {
    const { address, tcpPort, udpPort } = dns_1.ENR.parseAndVerifyRecord(dns.enr);
    t.equal(address, '40.113.111.135', 'returns correct address');
    t.equal(tcpPort, 30303, 'returns correct tcpPort');
    t.equal(udpPort, 30303, 'returns correct udpPort');
    t.end();
});
tape_1.default('ENR (enr): should return correct multiaddr conversion codes for ipv6', (t) => {
    const expected = { ipCode: 41, tcpCode: 6, udpCode: 273 };
    const protocolId = Buffer.from('v6');
    const codes = dns_1.ENR._getIpProtocolConversionCodes(protocolId);
    t.deepEqual(codes, expected, 'returns correct codes');
    t.end();
});
tape_1.default('ENR (enr): should error if record mis-prefixed', (t) => {
    try {
        dns_1.ENR.parseAndVerifyRecord(dns.enrBadPrefix);
    }
    catch (e) {
        t.ok(e.toString().includes("String encoded ENR must start with 'enr:'"), 'has correct error message');
        t.end();
    }
});
tape_1.default('ENR (enr): should error when converting to unrecognized ip protocol id', (t) => {
    const protocolId = Buffer.from('v7');
    try {
        dns_1.ENR._getIpProtocolConversionCodes(protocolId);
    }
    catch (e) {
        t.ok(e.toString().includes("IP protocol must be 'v4' or 'v6'"), 'has correct error message');
        t.end();
    }
});
//# sourceMappingURL=enr.js.map