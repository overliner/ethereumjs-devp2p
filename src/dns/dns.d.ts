import { PeerInfo } from '../dpt';
export declare type DNSOptions = {
    /**
     * ipv4 or ipv6 address of server to pass to native dns.setServers()
     * Sets the IP address of servers to be used when performing
     * DNS resolution.
     * @type {string}
     */
    dnsServerAddress?: string;
};
export declare class DNS {
    private _DNSTreeCache;
    private readonly _errorTolerance;
    constructor(options?: DNSOptions);
    /**
     * Returns a list of verified peers listed in an EIP-1459 DNS tree. Method may
     * return fewer peers than requested if `maxQuantity` is larger than the number
     * of ENR records or the number of errors/duplicate peers encountered by randomized
     * search exceeds `maxQuantity` plus the `errorTolerance` factor.
     *
     * @param {number}        maxQuantity  max number to get
     * @param {string}        treeEntry enrtree string (See EIP-1459 for format)
     * @return {PeerInfo}
     */
    getPeers(maxQuantity: number, dnsNetworks: string[]): Promise<PeerInfo[]>;
    /**
     * Runs a recursive, randomized descent of the DNS tree to retrieve a single
     * ENR record as a PeerInfo object. Returns null if parsing or DNS resolution fails.
     *
     * @param  {string}        subdomain
     * @param  {SearchContext} context
     * @return {PeerInfo | null}
     */
    private _search;
    private _getEntryType;
    /**
     * Returns a randomly selected subdomain string from the list provided by a branch
     * entry record.
     *
     * The client must track subdomains which are already resolved to avoid
     * going into an infinite loop b/c branch entries can contain
     * circular references. It’s in the client’s best interest to traverse the
     * tree in random order.
     *
     * @param {string[]}      branches
     * @param {SearchContext} context
     * @return {String}       subdomian
     */
    private _selectRandomPath;
    /**
     * Retrieves the TXT record stored at a location from either
     * this DNS tree cache or via Node's DNS api
     *
     * @param  {string}             subdomain
     * @param  {SearchContext = {}} context
     * @return {string}
     */
    private _getTXTRecord;
    /**
     * Returns false if candidate peer already exists in the
     * current collection of peers.
     * Returns true otherwise.
     *
     * @param  {PeerInfo}   peer
     * @param  {PeerInfo[]} peers
     * @return {boolean}
     */
    private _isNewPeer;
    /**
     * Only used for testing. A stopgap to enable successful
     * TestDouble mocking of the native `dns` module.
     * @param {any} mock TestDouble fn
     */
    __setNativeDNSModuleResolve(mock: any): void;
}
