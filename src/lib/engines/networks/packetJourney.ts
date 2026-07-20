import type { PredictionChallenge } from '$lib/trace/types';

export type PacketCacheMode = 'cold' | 'warm';
export type PacketJourneyScenarioId = 'lesson-page' | 'status-page';
export type PacketJourneyPhase =
  | 'browser-cache'
  | 'dns'
  | 'arp'
  | 'lan'
  | 'router'
  | 'tcp'
  | 'tls'
  | 'http'
  | 'server-response'
  | 'render';

export type PacketJourneyNode =
  | 'browser'
  | 'client-stack'
  | 'lan'
  | 'router'
  | 'internet'
  | 'dns-resolver'
  | 'web-server'
  | 'renderer';

export type EncapsulationDirection = 'local' | 'encapsulate' | 'decapsulate' | 'replace-link';

export interface PacketJourneyScenario {
  id: PacketJourneyScenarioId;
  name: string;
  description: string;
  url: string;
  hostname: string;
  path: string;
  serverIp: string;
  responseSummary: string;
}

export interface PacketJourneyAddressing {
  /** End-to-end IPv4 source. This normally survives router hops. */
  sourceIp: string;
  /** End-to-end IPv4 destination. This normally survives router hops. */
  destinationIp: string;
  /** Source MAC for the one Ethernet hop shown by `macHop`. */
  sourceMac: string;
  /** Destination MAC for the one Ethernet hop shown by `macHop`. */
  destinationMac: string;
  sourcePort: string;
  destinationPort: string;
  macHop: string;
}

export interface PacketNetworkUnits {
  application: string | null;
  transport: string | null;
  network: string | null;
  link: string | null;
}

export interface PacketEncapsulation {
  direction: EncapsulationDirection;
  label: string;
  addedHeaders: string[];
  removedHeaders: string[];
}

export interface PacketJourneyStep {
  id: string;
  index: number;
  phase: PacketJourneyPhase;
  title: string;
  shortLabel: string;
  protocol: string;
  summary: string;
  explanation: string;
  simplification: string | null;
  addressing: PacketJourneyAddressing;
  units: PacketNetworkUnits;
  tcpIpLayer: string;
  osiLayer: string;
  layersTouched: string[];
  encapsulation: PacketEncapsulation;
  activeNodes: PacketJourneyNode[];
  prediction?: PredictionChallenge;
}

export interface PacketJourneyOptions {
  cacheMode?: PacketCacheMode;
  scenarioId?: PacketJourneyScenarioId;
}

export type PacketJourneyOptionsValidation =
  | {
      valid: true;
      options: { cacheMode: PacketCacheMode; scenarioId: PacketJourneyScenarioId };
      error: null;
    }
  | { valid: false; options: null; error: string };

export interface PacketJourneyTrace {
  id: string;
  cacheMode: PacketCacheMode;
  scenario: PacketJourneyScenario;
  steps: PacketJourneyStep[];
  disclaimer: string;
  assumptions: string[];
}

export class PacketJourneyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PacketJourneyInputError';
  }
}

export const PACKET_JOURNEY_DISCLAIMER =
  'Teaching model — deliberately simplified. Real behavior varies by browser, operating system, cache policy, IPv4/IPv6, NAT, routing, HTTP version, and TLS implementation. Every domain and address is reserved or illustrative, and this lab makes no network requests.';

/**
 * RFC 5737 documentation networks and locally administered example MACs.
 * The MACs only identify a single illustrated Ethernet hop; they do not travel
 * end to end through routers.
 */
export const PACKET_JOURNEY_ADDRESSES = {
  clientIp: '192.0.2.10',
  gatewayIp: '192.0.2.1',
  dnsResolverIp: '198.51.100.53',
  clientMac: '02:00:00:00:02:10',
  gatewayLanMac: '02:00:00:00:02:01',
  gatewayWanMac: '02:00:00:00:51:01',
  dnsNextHopMac: '02:00:00:00:51:53',
  serverMac: '02:00:00:00:71:80',
  serverGatewayMac: '02:00:00:00:71:01',
  broadcastMac: 'FF:FF:FF:FF:FF:FF',
  clientHttpsPort: '51514',
  clientDnsPort: '53000'
} as const;

export const PACKET_JOURNEY_SCENARIOS: Record<PacketJourneyScenarioId, PacketJourneyScenario> = {
  'lesson-page': {
    id: 'lesson-page',
    name: 'Interactive lesson',
    description: 'Load a teaching page from a remote HTTPS origin.',
    url: 'https://learn.example/packet-journey',
    hostname: 'learn.example',
    path: '/packet-journey',
    serverIp: '203.0.113.80',
    responseSummary: '200 OK · HTML shell · 18 KB'
  },
  'status-page': {
    id: 'status-page',
    name: 'Status dashboard',
    description: 'Load a small status document from another reserved example origin.',
    url: 'https://status.example/overview',
    hostname: 'status.example',
    path: '/overview',
    serverIp: '203.0.113.81',
    responseSummary: '200 OK · HTML status view · 7 KB'
  }
};

