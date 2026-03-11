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
export { useStationStore } from './store/useStationStore';
export { useGroupStore } from './store/useGroupStore';

// Hooks
export { usePermission } from './hooks/usePermission';
export type { Permissions } from './hooks/usePermission';
export { useDiscovery } from './hooks/useDiscovery';
export { useGateway } from './hooks/useGateway';

// Layout
export { AppLayout } from './layout/AppLayout';
export { Sidebar } from './layout/Sidebar';

// Screens
export { LoginScreen } from './screens/LoginScreen';
export { DashboardScreen } from './screens/DashboardScreen';
export { GroupScreen } from './screens/GroupScreen';
export { GroupSettingsScreen } from './screens/GroupSettingsScreen';

// Modals
export { GroupModal } from './modals/GroupModal';
export type { GroupModalMode } from './modals/GroupModal';

// Components
export { ProtectedRoute } from './components/ProtectedRoute';
export { AppInitializer } from './components/AppInitializer';

// Platform
export {
  detectPlatform,
  registerUdpTransport,
  registerSqliteRepository,
  getUdpTransport,
  getSqliteRepository,
} from './platform';
export type { Platform } from './platform';
