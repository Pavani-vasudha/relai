import { useState } from "react";
import { useListPrompts, useCreatePrompt, useDeletePrompt, useActivatePrompt, getListPromptsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Power, Star, Eye, Pencil } from "lucide-react";
import { format } from "date-fns";

const promptSchema = z.object({
  modality: z.enum(["image", "text", "audio", "video"]),
  version: z.string().min(1, "Version is required"),
  prompt: z.string().min(10, "Prompt must be at least 10 chars"),
  isActive: z.boolean().optional(),
});

type PromptForm = z.infer<typeof promptSchema>;

type Prompt = {
  id: number;
  modality: string;
  version: string;
  prompt: string;
  isActive: boolean;
  createdAt: string | Date;
};

function PromptFormDialog({
  open,
  onOpenChange,
  defaultValues,
  title,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues: PromptForm;
  title: string;
  onSubmit: (data: PromptForm) => void;
  isPending: boolean;
}) {
  const form = useForm<PromptForm>({
    resolver: zodResolver(promptSchema),
    values: defaultValues,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modality</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version String</FormLabel>
                    <FormControl><Input placeholder="v1.0.0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[250px] font-mono text-sm"
                      placeholder="You are an expert AI asset validator..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Saving..." : "Save Prompt"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ViewDialog({ prompt, open, onOpenChange }: { prompt: Prompt | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!prompt) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>System Prompt — {prompt.version}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Modality: </span>
              <span className="font-medium capitalize">{prompt.modality}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status: </span>
              {prompt.isActive ? (
                <Badge className="bg-primary/20 text-primary">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span>{format(new Date(prompt.createdAt), "MMM d, yyyy HH:mm")}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Prompt Content</p>
            <div className="bg-muted/50 rounded-md border p-4 font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-auto">
              {prompt.prompt}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Prompts() {
  const { data: prompts, isLoading } = useListPrompts();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState<Prompt | null>(null);
  const [viewPrompt, setViewPrompt] = useState<Prompt | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPrompt = useCreatePrompt();
  const deletePrompt = useDeletePrompt();
  const activatePrompt = useActivatePrompt();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListPromptsQueryKey() });

  const handleCreate = (data: PromptForm) => {
    createPrompt.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "System prompt created" });
        setIsCreateOpen(false);
        invalidate();
      },
      onError: () => toast({ title: "Failed to create", variant: "destructive" })
    });
  };

  const handleEdit = (data: PromptForm) => {
    if (!editPrompt) return;
    // Save as a new version (POST), keeping old version in history
    createPrompt.mutate({ data: { ...data, isActive: false } }, {
      onSuccess: () => {
        toast({ title: "New version saved" });
        setEditPrompt(null);
        invalidate();
      },
      onError: () => toast({ title: "Failed to save version", variant: "destructive" })
    });
  };

  const handleActivate = (id: number) => {
    activatePrompt.mutate({ params: { id } }, {
      onSuccess: () => {
        toast({ title: "Prompt activated" });
        invalidate();
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this prompt version?")) return;
    deletePrompt.mutate({ params: { id } }, {
      onSuccess: () => {
        toast({ title: "Prompt deleted" });
        invalidate();
      }
    });
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Prompts</h1>
          <p className="text-muted-foreground mt-1">Manage core system instructions by modality. Up to 5 versions per modality are retained.</p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Prompt
        </Button>
      </div>

      <PromptFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create System Prompt"
        defaultValues={{ modality: "image", version: "v1.0.0", prompt: "" }}
        onSubmit={handleCreate}
        isPending={createPrompt.isPending}
      />

      <PromptFormDialog
        open={!!editPrompt}
        onOpenChange={(v) => { if (!v) setEditPrompt(null); }}
        title={`Edit Prompt — Save as New Version`}
        defaultValues={editPrompt ? {
          modality: editPrompt.modality as any,
          version: bumpVersion(editPrompt.version),
          prompt: editPrompt.prompt,
        } : { modality: "image", version: "v1.0.0", prompt: "" }}
        onSubmit={handleEdit}
        isPending={createPrompt.isPending}
      />

      <ViewDialog
        prompt={viewPrompt}
        open={!!viewPrompt}
        onOpenChange={(v) => { if (!v) setViewPrompt(null); }}
      />

      <div className="max-w-6xl mx-auto space-y-8">
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        )}
        {["image", "text", "audio", "video"].map((modality) => {
          const modalityPrompts = (prompts as Prompt[] | undefined)?.filter(p => p.modality === modality) || [];
          if (modalityPrompts.length === 0) return null;

          return (
            <Card key={modality}>
              <CardHeader className="py-4">
                <CardTitle className="text-lg capitalize flex items-center gap-2">
                  {modality} Models
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({modalityPrompts.length}/5 versions)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Version</TableHead>
                      <TableHead>Prompt Snippet</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalityPrompts.map(p => (
                      <TableRow key={p.id} className={p.isActive ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium font-mono text-xs">{p.version}</TableCell>
                        <TableCell className="truncate max-w-[400px] font-mono text-xs text-muted-foreground" title={p.prompt}>
                          {p.prompt.slice(0, 100)}{p.prompt.length > 100 ? "..." : ""}
                        </TableCell>
                        <TableCell>
                          {p.isActive ? (
                            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 flex w-fit items-center gap-1">
                              <Star className="h-3 w-3 fill-current" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(p.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPrompt(p)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditPrompt(p)} title="Edit (saves as new version)">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!p.isActive && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleActivate(p.id)} title="Restore (make active)">
                              <Power className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && prompts?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
            No system prompts configured.
          </div>
        )}
      </div>
    </div>
  );
}

function bumpVersion(version: string): string {
  const match = version.match(/^(v?)(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return version + "-edit";
  const [, prefix, major, minor, patch] = match;
  return `${prefix}${major}.${minor}.${parseInt(patch) + 1}`;
}
