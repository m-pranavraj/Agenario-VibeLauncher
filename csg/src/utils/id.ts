import { uniqueId } from './hash.js';

export function astNodeId(): string { return uniqueId('ast'); }
export function cfgBlockId(): string { return uniqueId('cfg'); }
export function callSiteId(): string { return uniqueId('call'); }
export function funcScopeId(): string { return uniqueId('fn'); }
export function edgeId(): string { return uniqueId('edge'); }
export function routeEndpointId(): string { return uniqueId('route'); }
