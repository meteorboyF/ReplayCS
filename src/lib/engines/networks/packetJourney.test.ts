import { describe, expect, it } from 'vitest';
import {
  PACKET_JOURNEY_ADDRESSES,
  PACKET_JOURNEY_PHASE_ORDER,
  PacketJourneyInputError,
  createPacketJourney,
  validatePacketJourneyOptions,
  type PacketJourneyPhase
} from './packetJourney';

const coldStepOrder = [
  'browser-cache-check',
  'browser-cache-miss',
  'dns-query-create',
  'gateway-mac-prediction',
  'arp-request',
  'arp-reply',
  'lan-dns-frame',
  'router-forwards-dns',
  'dns-response',
  'tcp-syn',
  'tcp-syn-ack',
  'tcp-ack',
  'tls-client-hello',
  'tls-server-finished',
  'http-request',
  'server-response',
  'response-decapsulation',
  'render-network-response'
];

function firstOccurrenceOrder(phases: PacketJourneyPhase[]): PacketJourneyPhase[] {
  return phases.filter((phase, index) => phases.indexOf(phase) === index);
}

describe('cold URL-to-render packet journey', () => {
  it('covers every required phase in deterministic teaching order', () => {
    const trace = createPacketJourney();

    expect(trace.steps.map((step) => step.id)).toEqual(coldStepOrder);
    expect(trace.steps.map((step) => step.index)).toEqual(trace.steps.map((_, index) => index));
    expect(firstOccurrenceOrder(trace.steps.map((step) => step.phase))).toEqual(
      PACKET_JOURNEY_PHASE_ORDER
    );
  });

  it('keeps end-to-end IPs distinct from hop-local MAC addresses', () => {
    const trace = createPacketJourney();
    const dnsOnLan = trace.steps.find((step) => step.id === 'lan-dns-frame');
    const dnsAtRouter = trace.steps.find((step) => step.id === 'router-forwards-dns');
    const tcpSyn = trace.steps.find((step) => step.id === 'tcp-syn');
    const inbound = trace.steps.find((step) => step.id === 'response-decapsulation');

    expect(dnsOnLan?.addressing).toMatchObject({
      sourceIp: PACKET_JOURNEY_ADDRESSES.clientIp,
      destinationIp: PACKET_JOURNEY_ADDRESSES.dnsResolverIp,
      sourceMac: PACKET_JOURNEY_ADDRESSES.clientMac,
      destinationMac: PACKET_JOURNEY_ADDRESSES.gatewayLanMac,
      sourcePort: PACKET_JOURNEY_ADDRESSES.clientDnsPort,
      destinationPort: '53'
    });
    expect(dnsAtRouter?.addressing).toMatchObject({
      sourceIp: PACKET_JOURNEY_ADDRESSES.clientIp,
      destinationIp: PACKET_JOURNEY_ADDRESSES.dnsResolverIp,
      sourceMac: PACKET_JOURNEY_ADDRESSES.gatewayWanMac,
      destinationMac: PACKET_JOURNEY_ADDRESSES.dnsNextHopMac
    });
    expect(tcpSyn?.addressing).toMatchObject({
      sourceIp: PACKET_JOURNEY_ADDRESSES.clientIp,
      destinationIp: '203.0.113.80',
      sourcePort: PACKET_JOURNEY_ADDRESSES.clientHttpsPort,
      destinationPort: '443',
      destinationMac: PACKET_JOURNEY_ADDRESSES.gatewayLanMac
    });
    expect(inbound?.addressing).toMatchObject({
      sourceIp: '203.0.113.80',
      destinationIp: PACKET_JOURNEY_ADDRESSES.clientIp,
      sourceMac: PACKET_JOURNEY_ADDRESSES.gatewayLanMac,
      destinationMac: PACKET_JOURNEY_ADDRESSES.clientMac
    });
  });

  it('uses only reserved documentation IPv4 ranges and locally administered example MACs', () => {
    const trace = createPacketJourney();
    const ipv4Pattern = /^\d{1,3}(?:\.\d{1,3}){3}$/;
    const usedIps = trace.steps.flatMap((step) => [
      step.addressing.sourceIp,
      step.addressing.destinationIp
    ]);
    const usedMacs = trace.steps.flatMap((step) => [
      step.addressing.sourceMac,
      step.addressing.destinationMac
    ]);

    expect(usedIps.filter((value) => ipv4Pattern.test(value))).toSatisfy((values: string[]) =>
      values.every(
        (value) =>
          value.startsWith('192.0.2.') ||
          value.startsWith('198.51.100.') ||
          value.startsWith('203.0.113.')
      )
    );
    expect(
      usedMacs
        .filter((value) => /^[0-9A-F]{2}(?::[0-9A-F]{2}){5}$/i.test(value))
        .every(
          (value) => value === PACKET_JOURNEY_ADDRESSES.broadcastMac || value.startsWith('02:')
        )
    ).toBe(true);
    expect(trace.scenario.url.endsWith('.example/packet-journey')).toBe(true);
  });

  it('shows encapsulation, router frame replacement, and response decapsulation', () => {
    const trace = createPacketJourney();
    const request = trace.steps.find((step) => step.id === 'http-request');
    const router = trace.steps.find((step) => step.id === 'router-forwards-dns');
    const response = trace.steps.find((step) => step.id === 'response-decapsulation');

    expect(request?.encapsulation).toMatchObject({
      direction: 'encapsulate',
      addedHeaders: ['TLS record', 'TCP', 'IPv4', 'Ethernet']
    });
    expect(request?.units).toMatchObject({
      application: expect.stringContaining('GET'),
      transport: expect.stringContaining('TCP'),
      network: expect.stringContaining('IPv4'),
      link: expect.stringContaining('Ethernet')
    });
    expect(router?.encapsulation).toMatchObject({
      direction: 'replace-link',
      removedHeaders: ['Incoming Ethernet header'],
      addedHeaders: ['New link header']
    });
    expect(response?.encapsulation).toMatchObject({
      direction: 'decapsulate',
      removedHeaders: ['Ethernet', 'IPv4', 'TCP', 'TLS protection']
    });
    expect(response?.layersTouched).toEqual(['Ethernet', 'IPv4', 'TCP', 'TLS', 'HTTP']);
  });

  it('contains one prediction checkpoint with the first-hop misconception taxonomy', () => {
    const predictions = createPacketJourney().steps.flatMap((step) =>
      step.prediction ? [step.prediction] : []
    );

    expect(predictions).toHaveLength(1);
    expect(predictions[0]).toMatchObject({
      id: 'predict-first-hop-mac',
      correctAnswer: 'default-gateway',
      misconceptionTags: ['net-mac-end-to-end', 'net-arp-remote-host']
    });
    expect(predictions[0].options).toHaveLength(3);
  });
});

