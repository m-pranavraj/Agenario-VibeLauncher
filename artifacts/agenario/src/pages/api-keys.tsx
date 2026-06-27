import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useIsLight } from "@/hooks/use-is-light";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Key, Copy, CheckCheck, Trash2, Plus, Loader2, Fingerprint, Info
} from "lucide-react";

export default function ApiKeysPage() {
  const isLight = useIsLight();
  const queryClient = useQueryClient();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [justCreatedKey, setJustCreatedKey] = useState<{ key: string; name: string } | null>(null);

  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.apiKeys.list(),
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

  const copyToClipboard = async (text: string, id?: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id ?? text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const keys = keysData?.keys ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">

        <div>
          <h1 className={`text-2xl md:text-3xl font-extrabold font-heading tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            API Keys
          </h1>
          <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Authenticate API requests from CI/CD pipelines, scripts, and external integrations.
          </p>
        </div>

        {/* Created Key Banner */}
        {justCreatedKey && (
          <div className={`rounded-2xl border-2 border-emerald-500/30 p-5 ${isLight ? "bg-emerald-50" : "bg-emerald-500/[0.06]"}`}>
            <p className={`text-sm font-bold mb-1 ${isLight ? "text-emerald-800" : "text-emerald-400"}`}>
              Key created — copy it now!
            </p>
            <p className={`text-xs mb-3 ${isLight ? "text-emerald-600" : "text-emerald-400/60"}`}>
              This key will not be shown again for security reasons.
            </p>
            <div className="flex items-center gap-2">
              <code className={`flex-1 font-mono text-xs p-3 rounded-xl border break-all ${isLight ? "bg-white border-gray-200 text-gray-700" : "bg-black/40 border-white/5 text-emerald-300"}`}>
                {justCreatedKey.key}
              </code>
              <button
                onClick={() => copyToClipboard(justCreatedKey.key)}
                className={`flex-shrink-0 p-3 rounded-xl border transition-colors ${isLight ? "border-gray-200 hover:bg-gray-50" : "border-white/10 hover:bg-white/5"}`}
              >
                {copiedKey === justCreatedKey.key
                  ? <CheckCheck className="w-4 h-4 text-green-400" />
                  : <Copy className={`w-4 h-4 ${isLight ? "text-gray-500" : "text-white/50"}`} />
                }
              </button>
            </div>
            <button
              onClick={() => setJustCreatedKey(null)}
              className={`text-xs mt-3 underline ${isLight ? "text-gray-500" : "text-white/40"}`}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Keys List */}
        <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
          <div className={`px-5 py-4 border-b flex items-center gap-3 ${isLight ? "border-slate-200 bg-slate-50/50" : "border-white/10"}`}>
            <Fingerprint className={`w-4 h-4 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
            <h2 className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Your API Keys
              <span className={`ml-2 text-xs font-normal ${isLight ? "text-slate-500" : "text-white/40"}`}>
                ({keys.filter(k => !k.revokedAt).length} active)
              </span>
            </h2>
          </div>

          <div className="p-5 space-y-3">
            {keysLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className={`w-5 h-5 animate-spin ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
              </div>
            ) : keys.length === 0 ? (
              <div className="text-center py-8">
                <Key className={`w-10 h-10 mx-auto mb-3 ${isLight ? "text-slate-200" : "text-white/10"}`} />
                <p className={`text-sm ${isLight ? "text-slate-400" : "text-white/30"}`}>No API keys yet. Create one below.</p>
              </div>
            ) : (
              keys.map((k) => (
                <div
                  key={k.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    k.revokedAt
                      ? isLight ? "bg-red-50 border-red-200" : "bg-red-500/[0.06] border-red-500/20"
                      : isLight ? "bg-slate-50 border-slate-200 hover:bg-white" : "bg-black/20 border-white/[0.06] hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.revokedAt ? (isLight ? "bg-red-100" : "bg-red-500/10") : (isLight ? "bg-indigo-100" : "bg-indigo-500/10")}`}>
                      <Key className={`w-4 h-4 ${k.revokedAt ? "text-red-500" : (isLight ? "text-indigo-600" : "text-indigo-400")}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isLight ? "text-slate-900" : "text-white"} ${k.revokedAt ? "line-through opacity-50" : ""}`}>
                        {k.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap">
                        <code className={`font-mono ${isLight ? "text-slate-400" : "text-white/30"}`}>agn_{k.prefix}•••</code>
                        <span className={isLight ? "text-slate-300" : "text-white/20"}>·</span>
                        <span className={isLight ? "text-slate-400" : "text-white/30"}>
                          Created {new Date(k.createdAt).toLocaleDateString()}
                        </span>
                        {k.lastUsedAt && (
                          <>
                            <span className={isLight ? "text-slate-300" : "text-white/20"}>·</span>
                            <span className={isLight ? "text-slate-400" : "text-white/30"}>
                              Last used {new Date(k.lastUsedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                        {k.revokedAt && (
                          <span className="text-red-500 font-semibold">Revoked</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!k.revokedAt && (
                    <button
                      onClick={() => revokeKey.mutate(k.id)}
                      disabled={revokeKey.isPending}
                      className={`p-2 rounded-lg border transition-colors flex-shrink-0 ${isLight ? "border-red-200 text-red-500 hover:bg-red-50" : "border-red-500/20 text-red-400 hover:bg-red-500/10"}`}
                      title="Revoke key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Create new key */}
          <div className={`border-t p-5 ${isLight ? "border-slate-200 bg-slate-50/50" : "border-white/10"}`}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newKeyName.trim()) createKey.mutate(newKeyName.trim());
              }}
              className="flex gap-3"
            >
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. CI/CD Pipeline, Staging Server)"
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500/20 ${isLight ? "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-300" : "bg-[#161616] border-white/10 text-white placeholder-white/20 focus:border-indigo-500/40"}`}
              />
              <button
                type="submit"
                disabled={!newKeyName.trim() || createKey.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {createKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Key
              </button>
            </form>
          </div>
        </div>

        {/* Usage example */}
        <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
          <div className={`px-5 py-4 border-b ${isLight ? "border-slate-200 bg-slate-50/50" : "border-white/10"}`}>
            <h2 className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Usage Example</h2>
          </div>
          <div className={`p-5 font-mono text-xs leading-relaxed ${isLight ? "bg-slate-50 text-slate-700" : "bg-black/40 text-green-300"}`}>
            <pre className="whitespace-pre-wrap">{`curl -X POST https://api.agenario.tech/api/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"sourceType":"github","sourceInput":"github.com/user/repo"}'`}</pre>
          </div>
        </div>

        <div className={`flex items-start gap-3 p-4 rounded-xl border ${isLight ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-blue-500/10 border-blue-500/20 text-blue-300"}`}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            API keys are scoped to your account and inherit your plan's scan quota. Revoked keys are immediately invalidated. Never commit API keys to source control — use environment variables or secrets managers instead.
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}
