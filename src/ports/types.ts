export type Protocol = "tcp" | "udp";

export type PortRecord = {
  id: string;
  serviceName: string;
  port: number;
  protocol: Protocol;
  host: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type PortRecordInput = {
  serviceName: string;
  port: number;
  protocol?: Protocol;
  host?: string;
  description?: string;
};

export type ScanResult = {
  protocol: Protocol;
  host: string;
  port: number;
  processName?: string;
  pid?: number;
  rawAddress?: string;
};

export type RegistryStatus = "active" | "not_running" | "conflict";

export type ScanStatus = "active" | "unregistered";

export type RegistryStatusRow = {
  record: PortRecord;
  status: RegistryStatus;
};

export type ScanStatusRow = {
  result: ScanResult;
  status: ScanStatus;
};

export type PortStoreData = {
  schemaVersion: 1;
  records: PortRecord[];
};
