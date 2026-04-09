import { useState } from "react";
import { useListPrompts, useCreatePrompt, useUpdatePrompt, useDeletePrompt, useActivatePrompt, getListPromptsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Plus, Trash2, Power, Star } from "lucide-react";
import { format } from "date-fns";

const promptSchema = z.object({
  modality: z.enum(["image", "text", "audio", "video"]),
  version: z.string().min(1, "Version is required"),
  prompt: z.string().min(10, "Prompt must be at least 10 chars"),
});

type PromptForm = z.infer<typeof promptSchema>;

export default function Prompts() {
  const { data: prompts, isLoading } = useListPrompts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPrompt = useCreatePrompt();
  const deletePrompt = useDeletePrompt();
  const activatePrompt = useActivatePrompt();

  const form = useForm<PromptForm>({
    resolver: zodResolver(promptSchema),
    defaultValues: { modality: "image", version: "v1.0.0", prompt: "" },
  });

  const onSubmit = (data: PromptForm) => {
    createPrompt.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "System prompt created" });
        setIsDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListPromptsQueryKey() });
        form.reset();
      },
      onError: () => toast({ title: "Failed to create", variant: "destructive" })
    });
  };

  const handleActivate = (id: number) => {
    activatePrompt.mutate({ params: { id } }, {
      onSuccess: () => {
        toast({ title: "Prompt activated" });
        queryClient.invalidateQueries({ queryKey: getListPromptsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if(!confirm("Delete this prompt?")) return;
    deletePrompt.mutate({ params: { id } }, {
      onSuccess: () => {
        toast({ title: "Prompt deleted" });
        queryClient.invalidateQueries({ queryKey: getListPromptsQueryKey() });
      }
    });
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Prompts</h1>
          <p className="text-muted-foreground mt-1">Manage core system instructions by modality.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Prompt</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create System Prompt</DialogTitle>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Button type="submit" className="w-full" disabled={createPrompt.isPending}>
                  {createPrompt.isPending ? "Saving..." : "Save Prompt"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Group prompts by modality for better scannability */}
        {["image", "text", "audio", "video"].map((modality) => {
          const modalityPrompts = prompts?.filter(p => p.modality === modality) || [];
          if (modalityPrompts.length === 0) return null;
          
          return (
            <Card key={modality}>
              <CardHeader className="py-4">
                <CardTitle className="text-lg capitalize flex items-center gap-2">
                  {modality} Models
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
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalityPrompts.map(p => (
                      <TableRow key={p.id} className={p.isActive ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium font-mono text-xs">{p.version}</TableCell>
                        <TableCell className="truncate max-w-[400px] font-mono text-xs text-muted-foreground" title={p.prompt}>
                          {p.prompt.slice(0, 100)}...
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
                        <TableCell className="text-right space-x-2">
                          {!p.isActive && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleActivate(p.id)} title="Make Active">
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
        {prompts?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
            No system prompts configured.
          </div>
        )}
      </div>
    </div>
  );
}