describe('cache and scenario variations', () => {
  it('short-circuits all network protocols for a warm browser cache', () => {
    const warm = createPacketJourney({ cacheMode: 'warm' });

    expect(warm.steps.map((step) => step.id)).toEqual([
      'browser-cache-check',
      'browser-cache-hit',
      'render-cached-response'
    ]);
    expect(warm.steps.map((step) => step.phase)).toEqual([
      'browser-cache',
      'browser-cache',
      'render'
    ]);
    expect(
      warm.steps.every(
        (step) =>
          step.units.transport === null && step.units.network === null && step.units.link === null
      )
    ).toBe(true);
    expect(warm.steps[0].prediction?.correctAnswer).toBe('render-cache');
  });

  it('substitutes a bounded scenario without changing the teaching sequence', () => {
    const lesson = createPacketJourney({ scenarioId: 'lesson-page' });
    const status = createPacketJourney({ scenarioId: 'status-page' });

    expect(status.scenario).toMatchObject({
      url: 'https://status.example/overview',
      serverIp: '203.0.113.81'
    });
    expect(status.steps.map((step) => step.id)).toEqual(lesson.steps.map((step) => step.id));
    expect(status.steps.find((step) => step.id === 'dns-response')?.summary).toContain(
      '203.0.113.81'
    );
    expect(status.steps.find((step) => step.id === 'http-request')?.summary).toContain('/overview');
  });

  it.each([
    { cacheMode: 'cold' as const, scenarioId: 'lesson-page' as const },
    { cacheMode: 'cold' as const, scenarioId: 'status-page' as const },
    { cacheMode: 'warm' as const, scenarioId: 'lesson-page' as const },
    { cacheMode: 'warm' as const, scenarioId: 'status-page' as const }
  ])('produces byte-for-byte deterministic snapshots for $cacheMode / $scenarioId', (options) => {
    expect(JSON.stringify(createPacketJourney(options))).toBe(
      JSON.stringify(createPacketJourney(options))
    );
  });
});

describe('packet journey validation', () => {
  it('applies deterministic defaults', () => {
    expect(validatePacketJourneyOptions()).toEqual({
      valid: true,
      options: { cacheMode: 'cold', scenarioId: 'lesson-page' },
      error: null
    });
  });

  it.each([
    [null, 'must be an object'],
    [[], 'must be an object'],
    [{ cacheMode: 'sometimes' }, 'either “cold” or “warm”'],
    [{ scenarioId: 'live-web' }, 'bounded packet journey scenarios']
  ])('rejects invalid bounded options %#', (input, message) => {
    const result = validatePacketJourneyOptions(input);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain(message);
  });

  it('throws a typed error before building an unsupported journey', () => {
    expect(() => createPacketJourney({ cacheMode: 'sometimes' as 'cold' })).toThrowError(
      PacketJourneyInputError
    );
  });
});
