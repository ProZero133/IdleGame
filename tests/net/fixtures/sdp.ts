/**
 * SDP de referencia para los tests del codec y de la poda.
 *
 * Reproducen lo que emiten de verdad Chrome y Firefox para una conexion que SOLO lleva un
 * canal de datos (sin audio ni video), con candidatos mDNS `.local` —que es lo que usan
 * los navegadores modernos por privacidad— y un reflexivo obtenido por STUN.
 *
 * El tercero es deliberadamente el PEOR caso: una maquina con WiFi, Ethernet, una VPN y
 * un adaptador virtual de contenedores, que multiplica los candidatos. El presupuesto de
 * tamano (T0.2.5) se mide contra ese, no contra el bonito: si el codigo cupiera solo en el
 * caso comodo, fallaria justo en el ordenador del jugador con mas cacharros instalados.
 */

/** Oferta tipica de Chrome desde un portatil con WiFi y un adaptador virtual. */
export const CHROME_OFFER = [
  'v=0',
  'o=- 8123456789012345678 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS',
  'm=application 55341 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 192.168.1.34',
  'a=candidate:1510613869 1 udp 2113937151 4f3b2a19-7c8d-4e5f-9a0b-1c2d3e4f5a6b.local 55341 typ host generation 0 network-id 1 network-cost 10',
  'a=candidate:2999745851 1 udp 2113939711 9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d.local 61204 typ host generation 0 network-id 2 network-cost 10',
  'a=candidate:842163049 1 udp 1677729535 81.42.13.77 55341 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-id 1 network-cost 10',
  'a=candidate:3172310494 1 tcp 1518222591 4f3b2a19-7c8d-4e5f-9a0b-1c2d3e4f5a6b.local 9 typ host tcptype active generation 0 network-id 1 network-cost 10',
  'a=candidate:1663726794 1 tcp 1518217471 9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d.local 9 typ host tcptype active generation 0 network-id 2 network-cost 10',
  'a=ice-ufrag:Kx9v',
  'a=ice-pwd:8yQ2mZ0pR4tW6uI1oP3aS5dF',
  'a=ice-options:trickle',
  'a=fingerprint:sha-256 6B:8C:1D:2E:3F:40:51:62:73:84:95:A6:B7:C8:D9:EA:FB:0C:1D:2E:3F:40:51:62:73:84:95:A6:B7:C8:D9:EA',
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  'a=max-message-size:262144',
].join('\r\n')

/** Respuesta tipica de Firefox, que ordena y nombra las lineas de otra forma. */
export const FIREFOX_ANSWER = [
  'v=0',
  'o=mozilla...THIS_IS_SDPARTA-99.0 3456789012345678901 0 IN IP4 0.0.0.0',
  's=-',
  't=0 0',
  'a=sendrecv',
  'a=fingerprint:sha-256 A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90:A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90',
  'a=group:BUNDLE 0',
  'a=ice-options:trickle',
  'a=msid-semantic:WMS *',
  'm=application 51234 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 192.168.1.55',
  'a=candidate:0 1 UDP 2122252543 192.168.1.55 51234 typ host',
  'a=candidate:1 1 UDP 1686052863 81.42.99.12 51234 typ srflx raddr 192.168.1.55 rport 51234',
  'a=end-of-candidates',
  'a=ice-pwd:7hG3kL9mN2pQ5rS8tU1vW4xY',
  'a=ice-ufrag:Zt4w',
  'a=mid:0',
  'a=setup:active',
  'a=sctp-port:5000',
  'a=max-message-size:1073741823',
].join('\r\n')

/** Peor caso: WiFi + Ethernet + VPN + adaptador de contenedores + IPv6. */
export const CROWDED_OFFER = [
  'v=0',
  'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS',
  'm=application 49873 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 192.168.1.34',
  'a=candidate:1510613869 1 udp 2113937151 4f3b2a19-7c8d-4e5f-9a0b-1c2d3e4f5a6b.local 49873 typ host generation 0 network-id 1 network-cost 10',
  'a=candidate:2999745851 1 udp 2113939711 9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d.local 61204 typ host generation 0 network-id 2 network-cost 10',
  'a=candidate:1088332248 1 udp 2113932031 b2c3d4e5-6f70-4812-93a4-b5c6d7e8f901.local 58112 typ host generation 0 network-id 3 network-cost 50',
  'a=candidate:3427591028 1 udp 2113929471 c3d4e5f6-7081-4923-a4b5-c6d7e8f90123.local 54277 typ host generation 0 network-id 4 network-cost 50',
  'a=candidate:2018765430 1 udp 2113934591 d4e5f607-8192-4a34-b5c6-d7e8f9012345.local 60021 typ host generation 0 network-id 5 network-cost 10',
  'a=candidate:842163049 1 udp 1677729535 81.42.13.77 49873 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-id 1 network-cost 10',
  'a=candidate:955812337 1 udp 1677724415 81.42.13.77 61204 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-id 2 network-cost 10',
  'a=candidate:3172310494 1 tcp 1518222591 4f3b2a19-7c8d-4e5f-9a0b-1c2d3e4f5a6b.local 9 typ host tcptype active generation 0 network-id 1 network-cost 10',
  'a=candidate:1663726794 1 tcp 1518217471 9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d.local 9 typ host tcptype active generation 0 network-id 2 network-cost 10',
  'a=candidate:2274918365 1 tcp 1518211351 b2c3d4e5-6f70-4812-93a4-b5c6d7e8f901.local 9 typ host tcptype active generation 0 network-id 3 network-cost 50',
  'a=candidate:3891027456 1 tcp 1518206231 c3d4e5f6-7081-4923-a4b5-c6d7e8f90123.local 9 typ host tcptype active generation 0 network-id 4 network-cost 50',
  'a=ice-ufrag:Kx9v',
  'a=ice-pwd:8yQ2mZ0pR4tW6uI1oP3aS5dF',
  'a=ice-options:trickle',
  'a=fingerprint:sha-256 6B:8C:1D:2E:3F:40:51:62:73:84:95:A6:B7:C8:D9:EA:FB:0C:1D:2E:3F:40:51:62:73:84:95:A6:B7:C8:D9:EA',
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  'a=max-message-size:262144',
].join('\r\n')

export const ALL_SDP_FIXTURES: readonly { name: string; sdp: string }[] = [
  { name: 'Chrome (oferta)', sdp: CHROME_OFFER },
  { name: 'Firefox (respuesta)', sdp: FIREFOX_ANSWER },
  { name: 'Peor caso (5 adaptadores)', sdp: CROWDED_OFFER },
]
