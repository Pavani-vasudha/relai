import { useState } from "react";
import { useListPrompts, useCreatePrompt, useDeletePrompt, useActivatePrompt, getListPromptsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Pencil, RotateCcw, Trash2, Check, X, Clock, Image, FileText, Mic, Video, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Prompt = {
  id: number;
  modality: string;
  version: string;
  prompt: string;
  isActive: boolean;
  createdAt: string | Date;
};

const MODALITIES = [
  { key: "image", label: "Image", icon: Image },
  { key: "text",  label: "Text",  icon: FileText },
  { key: "audio", label: "Audio", icon: Mic },
  { key: "video", label: "Video", icon: Video },
] as const;

function ModalityPanel({ modality, prompts }: { modality: typeof MODALITIES[number]; prompts: Prompt[] }) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createPrompt  = useCreatePrompt();
  const deletePrompt  = useDeletePrompt();
  const activatePrompt = useActivatePrompt();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListPromptsQueryKey() });

  const active   = prompts.find(p => p.isActive);
  const history  = prompts.filter(p => !p.isActive).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const startEdit = () => {
    setDraftText(active?.prompt ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    if (!draftText.trim() || draftText.trim() === active?.prompt) {
      setEditing(false);
      return;
    }
    const nextVersion = bumpVersion(active?.version ?? "v1.0");
    createPrompt.mutate(
      { data: { modality: modality.key, version: nextVersion, prompt: draftText.trim(), isActive: true } },
      {
        onSuccess: () => {
          toast({ title: "New version saved and activated" });
          setEditing(false);
          invalidate();
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  };

  const handleRestore = (p: Prompt) => {
    activatePrompt.mutate({ params: { id: p.id } }, {
      onSuccess: () => { toast({ title: `${p.version} restored as active` }); invalidate(); },
    });
  };

  const handleDelete = (p: Prompt) => {
    if (!confirm(`Delete version ${p.version}?`)) return;
    deletePrompt.mutate({ params: { id: p.id } }, {
      onSuccess: () => { toast({ title: "Version deleted" }); invalidate(); },
    });
  };

  const handleCreate = () => {
    if (!newDraft.trim()) return;
    const nextVersion = bumpVersion(active?.version ?? "v0.0");
    createPrompt.mutate(
      { data: { modality: modality.key, version: nextVersion, prompt: newDraft.trim(), isActive: true } },
      {
        onSuccess: () => {
          toast({ title: "Prompt created and activated" });
          setCreating(false);
          setNewDraft("");
          invalidate();
        },
        onError: () => toast({ title: "Failed to create", variant: "destructive" }),
      }
    );
  };

  const Icon = modality.icon;

  return (
    <div className="space-y-6 py-6">

      {/* Active Prompt */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Active Prompt</p>
              {active && (
                <p className="text-xs text-muted-foreground">
                  {active.version} · saved {format(new Date(active.createdAt), "MMM d, yyyy")}
                </p>
              )}
            </div>
            {active && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs ml-1">Live</Badge>
            )}
          </div>

          {!editing && !creating && (
            <div className="flex gap-2">
              {active ? (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              ) : (
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Create First Prompt
                </Button>
              )}
            </div>
          )}

          {editing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={createPrompt.isPending}>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                {createPrompt.isPending ? "Saving..." : "Save as New Version"}
              </Button>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* No prompt yet */}
          {!active && !creating && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No active prompt for {modality.label.toLowerCase()} modality yet.
            </div>
          )}

          {/* Create new */}
          {creating && (
            <div className="space-y-3">
              <Textarea
                className="min-h-[200px] font-mono text-sm resize-none"
                placeholder={`Write a system prompt for ${modality.label.toLowerCase()} validation...`}
                value={newDraft}
                onChange={e => setNewDraft(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setCreating(false); setNewDraft(""); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={!newDraft.trim() || createPrompt.isPending}>
                  {createPrompt.isPending ? "Creating..." : "Create & Activate"}
                </Button>
              </div>
            </div>
          )}

          {/* View / Edit active */}
          {active && !creating && (
            editing ? (
              <Textarea
                className="min-h-[200px] font-mono text-sm resize-none border-primary/50 focus-visible:ring-primary/30"
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                autoFocus
              />
            ) : (
              <p className="font-mono text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {active.prompt}
              </p>
            )
          )}
        </div>
      </div>

      {/* Version History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Version History</span>
            <span className="text-xs text-muted-foreground">({history.length} older {history.length === 1 ? "version" : "versions"})</span>
          </div>

          <div className="space-y-2">
            {history.map((p, i) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border bg-muted/30 overflow-hidden transition-all",
                  i === 0 && "border-muted"
                )}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {p.version}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(p.createdAt), "MMM d, yyyy · HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => handleRestore(p)}
                      title="Restore this version"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(p)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="px-4 py-3">
                  <p className="font-mono text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {p.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slot limit notice */}
      {prompts.length >= 4 && (
        <p className="text-xs text-muted-foreground text-center">
          {prompts.length}/5 version slots used. Oldest inactive version will be removed when you save a new one.
        </p>
      )}
    </div>
  );
}

export default function Prompts() {
  const { data: prompts, isLoading } = useListPrompts();
  const allPrompts = (prompts as Prompt[] | undefined) ?? [];

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">System Prompts</h1>
          <p className="text-muted-foreground mt-1">
            Configure the AI instructions used for each asset type. Editing creates a new version — previous versions are kept as history.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading prompts...</div>
        ) : (
          <Tabs defaultValue="image">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-0">
              {MODALITIES.map(({ key, label, icon: Icon }) => {
                const count = allPrompts.filter(p => p.modality === key).length;
                const hasActive = allPrompts.some(p => p.modality === key && p.isActive);
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {count > 0 && (
                      <span className={cn(
                        "text-xs rounded-full px-1.5 py-0.5 font-medium",
                        hasActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {MODALITIES.map(m => (
              <TabsContent key={m.key} value={m.key} className="mt-0 focus-visible:outline-none">
                <ModalityPanel
                  modality={m}
                  prompts={allPrompts.filter(p => p.modality === m.key)}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}

function bumpVersion(version: string): string {
  const match = version.match(/^(v?)(\d+)\.(\d+)$/);
  if (match) {
    const [, prefix, major, minor] = match;
    return `${prefix}${major}.${parseInt(minor) + 1}`;
  }
  const match3 = version.match(/^(v?)(\d+)\.(\d+)\.(\d+)$/);
  if (match3) {
    const [, prefix, major, minor, patch] = match3;
    return `${prefix}${major}.${minor}.${parseInt(patch) + 1}`;
  }
  return version + ".1";
}