export const PACKET_JOURNEY_PHASE_ORDER: PacketJourneyPhase[] = [
  'browser-cache',
  'dns',
  'arp',
  'lan',
  'router',
  'tcp',
  'tls',
  'http',
  'server-response',
  'render'
];

const notUsed = 'not used — local step';
const pending = 'pending — learned by ARP';

function localAddressing(): PacketJourneyAddressing {
  return {
    sourceIp: notUsed,
    destinationIp: notUsed,
    sourceMac: notUsed,
    destinationMac: notUsed,
    sourcePort: notUsed,
    destinationPort: notUsed,
    macHop: 'Inside the browser; no frame exists'
  };
}

function emptyUnits(application: string | null = null): PacketNetworkUnits {
  return { application, transport: null, network: null, link: null };
}

function localEncapsulation(label: string): PacketEncapsulation {
  return { direction: 'local', label, addedHeaders: [], removedHeaders: [] };
}

function cloneScenario(scenario: PacketJourneyScenario): PacketJourneyScenario {
  return { ...scenario };
}

export function validatePacketJourneyOptions(input: unknown = {}): PacketJourneyOptionsValidation {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return {
      valid: false,
      options: null,
      error: 'Packet journey options must be an object.'
    };
  }

  const candidate = input as Record<string, unknown>;
  const cacheMode = candidate.cacheMode ?? 'cold';
  const scenarioId = candidate.scenarioId ?? 'lesson-page';

  if (cacheMode !== 'cold' && cacheMode !== 'warm') {
    return {
      valid: false,
      options: null,
      error: 'Cache mode must be either “cold” or “warm”.'
    };
  }
  if (scenarioId !== 'lesson-page' && scenarioId !== 'status-page') {
    return {
      valid: false,
      options: null,
      error: 'Choose one of the bounded packet journey scenarios.'
    };
  }

  return { valid: true, options: { cacheMode, scenarioId }, error: null };
}

function prediction(
  id: string,
  prompt: string,
  options: Array<{ id: string; label: string; value: string }>,
  correctAnswer: string,
  explanation: string,
  misconceptionTags: string[]
): PredictionChallenge {
  return {
    id,
    prompt,
    type: 'multiple-choice',
    options,
    correctAnswer,
    explanation,
    misconceptionTags,
    xpReward: 8
  };
}

function buildWarmSteps(scenario: PacketJourneyScenario): PacketJourneyStep[] {
  const steps: Omit<PacketJourneyStep, 'index'>[] = [
    {
      id: 'browser-cache-check',
      phase: 'browser-cache',
      title: 'The browser checks its response cache',
      shortLabel: 'Check cache',
      protocol: 'Browser cache',
      summary: `Look for a reusable response keyed by ${scenario.url}.`,
      explanation:
        'A fresh cached response can satisfy this navigation locally. Cache policy, validators, and private browsing can change the real result.',
      simplification:
        'We model one fresh, complete response. Real pages may reuse some resources while fetching others.',
      addressing: localAddressing(),
      units: emptyUnits(`Cache key: GET ${scenario.url}`),
      tcpIpLayer: 'Application · browser',
      osiLayer: '7 · Application',
      layersTouched: ['Browser cache'],
      encapsulation: localEncapsulation('No network envelope yet'),
      activeNodes: ['browser'],
      prediction: prediction(
        'predict-warm-cache-next',
        'The cached response is still fresh. What should happen next in this model?',
        [
          { id: 'render', label: 'Hand cached bytes to the renderer', value: 'render-cache' },
          { id: 'dns', label: 'Send a DNS query', value: 'dns-query' },
          { id: 'tcp', label: 'Start a TCP handshake', value: 'tcp-handshake' }
        ],
        'render-cache',
        'A fresh complete response avoids DNS, ARP, TCP, TLS, and HTTP network work for this navigation.',
        ['net-cache-always-network']
      )
    },
    {
      id: 'browser-cache-hit',
      phase: 'browser-cache',
      title: 'Fresh cached response found',
      shortLabel: 'Cache hit',
      protocol: 'Browser cache',
      summary: `${scenario.responseSummary} is available without using the network.`,
      explanation:
        'The browser reads the cached response body and metadata. No frame, IP packet, or transport segment is created.',
      simplification: 'Service workers and partial resource caches are outside this focused trace.',
      addressing: localAddressing(),
      units: emptyUnits(`Cached response: ${scenario.responseSummary}`),
      tcpIpLayer: 'Application · browser',
      osiLayer: '7 · Application',
      layersTouched: ['Browser cache'],
      encapsulation: localEncapsulation('Local cache read'),
      activeNodes: ['browser']
    },
    {
      id: 'render-cached-response',
      phase: 'render',
      title: 'Cached bytes reach the renderer',
      shortLabel: 'Render',
      protocol: 'Browser rendering',
      summary: 'Parse the cached HTML and begin constructing the document.',
      explanation:
        'Networking hands off response bytes and metadata; the renderer begins parsing HTML and scheduling any follow-up resource work.',
      simplification:
        'HTML parsing, CSS, JavaScript, layout, and painting are condensed into one handoff.',
      addressing: localAddressing(),
      units: emptyUnits('Decoded cached HTTP response body'),
      tcpIpLayer: 'Application · browser',
      osiLayer: '7 · Application',
      layersTouched: ['Browser cache', 'Renderer'],
      encapsulation: localEncapsulation('Application handoff'),
      activeNodes: ['browser', 'renderer']
    }
  ];

  return steps.map((step, index) => ({ ...step, index }));
}

