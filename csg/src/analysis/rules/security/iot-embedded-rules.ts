import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class HardcodedDeviceCredentialsRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-IOT-001', name: 'Hardcoded Device Credentials', description: 'Detects hardcoded device/SSH credentials in firmware', category: 'security-crypto', severity: 'critical', cwe: 'CWE-798', techniqueNumber: 209, pillar: 1, tags: ['iot', 'credentials', 'firmware'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /(password|passwd|pwd|secret)\s*[=:]\s*['\"][a-zA-Z0-9!@#$%^&*]{4,}['\"]/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Hardcoded device credentials', message: `Potential hardcoded credentials "${s.value.slice(0, 30)}..." — device can be compromised if firmware extracted`, file: s.file, line: s.line, confidence: 90, remediation: 'Use hardware-backed secure element or unique per-device certificates provisioned at manufacturing' });
    }
  }
}

export class InsecureFirmwareUpdateRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-IOT-002', name: 'Insecure Firmware Update Mechanism', description: 'Detects firmware updates over unencrypted channels', category: 'security-networking', severity: 'high', cwe: 'CWE-319', techniqueNumber: 210, pillar: 1, tags: ['firmware', 'update', 'ota'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasOTA = findStringLiterals(ctx.parsed, s => /firmware|ota|update/i.test(s) && !s.includes('https'));
    const hasEncryption = findStringLiterals(ctx.parsed, s => /https|tls|signature.*verify|checksum|hash.*verify/i.test(s));
    if (hasOTA.length > 0 && hasEncryption.length === 0) {
      this.emit(ctx, { title: 'Firmware update over unencrypted channel', message: 'Firmware/OTA update mechanism detected without HTTPS, TLS, or signature verification — attackers can inject malicious firmware', file: '', line: 1, confidence: 88, remediation: 'Serve firmware updates over HTTPS with code signing and signature verification' });
    }
  }
}

export class InsecureMQTTRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-IOT-003', name: 'Insecure MQTT Configuration', description: 'Detects MQTT without TLS or authentication', category: 'security-networking', severity: 'high', cwe: 'CWE-319', techniqueNumber: 211, pillar: 1, tags: ['mqtt', 'iot', 'tls'] };
  async execute(ctx: RuleContext): Promise<void> {
    const mqttCalls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('mqtt') || c.fullName.includes('MQTT') || c.fullName.includes('mqtt.connect'));
    const hasTLS = findStringLiterals(ctx.parsed, s => /mqtts|tls|cert|certificate|password.*mqtt|username.*mqtt/i.test(s));
    if (mqttCalls.length > 0 && hasTLS.length === 0) {
      this.emit(ctx, { title: 'MQTT connection without TLS/authentication', message: 'MQTT broker connection without TLS or credentials — attackers can eavesdrop or publish commands', file: '', line: 1, confidence: 90, remediation: 'Use mqtts:// with TLS certificate validation and username/password authentication' });
    }
  }
}

export class InsecureBluetoothConfigRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-IOT-004', name: 'Insecure Bluetooth Configuration', description: 'Detects Bluetooth in just-works mode (MITM vulnerable)', category: 'security-networking', severity: 'high', cwe: 'CWE-300', techniqueNumber: 212, pillar: 1, tags: ['bluetooth', 'ble', 'iot'] };
  async execute(ctx: RuleContext): Promise<void> {
    const bleCalls = findStringLiterals(ctx.parsed, s => /bluetooth|BLE|bluez|noble|bleno|gatttool/i.test(s));
    const hasMITM = findStringLiterals(ctx.parsed, s => /mitm|bond|pairing|passkey|just.?work/i.test(s));
    if (bleCalls.length > 0 && hasMITM.length === 0) {
      this.emit(ctx, { title: 'Bluetooth LE without MITM protection', message: 'Bluetooth LE usage detected — if using just-works pairing, communication is vulnerable to MITM', file: '', line: 1, confidence: 65, remediation: 'Use LE Secure Connections with passkey entry or numeric comparison for pairing' });
    }
  }
}

