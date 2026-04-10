import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListProjects, useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Image, FileText, Mic, Video, Loader2, FolderOpen } from "lucide-react";
import { format } from "date-fns";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["image", "text", "audio", "video"]),
  storageFolderLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

const TypeIcon = ({ type, className }: { type: string, className?: string }) => {
  switch (type) {
    case "image": return <Image className={className} />;
    case "text": return <FileText className={className} />;
    case "audio": return <Mic className={className} />;
    case "video": return <Video className={className} />;
    default: return <FileText className={className} />;
  }
};

export default function Projects() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", type: "text", storageFolderLink: "" },
  });

  const onSubmit = (data: CreateProjectForm) => {
    createProject.mutate({
      data: {
        name: data.name,
        type: data.type,
        storageFolderLink: data.storageFolderLink || null,
      }
    }, {
      onSuccess: (newProject) => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsDialogOpen(false);
        form.reset();
        toast({ title: "Project created" });
        setLocation(`/projects/${newProject.id}`);
      },
      onError: () => toast({ title: "Failed to create project", variant: "destructive" })
    });
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your validation workspaces.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) form.reset(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E-commerce Product Images" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
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
                  name="storageFolderLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Assets Storage Folder Link{" "}
                        <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createProject.isPending}>
                  {createProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Project
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="max-w-5xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects?.length === 0 ? (
          <div className="text-center py-20 border rounded-xl border-dashed bg-muted/20">
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first project to start validating assets.</p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline">Create Project</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects?.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="group p-5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <TypeIcon type={project.type} className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full uppercase tracking-wider text-muted-foreground">
                      {project.type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg truncate mb-1 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  {project.storageFolderLink && (
                    <p className="text-xs text-primary truncate mb-1">Has storage folder</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
