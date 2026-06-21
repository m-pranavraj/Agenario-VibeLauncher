import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Key, Copy, CheckCheck, Trash2, Plus, ExternalLink,
  Webhook, Loader2, ArrowLeft, Shield, Eye, EyeOff,
} from "lucide-react";

export default function SettingsPage() {
  const isLight = useIsLight();
  const queryClient = useQueryClient();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newSecretName, setNewSecretName] = useState("");
  const [justCreatedKey, setJustCreatedKey] = useState<{ key: string; name: string } | null>(null);
  const [justCreatedSecret, setJustCreatedSecret] = useState<{ secret: string; name: string } | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());

  const t = (dark: string, light: string) => isLight ? light : dark;

  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.apiKeys.list(),
  });

  const { data: secretsData, isLoading: secretsLoading } = useQuery({
    queryKey: ["webhook-secrets"],
    queryFn: () => api.webhookSecrets.list(),
  });

  const createKey = useMutation({
    mutationFn: (name: string) => api.apiKeys.create(name),
    onSuccess: (data) => {
      setJustCreatedKey({ key: data.key, name: data.name });
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: number) => api.apiKeys.revoke(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const createSecret = useMutation({
    mutationFn: (name: string) => api.webhookSecrets.create(name),
    onSuccess: (data) => {
      setJustCreatedSecret({ secret: data.secret, name: data.name });
      setNewSecretName("");
      queryClient.invalidateQueries({ queryKey: ["webhook-secrets"] });
    },
  });

  const deleteSecret = useMutation({
    mutationFn: (id: number) => api.webhookSecrets.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhook-secrets"] }),
  });

  const copyToClipboard = async (text: string, type: "key" | "secret", id?: string) => {
    await navigator.clipboard.writeText(text);
    if (type === "key") setCopiedKey(id ?? text);
    else setCopiedSecret(id ?? text);
    setTimeout(() => {
      if (type === "key") setCopiedKey(null);
      else setCopiedSecret(null);
    }, 2000);
  };

  const keys = keysData?.keys ?? [];
  const secrets = secretsData?.secrets ?? [];

  return (
    <div className={`min-h-screen ${isLight ? "bg-white text-gray-900" : "bg-[#0A0A0A] text-white"}`}>
      <nav className={`border-b ${isLight ? "border-gray-100 bg-white/80" : "border-white/5 bg-[#0A0A0A]/80"} backdrop-blur-md`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className={`flex items-center gap-2 ${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/40 hover:text-white"}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className={`w-px h-4 ${isLight ? "bg-gray-200" : "bg-white/[0.1]"}`} />
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Agenario" className="w-6 h-6 rounded-lg object-cover" />
              <span className={`font-bold text-sm font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Agenario</span>
            </Link>
            <span className={`text-sm ${isLight ? "text-gray-500" : "text-white/40"}`}>Settings</span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">

        {/* API Keys Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>API Keys</h2>
              <p className={`text-sm mt-1 ${isLight ? "text-gray-500" : "text-white/40"}`}>Use these keys to authenticate API requests from your CI/CD pipelines, scripts, or integrations.</p>
            </div>
          </div>

          {justCreatedKey && (
            <div className={`rounded-2xl border-2 border-emerald-500/30 p-5 ${isLight ? "bg-emerald-50" : "bg-emerald-500/[0.06]"}`}>
              <p className={`text-sm font-bold mb-2 ${isLight ? "text-emerald-800" : "text-emerald-400"}`}>Key created — copy it now!</p>
              <p className={`text-xs mb-3 ${isLight ? "text-emerald-600" : "text-emerald-400/60"}`}>You won't be able to see this key again.</p>
              <div className="flex items-center gap-2">
                <code className={`flex-1 font-mono text-xs p-3 rounded-xl border break-all ${isLight ? "bg-white border-gray-200 text-gray-700" : "bg-black/40 border-white/5 text-emerald-300"}`}>{justCreatedKey.key}</code>
                <button onClick={() => copyToClipboard(justCreatedKey.key, "key")} className={`flex-shrink-0 p-3 rounded-xl border ${isLight ? "border-gray-200 hover:bg-gray-50" : "border-white/10 hover:bg-white/5"}`}>
                  {copiedKey === justCreatedKey.key ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={() => setJustCreatedKey(null)} className={`text-xs mt-3 underline ${isLight ? "text-gray-500" : "text-white/40"}`}>Dismiss</button>
            </div>
          )}

          <div className={`rounded-2xl border ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/5 border-white/5"}`}>
            <div className="p-5 space-y-4">
              {keysLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : keys.length === 0 ? (
                <p className={`text-sm text-center ${isLight ? "text-gray-400" : "text-white/30"}`}>No API keys yet.</p>
              ) : (
                keys.map((k) => (
                  <div key={k.id} className={`flex items-center justify-between p-3 rounded-xl border ${k.revokedAt ? (isLight ? "bg-red-50 border-red-200" : "bg-red-500/[0.06] border-red-500/20") : (isLight ? "bg-white border-gray-200" : "bg-black/20 border-white/[0.06]")}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Key className={`w-4 h-4 flex-shrink-0 ${k.revokedAt ? "text-red-400" : "text-violet-400"}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isLight ? "text-gray-900" : "text-white"}`}>{k.name}</p>
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          <code className={`font-mono ${isLight ? "text-gray-400" : "text-white/30"}`}>agn_{k.prefix}...</code>
                          <span className={isLight ? "text-gray-300" : "text-white/20"}>·</span>
                          <span className={isLight ? "text-gray-400" : "text-white/30"}>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                          {k.lastUsedAt && (
                            <>
                              <span className={isLight ? "text-gray-300" : "text-white/20"}>·</span>
                              <span className={isLight ? "text-gray-400" : "text-white/30"}>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                            </>
                          )}
                          {k.revokedAt && (
                            <>
                              <span className={isLight ? "text-gray-300" : "text-white/20"}>·</span>
                              <span className="text-red-400">Revoked</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!k.revokedAt && (
                        <button onClick={() => revokeKey.mutate(k.id)} className={`p-2 rounded-lg border transition-colors text-xs ${isLight ? "border-red-200 text-red-500 hover:bg-red-50" : "border-red-500/20 text-red-400 hover:bg-red-500/10"}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className={`border-t p-4 ${isLight ? "border-gray-200" : "border-white/[0.06]"}`}>
              <form onSubmit={(e) => { e.preventDefault(); if (newKeyName.trim()) createKey.mutate(newKeyName.trim()); }} className="flex gap-3">
                <input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. CI/CD Pipeline)"
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none ${isLight ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400" : "bg-[#161616] border-white/10 text-white placeholder-white/20"}`}
                />
                <button type="submit" disabled={!newKeyName.trim() || createKey.isPending} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                  {createKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Key
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Webhook Secrets Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Webhook Secrets</h2>
              <p className={`text-sm mt-1 ${isLight ? "text-gray-500" : "text-white/40"}`}>Use these secrets to authenticate webhook requests sent to your endpoints. Send via the <code className="text-violet-400">X-Webhook-Secret</code> header.</p>
            </div>
          </div>

          {justCreatedSecret && (
            <div className={`rounded-2xl border-2 border-emerald-500/30 p-5 ${isLight ? "bg-emerald-50" : "bg-emerald-500/[0.06]"}`}>
              <p className={`text-sm font-bold mb-2 ${isLight ? "text-emerald-800" : "text-emerald-400"}`}>Secret created — copy it now!</p>
              <p className={`text-xs mb-3 ${isLight ? "text-emerald-600" : "text-emerald-400/60"}`}>You won't be able to see this secret again.</p>
              <div className="flex items-center gap-2">
                <code className={`flex-1 font-mono text-xs p-3 rounded-xl border break-all ${isLight ? "bg-white border-gray-200 text-gray-700" : "bg-black/40 border-white/5 text-emerald-300"}`}>{justCreatedSecret.secret}</code>
                <button onClick={() => copyToClipboard(justCreatedSecret.secret, "secret")} className={`flex-shrink-0 p-3 rounded-xl border ${isLight ? "border-gray-200 hover:bg-gray-50" : "border-white/10 hover:bg-white/5"}`}>
                  {copiedSecret === justCreatedSecret.secret ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={() => setJustCreatedSecret(null)} className={`text-xs mt-3 underline ${isLight ? "text-gray-500" : "text-white/40"}`}>Dismiss</button>
            </div>
          )}

          <div className={`rounded-2xl border ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/5 border-white/5"}`}>
            <div className="p-5 space-y-4">
              {secretsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : secrets.length === 0 ? (
                <p className={`text-sm text-center ${isLight ? "text-gray-400" : "text-white/30"}`}>No webhook secrets yet.</p>
              ) : (
                secrets.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border ${isLight ? "bg-white border-gray-200" : "bg-black/20 border-white/[0.06]"}`}>
                    <div className="flex items-center gap-3">
                      <Webhook className="w-4 h-4 text-violet-400" />
                      <div>
                        <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{s.name}</p>
                        <p className={`text-xs mt-0.5 ${isLight ? "text-gray-400" : "text-white/30"}`}>Created {new Date(s.createdAt).toLocaleDateString()}{s.lastUsedAt ? ` · Last used ${new Date(s.lastUsedAt).toLocaleDateString()}` : ""}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteSecret.mutate(s.id)} className={`p-2 rounded-lg border transition-colors ${isLight ? "border-red-200 text-red-500 hover:bg-red-50" : "border-red-500/20 text-red-400 hover:bg-red-500/10"}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className={`border-t p-4 ${isLight ? "border-gray-200" : "border-white/[0.06]"}`}>
              <form onSubmit={(e) => { e.preventDefault(); if (newSecretName.trim()) createSecret.mutate(newSecretName.trim()); }} className="flex gap-3">
                <input
                  value={newSecretName}
                  onChange={(e) => setNewSecretName(e.target.value)}
                  placeholder="Secret name (e.g. My Webhook)"
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none ${isLight ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400" : "bg-[#161616] border-white/10 text-white placeholder-white/20"}`}
                />
                <button type="submit" disabled={!newSecretName.trim() || createSecret.isPending} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                  {createSecret.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Secret
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Integration Examples */}
        <section className={`rounded-2xl border p-6 space-y-4 ${isLight ? "bg-pink-50/50 border-gray-200" : "bg-white/5 border-white/5"}`}>
          <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Using Your API Key</h3>
          <div className={`rounded-xl p-4 border font-mono text-xs leading-relaxed ${isLight ? "bg-white border-gray-200" : "bg-black/40 border-white/[0.06]"}`}>
            <div className={`mb-3 font-semibold ${isLight ? "text-gray-700" : "text-white/50"}`}>curl</div>
            <pre className={`text-xs leading-relaxed whitespace-pre-wrap ${isLight ? "text-gray-600" : "text-white/55"}`}>{'curl -X POST https://api.agenario.tech/api/scans \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"sourceType":"github","sourceInput":"github.com/user/repo"}\''}</pre>
          </div>
          <div className={`rounded-xl p-4 border font-mono text-xs leading-relaxed ${isLight ? "bg-white border-gray-200" : "bg-black/40 border-white/[0.06]"}`}>
            <div className={`mb-3 font-semibold ${isLight ? "text-gray-700" : "text-white/50"}`}>Webhook Secret</div>
            <pre className={`text-xs leading-relaxed whitespace-pre-wrap ${isLight ? "text-gray-600" : "text-white/55"}`}>{'curl -X POST https://api.agenario.tech/api/github/webhook \\\n  -H "X-Webhook-Secret: YOUR_SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"action":"opened","pull_request":{...}}\''}</pre>
          </div>
        </section>

      </main>
    </div>
  );
}