export class MissingDeviceIdentityRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-IOT-005', name: 'Missing Device Identity/Authentication', description: 'Detects IoT devices without unique identity', category: 'security-crypto', severity: 'high', cwe: 'CWE-287', techniqueNumber: 213, pillar: 1, tags: ['device-id', 'authentication', 'iot'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasDeviceID = findStringLiterals(ctx.parsed, s => /deviceId|device_id|serial|UUID|chipId|macAddr/i.test(s));
    const hasCloud = findStringLiterals(ctx.parsed, s => /cloud|api\.|backend|server|http/i.test(s));
    if (hasCloud.length > 0 && hasDeviceID.length === 0) {
      this.emit(ctx, { title: 'No unique device identity for cloud authentication', message: 'Application contacts cloud services without unique device identity — no way to authenticate or revoke specific devices', file: '', line: 1, confidence: 75, remediation: 'Provision unique device certificates or keys during manufacturing for cloud authentication' });
    }
  }
}

export class InsecureCoAPRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-IOT-006', name: 'CoAP Without DTLS', description: 'Detects CoAP protocol usage without DTLS encryption', category: 'security-networking', severity: 'high', cwe: 'CWE-319', techniqueNumber: 214, pillar: 1, tags: ['coap', 'dtls', 'iot'] };
  async execute(ctx: RuleContext): Promise<void> {
    const coapCalls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('coap') || c.fullName.includes('CoAP'));
    const hasDTLS = findStringLiterals(ctx.parsed, s => /dtls|coaps|psk|certificate.*coap/i.test(s));
    if (coapCalls.length > 0 && hasDTLS.length === 0) {
      this.emit(ctx, { title: 'CoAP protocol without DTLS encryption', message: 'CoAP protocol usage detected without DTLS — all sensor/actuator data transmitted in cleartext', file: '', line: 1, confidence: 85, remediation: 'Use coaps:// with DTLS and either PSK or certificate-based authentication' });
    }
  }
}

export class OTAUpdateNoRollbackRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-IOT-007', name: 'No Firmware Rollback Protection', description: 'Detects missing rollback protection in OTA updates', category: 'security-networking', severity: 'medium', cwe: 'CWE-1268', techniqueNumber: 215, pillar: 1, tags: ['ota', 'rollback', 'firmware'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasOTA = findStringLiterals(ctx.parsed, s => /ota|firmware.*update|bootloader/i.test(s));
    const hasRollback = findStringLiterals(ctx.parsed, s => /rollback|version.*check|minVersion|antirollback|anti-rollback/i.test(s));
    if (hasOTA.length > 0 && hasRollback.length === 0) {
      this.emit(ctx, { title: 'No firmware rollback protection', message: 'OTA update mechanism without version rollback protection — attacker can downgrade to vulnerable firmware', file: '', line: 1, confidence: 72, remediation: 'Implement version checking in bootloader and prevent rollback to versions with known vulnerabilities' });
    }
  }
}

export class SideChannelTimingRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-IOT-008', name: 'Side-Channel Timing Attack Surface', description: 'Detects variable-time crypto comparisons in firmware', category: 'security-crypto', severity: 'medium', cwe: 'CWE-385', techniqueNumber: 216, pillar: 1, tags: ['timing', 'side-channel', 'crypto'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasTimingSafe = findFunctionCalls(ctx.parsed, c => c.fullName.includes('timingSafe') || c.fullName.includes('constantTime') || c.fullName.includes('hash_equals'));
    const hasComparisons = findStringLiterals(ctx.parsed, s => /===|\s==\s|\.equals\(|\.compare/i.test(s) && (s.includes('password') || s.includes('token') || s.includes('secret') || s.includes('key') || s.includes('hash')));
    if (hasComparisons.length > 0 && hasTimingSafe.length === 0) {
      this.emit(ctx, { title: 'Timing side-channel in sensitive comparison', message: 'Sensitive value comparisons without constant-time function — attacker can derive secrets via timing', file: '', line: 1, confidence: 60, remediation: 'Use crypto.timingSafeEqual() or similar constant-time comparison for all sensitive values' });
    }
  }
}
