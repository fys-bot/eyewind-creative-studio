import { CapabilityResolver } from './resolver';

// Export a singleton instance
// In a real app, this might get config from environment variables
export const capabilityResolver = new CapabilityResolver();