function buildColdSteps(scenario: PacketJourneyScenario): PacketJourneyStep[] {
  const a = PACKET_JOURNEY_ADDRESSES;
  const clientToDns = (): PacketJourneyAddressing => ({
    sourceIp: a.clientIp,
    destinationIp: a.dnsResolverIp,
    sourceMac: a.clientMac,
    destinationMac: a.gatewayLanMac,
    sourcePort: a.clientDnsPort,
    destinationPort: '53',
    macHop: 'Client → default gateway on the local LAN'
  });
  const clientToServer = (): PacketJourneyAddressing => ({
    sourceIp: a.clientIp,
    destinationIp: scenario.serverIp,
    sourceMac: a.clientMac,
    destinationMac: a.gatewayLanMac,
    sourcePort: a.clientHttpsPort,
    destinationPort: '443',
    macHop: 'Client → default gateway on the local LAN'
  });
  const serverToClientAtLan = (): PacketJourneyAddressing => ({
    sourceIp: scenario.serverIp,
    destinationIp: a.clientIp,
    sourceMac: a.gatewayLanMac,
    destinationMac: a.clientMac,
    sourcePort: '443',
    destinationPort: a.clientHttpsPort,
    macHop: 'Default gateway → client on the final LAN hop'
  });

  const steps: Omit<PacketJourneyStep, 'index'>[] = [
    {
      id: 'browser-cache-check',
      phase: 'browser-cache',
      title: 'The browser checks its response cache',
      shortLabel: 'Check cache',
      protocol: 'Browser cache',
      summary: `Look for a reusable response keyed by ${scenario.url}.`,
      explanation:
        'The browser checks whether a complete response can be reused before asking the network stack for anything.',
      simplification:
        'We model one top-level document cache. A real page can have different cache states per resource.',
      addressing: localAddressing(),
      units: emptyUnits(`Cache key: GET ${scenario.url}`),
      tcpIpLayer: 'Application · browser',
      osiLayer: '7 · Application',
      layersTouched: ['Browser cache'],
      encapsulation: localEncapsulation('No network envelope yet'),
      activeNodes: ['browser']
    },
    {
      id: 'browser-cache-miss',
      phase: 'browser-cache',
      title: 'Cold cache: the document is not reusable',
      shortLabel: 'Cache miss',
      protocol: 'Browser cache',
      summary: 'The browser must locate the origin and create a secure connection.',
      explanation:
        'A cache miss does not itself send a packet. It hands the hostname to name resolution and eventually requests a connection.',
      simplification: 'We skip service-worker interception and proxy caches.',
      addressing: localAddressing(),
      units: emptyUnits(`Navigation intent: GET ${scenario.url}`),
      tcpIpLayer: 'Application · browser',
      osiLayer: '7 · Application',
      layersTouched: ['Browser cache', 'DNS resolver interface'],
      encapsulation: localEncapsulation('Local handoff'),
      activeNodes: ['browser', 'client-stack']
    },
    {
      id: 'dns-query-create',
      phase: 'dns',
      title: 'Build a DNS question',
      shortLabel: 'DNS query',
      protocol: 'DNS over UDP',
      summary: `Ask the configured resolver for an A record for ${scenario.hostname}.`,
      explanation:
        'DNS maps the hostname to an IP address. This simplified case uses one UDP query to a known recursive resolver.',
      simplification:
        'Browser, OS, hosts-file, and resolver caches are collapsed into one cold lookup; retries, CNAMEs, and DNSSEC are omitted.',
      addressing: {
        sourceIp: a.clientIp,
        destinationIp: a.dnsResolverIp,
        sourceMac: a.clientMac,
        destinationMac: pending,
        sourcePort: a.clientDnsPort,
        destinationPort: '53',
        macHop: 'The remote IP is known; the first-hop MAC is not yet known'
      },
      units: {
        application: `DNS question: A ${scenario.hostname}`,
        transport: `UDP datagram ${a.clientDnsPort} → 53`,
        network: `IPv4 packet ${a.clientIp} → ${a.dnsResolverIp}`,
        link: null
      },
      tcpIpLayer: 'Application · DNS',
      osiLayer: '7 · Application',
      layersTouched: ['DNS', 'UDP', 'IPv4'],
      encapsulation: {
        direction: 'encapsulate',
        label: 'DNS data gains UDP and IPv4 headers; Ethernet waits for ARP',
        addedHeaders: ['UDP', 'IPv4'],
        removedHeaders: []
      },
      activeNodes: ['client-stack', 'dns-resolver']
    },
    {
      id: 'gateway-mac-prediction',
      phase: 'arp',
      title: 'Choose the first Ethernet destination',
      shortLabel: 'Predict hop',
      protocol: 'ARP decision',
      summary: `${a.dnsResolverIp} is outside the illustrated client subnet, so the frame needs a local next hop.`,
      explanation:
        'IP chooses the remote endpoint; Ethernet only delivers across the current LAN. A remote destination therefore uses the default gateway’s MAC.',
      simplification:
        'The subnet mask and route-table lookup are summarized as “remote → gateway”.',
      addressing: {
        sourceIp: a.clientIp,
        destinationIp: a.dnsResolverIp,
        sourceMac: a.clientMac,
        destinationMac: pending,
        sourcePort: a.clientDnsPort,
        destinationPort: '53',
        macHop: 'Client must identify the default gateway’s link address'
      },
      units: {
        application: `DNS question: A ${scenario.hostname}`,
        transport: `UDP datagram ${a.clientDnsPort} → 53`,
        network: `IPv4 packet ${a.clientIp} → ${a.dnsResolverIp}`,
        link: null
      },
      tcpIpLayer: 'Network access · next-hop lookup',
      osiLayer: '2 · Data Link (ARP mapping concept)',
      layersTouched: ['IPv4 route choice', 'ARP cache'],
      encapsulation: {
        direction: 'encapsulate',
        label: 'IP packet is ready; link header is waiting for a MAC address',
        addedHeaders: [],
        removedHeaders: []
      },
      activeNodes: ['client-stack', 'router'],
      prediction: prediction(
        'predict-first-hop-mac',
        'Whose MAC address belongs in the DNS query’s first Ethernet frame?',
        [
          { id: 'gateway', label: 'The default gateway', value: 'default-gateway' },
          { id: 'resolver', label: 'The remote DNS resolver', value: 'dns-resolver' },
          { id: 'server', label: 'The web server', value: 'web-server' }
        ],
        'default-gateway',
        'MAC addresses are hop-local. The client sends a remote IP packet to its default gateway’s MAC, not to the remote host’s MAC.',
        ['net-mac-end-to-end', 'net-arp-remote-host']
      )
    },
    {
      id: 'arp-request',
      phase: 'arp',
      title: 'Broadcast: who has the gateway IP?',
      shortLabel: 'ARP request',
      protocol: 'ARP request',
      summary: `Ask every station on this LAN which interface owns ${a.gatewayIp}.`,
      explanation:
        'The ARP request is carried directly inside an Ethernet broadcast frame. It does not use UDP or TCP.',
      simplification:
        'Switch learning, ARP cache timing, and duplicate-address detection are omitted.',
      addressing: {
        sourceIp: a.clientIp,
        destinationIp: a.gatewayIp,
        sourceMac: a.clientMac,
        destinationMac: a.broadcastMac,
        sourcePort: 'not used by ARP',
        destinationPort: 'not used by ARP',
        macHop: 'Client → every station on the local broadcast domain'
      },
      units: {
        application: 'ARP payload: who has 192.0.2.1?',
        transport: null,
        network: null,
        link: `Ethernet broadcast ${a.clientMac} → ${a.broadcastMac}`
      },
      tcpIpLayer: 'Network access · ARP',
      osiLayer: '2 · Data Link (simplified mapping)',
      layersTouched: ['ARP', 'Ethernet'],
      encapsulation: {
        direction: 'encapsulate',
        label: 'ARP payload enters an Ethernet broadcast frame',
        addedHeaders: ['Ethernet'],
        removedHeaders: []
      },
      activeNodes: ['client-stack', 'lan', 'router']
    },
    {
      id: 'arp-reply',
      phase: 'arp',
      title: 'Gateway returns its link address',
      shortLabel: 'ARP reply',
      protocol: 'ARP reply',
      summary: `${a.gatewayIp} answers with ${a.gatewayLanMac}.`,
      explanation:
        'The client stores the IP-to-MAC mapping temporarily. The remote DNS resolver’s MAC is still neither known nor needed.',
      simplification: 'We show a direct unicast reply and one successful cache insertion.',
      addressing: {
        sourceIp: a.gatewayIp,
        destinationIp: a.clientIp,
        sourceMac: a.gatewayLanMac,
        destinationMac: a.clientMac,
        sourcePort: 'not used by ARP',
        destinationPort: 'not used by ARP',
        macHop: 'Default gateway → client on the local LAN'
      },
      units: {
        application: `ARP payload: ${a.gatewayIp} is at ${a.gatewayLanMac}`,
        transport: null,
        network: null,
        link: `Ethernet frame ${a.gatewayLanMac} → ${a.clientMac}`
      },
      tcpIpLayer: 'Network access · ARP',
      osiLayer: '2 · Data Link (simplified mapping)',
      layersTouched: ['Ethernet', 'ARP cache'],
      encapsulation: {
        direction: 'decapsulate',
        label: 'Client removes the Ethernet header and records the ARP mapping',
        addedHeaders: [],
        removedHeaders: ['Ethernet']
      },
      activeNodes: ['router', 'lan', 'client-stack']
    },
    {
      id: 'lan-dns-frame',
      phase: 'lan',
      title: 'The DNS query crosses the LAN',
      shortLabel: 'LAN frame',
      protocol: 'Ethernet · IPv4 · UDP · DNS',
      summary: 'The switch forwards the frame toward the default gateway.',
      explanation:
        'The Ethernet destination is the gateway, while the nested IPv4 destination remains the remote DNS resolver.',
      simplification:
        'The LAN is shown as one switched hop; VLAN tags and Wi-Fi framing are omitted.',
      addressing: clientToDns(),
      units: {
        application: `DNS question: A ${scenario.hostname}`,
        transport: `UDP datagram ${a.clientDnsPort} → 53`,
        network: `IPv4 packet ${a.clientIp} → ${a.dnsResolverIp}`,
        link: `Ethernet frame ${a.clientMac} → ${a.gatewayLanMac}`
      },
      tcpIpLayer: 'Network access · Ethernet',
      osiLayer: '2 · Data Link',
      layersTouched: ['DNS', 'UDP', 'IPv4', 'Ethernet', 'Physical transmission'],
      encapsulation: {
        direction: 'encapsulate',
        label: 'DNS is nested inside UDP, IPv4, then the hop-local Ethernet frame',
        addedHeaders: ['Ethernet'],
        removedHeaders: []
      },
      activeNodes: ['client-stack', 'lan', 'router']
    },
    {
      id: 'router-forwards-dns',
      phase: 'router',
      title: 'The router replaces the link envelope',
      shortLabel: 'Route packet',
      protocol: 'IPv4 forwarding',
      summary:
        'Remove the incoming Ethernet header, choose a route, and add a new next-hop link header.',
      explanation:
        'The router forwards the IPv4 packet toward the resolver. IP endpoints stay the same while MAC addresses change for the next link.',
      simplification:
        'Many routers, route selection, TTL/checksum updates, queues, and possible NAT are condensed into one forwarding step.',
      addressing: {
        sourceIp: a.clientIp,
        destinationIp: a.dnsResolverIp,
        sourceMac: a.gatewayWanMac,
        destinationMac: a.dnsNextHopMac,
        sourcePort: a.clientDnsPort,
        destinationPort: '53',
        macHop: 'Illustrative router egress → next hop toward DNS resolver'
      },
      units: {
        application: `DNS question: A ${scenario.hostname}`,
        transport: `UDP datagram ${a.clientDnsPort} → 53`,
        network: `Forwarded IPv4 packet ${a.clientIp} → ${a.dnsResolverIp}`,
        link: `New Ethernet frame ${a.gatewayWanMac} → ${a.dnsNextHopMac}`
      },
      tcpIpLayer: 'Internet · IPv4',
      osiLayer: '3 · Network',
      layersTouched: ['Ethernet decapsulation', 'IPv4 route lookup', 'Ethernet encapsulation'],
      encapsulation: {
        direction: 'replace-link',
        label: 'Replace only the hop-local frame; keep the end-to-end IP packet',
        addedHeaders: ['New link header'],
        removedHeaders: ['Incoming Ethernet header']
      },
      activeNodes: ['router', 'internet', 'dns-resolver']
    },
    {
      id: 'dns-response',
      phase: 'dns',
      title: 'DNS returns the server address',
      shortLabel: 'DNS answer',
      protocol: 'DNS over UDP',
      summary: `${scenario.hostname} → ${scenario.serverIp}.`,
      explanation:
        'The resolver’s response arrives at the client UDP port. The client can now address the HTTPS origin by IP.',
      simplification:
        'The complete recursive lookup and return route are collapsed into this answer.',
      addressing: {
        sourceIp: a.dnsResolverIp,
        destinationIp: a.clientIp,
        sourceMac: a.gatewayLanMac,
        destinationMac: a.clientMac,
        sourcePort: '53',
        destinationPort: a.clientDnsPort,
        macHop: 'Default gateway → client on the final LAN hop'
      },
      units: {
        application: `DNS answer: ${scenario.hostname} A ${scenario.serverIp}`,
        transport: `UDP datagram 53 → ${a.clientDnsPort}`,
        network: `IPv4 packet ${a.dnsResolverIp} → ${a.clientIp}`,
        link: `Ethernet frame ${a.gatewayLanMac} → ${a.clientMac}`
      },
      tcpIpLayer: 'Application · DNS',
      osiLayer: '7 · Application',
      layersTouched: ['Ethernet', 'IPv4', 'UDP', 'DNS'],
      encapsulation: {
        direction: 'decapsulate',
        label: 'Client removes Ethernet, IPv4, and UDP headers to read the DNS answer',
        addedHeaders: [],
        removedHeaders: ['Ethernet', 'IPv4', 'UDP']
      },
      activeNodes: ['dns-resolver', 'internet', 'router', 'lan', 'client-stack']
    },
    {
      id: 'tcp-syn',
      phase: 'tcp',
      title: 'TCP handshake 1/3: SYN',
      shortLabel: 'TCP SYN',
      protocol: 'TCP',
      summary: `Client port ${a.clientHttpsPort} asks to open a reliable byte stream to port 443.`,
      explanation:
        'The SYN proposes initial TCP state. The browser still has not sent its HTTP request.',
      simplification:
        'Sequence numbers, TCP options, loss, retransmission, and congestion control are omitted.',
      addressing: clientToServer(),
      units: {
        application: null,
        transport: `TCP SYN ${a.clientHttpsPort} → 443`,
        network: `IPv4 packet ${a.clientIp} → ${scenario.serverIp}`,
        link: `Ethernet frame ${a.clientMac} → ${a.gatewayLanMac}`
      },
      tcpIpLayer: 'Transport · TCP',
      osiLayer: '4 · Transport',
      layersTouched: ['TCP', 'IPv4', 'Ethernet'],
      encapsulation: {
        direction: 'encapsulate',
        label: 'TCP control segment enters an IPv4 packet and first-hop frame',
        addedHeaders: ['TCP', 'IPv4', 'Ethernet'],
        removedHeaders: []
      },
      activeNodes: ['client-stack', 'lan', 'router', 'internet', 'web-server']
    },
    {
      id: 'tcp-syn-ack',
      phase: 'tcp',
      title: 'TCP handshake 2/3: SYN-ACK',
      shortLabel: 'SYN-ACK',
      protocol: 'TCP',
      summary: 'The server accepts and acknowledges the connection request.',
      explanation:
        'The SYN-ACK confirms that the server is listening and contributes the server side of the TCP state.',
      simplification: 'The many reverse-path hops are shown only at the final client LAN.',
      addressing: serverToClientAtLan(),
      units: {
        application: null,
        transport: `TCP SYN-ACK 443 → ${a.clientHttpsPort}`,
        network: `IPv4 packet ${scenario.serverIp} → ${a.clientIp}`,
        link: `Ethernet frame ${a.gatewayLanMac} → ${a.clientMac}`
      },
      tcpIpLayer: 'Transport · TCP',
      osiLayer: '4 · Transport',
      layersTouched: ['Ethernet', 'IPv4', 'TCP'],
      encapsulation: {
        direction: 'decapsulate',
        label: 'Client unwraps the final-hop frame and IP packet to process SYN-ACK',
        addedHeaders: [],
        removedHeaders: ['Ethernet', 'IPv4']
      },
      activeNodes: ['web-server', 'internet', 'router', 'lan', 'client-stack']
    },
    {
      id: 'tcp-ack',
      phase: 'tcp',
      title: 'TCP handshake 3/3: ACK',
      shortLabel: 'TCP ACK',
      protocol: 'TCP',
      summary: 'The client acknowledges the server; the TCP connection is established.',
      explanation:
        'A reliable ordered byte stream now exists, but HTTPS still needs a TLS security context before HTTP data.',
      simplification: 'TCP state transitions are summarized as one established connection.',
      addressing: clientToServer(),
      units: {
        application: null,
        transport: `TCP ACK ${a.clientHttpsPort} → 443`,
        network: `IPv4 packet ${a.clientIp} → ${scenario.serverIp}`,
        link: `Ethernet frame ${a.clientMac} → ${a.gatewayLanMac}`
      },
      tcpIpLayer: 'Transport · TCP',
      osiLayer: '4 · Transport',
      layersTouched: ['TCP', 'IPv4', 'Ethernet'],
      encapsulation: {
        direction: 'encapsulate',
        label: 'TCP ACK is carried by IP and a first-hop frame',
        addedHeaders: ['TCP', 'IPv4', 'Ethernet'],
        removedHeaders: []
      },
      activeNodes: ['client-stack', 'lan', 'router', 'internet', 'web-server']
    },
    {
      id: 'tls-client-hello',
      phase: 'tls',
      title: 'TLS starts a protected session',
      shortLabel: 'TLS hello',
      protocol: 'TLS over TCP',
      summary: `ClientHello names ${scenario.hostname} and proposes supported security parameters.`,
      explanation:
        'TLS runs over the established TCP stream. The hostname helps the server choose the right certificate and site.',
      simplification:
        'TLS versions and message flights differ. We teach the goals, not a byte-accurate TLS transcript.',
      addressing: clientToServer(),
      units: {
        application: `TLS ClientHello · server name ${scenario.hostname}`,
        transport: `TCP segment ${a.clientHttpsPort} → 443`,
        network: `IPv4 packet ${a.clientIp} → ${scenario.serverIp}`,
        link: `Ethernet frame ${a.clientMac} → ${a.gatewayLanMac}`
      },
      tcpIpLayer: 'Application · TLS concept',
      osiLayer: '5–7 · Session / Presentation / Application (conceptual)',
      layersTouched: ['TLS', 'TCP', 'IPv4', 'Ethernet'],
      encapsulation: {
        direction: 'encapsulate',
        label: 'TLS handshake bytes ride inside TCP, IP, and each hop’s frame',
        addedHeaders: ['TLS record', 'TCP', 'IPv4', 'Ethernet'],
        removedHeaders: []
      },
      activeNodes: ['client-stack', 'internet', 'web-server']
    },
    {
      id: 'tls-server-finished',
      phase: 'tls',
      title: 'TLS authenticates and derives keys',
      shortLabel: 'TLS ready',
      protocol: 'TLS over TCP',
      summary:
        'The client validates the example certificate conceptually; both sides derive session keys.',
      explanation:
        'After the handshake finishes, HTTP bytes can be encrypted for confidentiality and integrity. Routers forward ciphertext without TLS keys.',
      simplification:
        'Certificate chains, trust stores, signatures, key exchange, alerts, and session resumption are condensed into one conceptual step.',
      addressing: serverToClientAtLan(),
      units: {
        application: 'TLS certificate + handshake messages → shared session keys',
        transport: `TCP segment 443 → ${a.clientHttpsPort}`,
        network: `IPv4 packet ${scenario.serverIp} → ${a.clientIp}`,
        link: `Ethernet frame ${a.gatewayLanMac} → ${a.clientMac}`
      },
      tcpIpLayer: 'Application · TLS concept',
      osiLayer: '5–7 · Session / Presentation / Application (conceptual)',
      layersTouched: ['Ethernet', 'IPv4', 'TCP', 'TLS'],
      encapsulation: {
        direction: 'decapsulate',
        label: 'Client receives TLS handshake bytes and advances the secure-session state',
        addedHeaders: [],
        removedHeaders: ['Ethernet', 'IPv4', 'TCP framing']
      },
      activeNodes: ['web-server', 'internet', 'client-stack']
    },
    {
      id: 'http-request',
      phase: 'http',
      title: 'Send the HTTP request inside TLS',
      shortLabel: 'HTTP request',
      protocol: 'HTTPS (HTTP + TLS + TCP)',
      summary: `GET ${scenario.path} with Host: ${scenario.hostname}.`,
      explanation:
        'The HTTP request is application data. TLS protects it, TCP carries the bytes reliably, IP routes packets, and Ethernet handles each local hop.',
      simplification:
        'We show an HTTP/1.1-style request for readability; HTTP/2 or HTTP/3 would package work differently.',
      addressing: clientToServer(),
      units: {
        application: `Encrypted HTTP: GET ${scenario.path} · Host ${scenario.hostname}`,
        transport: `TCP segment ${a.clientHttpsPort} → 443`,
        network: `IPv4 packet ${a.clientIp} → ${scenario.serverIp}`,
        link: `Ethernet frame ${a.clientMac} → ${a.gatewayLanMac}`
      },
      tcpIpLayer: 'Application · HTTPS',
      osiLayer: '7 · Application (with TLS concept above TCP)',
      layersTouched: ['HTTP', 'TLS', 'TCP', 'IPv4', 'Ethernet'],
      encapsulation: {
        direction: 'encapsulate',
        label: 'HTTP → TLS record → TCP segment → IPv4 packet → Ethernet frame',
        addedHeaders: ['TLS record', 'TCP', 'IPv4', 'Ethernet'],
        removedHeaders: []
      },
      activeNodes: ['browser', 'client-stack', 'lan', 'router', 'internet', 'web-server']
    },
    {
      id: 'server-response',
      phase: 'server-response',
      title: 'The origin creates an HTTP response',
      shortLabel: 'Server response',
      protocol: 'HTTPS response',
      summary: scenario.responseSummary,
      explanation:
        'The server application produces response headers and HTML. TLS encrypts those bytes before TCP sends them back.',
      simplification:
        'Server processing, load balancers, content delivery networks, and multiple TCP segments are represented as one response.',
      addressing: {
        sourceIp: scenario.serverIp,
        destinationIp: a.clientIp,
        sourceMac: a.serverMac,
        destinationMac: a.serverGatewayMac,
        sourcePort: '443',
        destinationPort: a.clientHttpsPort,
        macHop: 'Illustrative web server → its local default gateway'
      },
      units: {
        application: `Encrypted HTTP response: ${scenario.responseSummary}`,
        transport: `TCP segment 443 → ${a.clientHttpsPort}`,
        network: `IPv4 packet ${scenario.serverIp} → ${a.clientIp}`,
        link: `Ethernet frame ${a.serverMac} → ${a.serverGatewayMac}`
      },
      tcpIpLayer: 'Application · HTTPS',
      osiLayer: '7 · Application (with TLS concept above TCP)',
      layersTouched: ['HTTP', 'TLS', 'TCP', 'IPv4', 'Ethernet'],
      encapsulation: {
        direction: 'encapsulate',
        label: 'Response bytes are encrypted and wrapped for the return journey',
        addedHeaders: ['TLS record', 'TCP', 'IPv4', 'Ethernet'],
        removedHeaders: []
      },
      activeNodes: ['web-server', 'internet']
    },
    {
      id: 'response-decapsulation',
      phase: 'server-response',
      title: 'Client unwraps and authenticates the response',
      shortLabel: 'Unwrap response',
      protocol: 'Ethernet → IPv4 → TCP → TLS → HTTP',
      summary: 'Remove hop and transport envelopes, then authenticate and decrypt the TLS record.',
      explanation:
        'Ethernet accepts the final-hop frame, IP selects the host, TCP orders bytes, TLS verifies/decrypts them, and HTTP interprets the response.',
      simplification:
        'Reassembly, acknowledgements, streaming, and incremental parsing are condensed.',
      addressing: serverToClientAtLan(),
      units: {
        application: `Decoded HTTP response: ${scenario.responseSummary}`,
        transport: `TCP byte stream 443 → ${a.clientHttpsPort}`,
        network: `IPv4 packet ${scenario.serverIp} → ${a.clientIp}`,
        link: `Ethernet frame ${a.gatewayLanMac} → ${a.clientMac}`
      },
      tcpIpLayer: 'Network access → Application',
      osiLayer: '2 → 7 · Decapsulation up the stack',
      layersTouched: ['Ethernet', 'IPv4', 'TCP', 'TLS', 'HTTP'],
      encapsulation: {
        direction: 'decapsulate',
        label: 'Ethernet → IPv4 → TCP → TLS → readable HTTP response',
        addedHeaders: [],
        removedHeaders: ['Ethernet', 'IPv4', 'TCP', 'TLS protection']
      },
      activeNodes: ['web-server', 'internet', 'router', 'lan', 'client-stack', 'browser']
    },
    {
      id: 'render-network-response',
      phase: 'render',
      title: 'Networking hands bytes to the renderer',
      shortLabel: 'Render handoff',
      protocol: 'Browser rendering',
      summary: 'The browser begins parsing the decoded HTML response.',
      explanation:
        'The URL-to-response network journey is complete. The renderer can build the document and discover follow-up resources.',
      simplification:
        'HTML parsing, CSS, JavaScript, subresource fetches, layout, and painting are outside this network-focused finish line.',
      addressing: localAddressing(),
      units: emptyUnits(`Decoded response body: ${scenario.responseSummary}`),
      tcpIpLayer: 'Application · browser',
      osiLayer: '7 · Application',
      layersTouched: ['HTTP handoff', 'Renderer'],
      encapsulation: localEncapsulation('Application handoff; no network envelope remains'),
      activeNodes: ['client-stack', 'browser', 'renderer']
    }
  ];

  return steps.map((step, index) => ({ ...step, index }));
}

export function createPacketJourney(options: PacketJourneyOptions = {}): PacketJourneyTrace {
  const validation = validatePacketJourneyOptions(options);
  if (!validation.valid) throw new PacketJourneyInputError(validation.error);

  const { cacheMode, scenarioId } = validation.options;
  const scenario = cloneScenario(PACKET_JOURNEY_SCENARIOS[scenarioId]);
  return {
    id: `packet-journey-${scenarioId}-${cacheMode}`,
    cacheMode,
    scenario,
    steps: cacheMode === 'warm' ? buildWarmSteps(scenario) : buildColdSteps(scenario),
    disclaimer: PACKET_JOURNEY_DISCLAIMER,
    assumptions: [
      'IPv4 is used so the IP-to-MAC handoff can be traced with ARP.',
      'The HTTPS origin is remote, so the client sends Ethernet frames to a default gateway.',
      'DNS uses one UDP exchange and succeeds.',
      'TCP and TLS complete without loss, retry, resumption, or interception.',
      'MAC addresses describe only the illustrated local link and change at routers.'
    ]
  };
}
