import { describe, expect, it } from "vitest";
import { parseSsOutput } from "@/src/scan/parse-ss";

describe("parseSsOutput", () => {
  it("parses tcp, udp, ipv4, ipv6, wildcard, and process metadata", () => {
    const output = `
Netid State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess
tcp   LISTEN 0      511          0.0.0.0:3000      0.0.0.0:*    users:(("node",pid=123,fd=18))
tcp   LISTEN 0      128             [::]:5432         [::]:*    users:(("postgres",pid=456,fd=9))
udp   UNCONN 0      0                  *:5353             *:*
malformed row
`;
    expect(parseSsOutput(output)).toEqual([
      {
        protocol: "tcp",
        host: "0.0.0.0",
        port: 3000,
        processName: "node",
        pid: 123,
        rawAddress: "0.0.0.0:3000"
      },
      {
        protocol: "tcp",
        host: "::",
        port: 5432,
        processName: "postgres",
        pid: 456,
        rawAddress: "[::]:5432"
      },
      {
        protocol: "udp",
        host: "*",
        port: 5353,
        rawAddress: "*:5353"
      }
    ]);
  });
});
