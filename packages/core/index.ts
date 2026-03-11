// Types
export * from './types/device.types';
export * from './types/protocol.types';
export * from './types/auth.types';
export * from './types/db.types';

// Services
export type { IUdpTransport } from './services/IUdpTransport';
export type { ISqliteRepository } from './services/ISqliteRepository';
export { buildLocalSign } from './services/SignatureBuilder';
export type { LocalSignInput } from './services/SignatureBuilder';
export { buildLocalPacket, parseLocalPacket } from './services/PacketBuilder';
export { LocalGateway } from './services/LocalGateway';
export type { StationConfig } from './services/LocalGateway';
export { DiscoveryService } from './services/DiscoveryService';
export { AuthService } from './services/AuthService';
export { EventListener } from './services/EventListener';
export type { DeviceEvent } from './services/EventListener';
export { SCHEMA_SQL, SEED_ADMIN_SQL } from './services/schema';

// Store
export { useAuthStore } from './store/useAuthStore';

// Hooks
export { usePermission } from './hooks/usePermission';
export type { Permissions } from './hooks/usePermission';

// Screens
export { LoginScreen } from './screens/LoginScreen';

// Components
export { ProtectedRoute } from './components/ProtectedRoute';

// Platform
export {
  detectPlatform,
  registerUdpTransport,
  registerSqliteRepository,
  getUdpTransport,
  getSqliteRepository,
} from './platform';
export type { Platform } from './platform';
