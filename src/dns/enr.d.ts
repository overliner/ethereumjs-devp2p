/// <reference types="node" />
import { PeerInfo } from '../dpt';
declare type ProtocolCodes = {
    ipCode: number;
    tcpCode: number;
    udpCode: number;
};
declare type ENRTreeValues = {
    publicKey: string;
    domain: string;
};
export declare class ENR {
    static readonly RECORD_PREFIX = "enr:";
    static readonly TREE_PREFIX = "enrtree:";
    static readonly BRANCH_PREFIX = "enrtree-branch:";
    static readonly ROOT_PREFIX = "enrtree-root:";
    /**
     * Converts an Ethereum Name Record (EIP-778) string into a PeerInfo object after validating
     * its signature component with the public key encoded in the record itself.
     *
     * The record components are:
     * > signature: cryptographic signature of record contents
     * > seq: The sequence number, a 64-bit unsigned integer which increases whenever
     *        the record changes and is republished.
     * > A set of arbitrary key/value pairs
     *
     * @param  {string}   enr
     * @return {PeerInfo}
     */
    static parseAndVerifyRecord(enr: string): PeerInfo;
    /**
     * Extracts the branch subdomain referenced by a DNS tree root string after verifying
     * the root record signature with its base32 compressed public key. Geth's top level DNS
     * domains and their public key can be found in: go-ethereum/params/bootnodes
     *
     * @param  {string} root  (See EIP-1459 for encoding details)
     * @return {string} subdomain subdomain to retrieve branch records from.
     */
    static parseAndVerifyRoot(root: string, publicKey: string): string;
    /**
     * Returns the public key and top level domain of an ENR tree entry.
     * The domain is the starting point for traversing a set of linked DNS TXT records
     * and the public key is used to verify the root entry record
     *
     * @param  {string}        tree (See EIP-1459 )
     * @return {ENRTreeValues}
     */
    static parseTree(tree: string): ENRTreeValues;
    /**
     * Returns subdomains listed in an ENR branch entry. These in turn lead to
     * either further branch entries or ENR records.
     * @param  {string}   branch
     * @return {string[]}
     */
    static parseBranch(branch: string): string[];
    /**
     * Gets relevant multiaddr conversion codes for ipv4, ipv6 and tcp, udp formats
     * @param  {Buffer}        protocolId
     * @return {ProtocolCodes}
     */
    static _getIpProtocolConversionCodes(protocolId: Buffer): ProtocolCodes;
}
export {};
