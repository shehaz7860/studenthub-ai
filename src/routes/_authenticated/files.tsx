import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FolderOpen, Trash2, Download, File as FileIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { formatShortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/files")({
  head: () => ({ meta: [{ title: "Files — StudentHub AI" }] }),
  component: FilesPage,
});

function FilesPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");

  const { data: files = [] } = useQuery({
    queryKey: ["files"],
    queryFn: async () => (await supabase.from("files").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const folders = Array.from(new Set(files.map((f: any) => f.folder).filter(Boolean))) as string[];
  const filtered = files.filter((f: any) => (!folder || f.folder === folder) && (!search || f.name.toLowerCase().includes(search.toLowerCase())));

  const upload = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("user-files").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { error } = await supabase.from("files").insert({
      user_id: user.id, name: file.name, storage_path: path, mime_type: file.type,
      size_bytes: file.size, folder: folder || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Uploaded"); qc.invalidateQueries({ queryKey: ["files"] }); }
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    for (let i = 0; i < list.length; i++) await upload(list[i]);
  };

  const del = async (f: any) => {
    await supabase.storage.from("user-files").remove([f.storage_path]);
    await supabase.from("files").delete().eq("id", f.id);
    qc.invalidateQueries({ queryKey: ["files"] });
  };

  const download = async (f: any) => {
    const { data, error } = await supabase.storage.from("user-files").createSignedUrl(f.storage_path, 60);
    if (error || !data) { toast.error("Failed to create link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <PageShell title="Files" description="Upload notes, PDFs, presentations — all in one secure place."
      actions={
        <>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <Button onClick={() => inputRef.current?.click()} className="gradient-brand text-white border-0"><Upload className="size-4 mr-1.5" /> Upload</Button>
        </>
      }
    >
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 glass-card border-border" placeholder="Search files…" />
        </div>
        <Input value={folder} onChange={(e) => setFolder(e.target.value)} className="sm:w-48 glass-card border-border" placeholder="Folder filter" list="folders" />
        <datalist id="folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No files yet" description="Drag and drop or click upload to add files." action={<Button onClick={() => inputRef.current?.click()} className="gradient-brand text-white"><Upload className="size-4 mr-1.5" /> Upload</Button>} />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((f: any) => (
            <li key={f.id} className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-brand/30 transition-colors group">
              <div className="size-10 rounded-lg bg-brand/15 text-brand grid place-items-center shrink-0"><FileIcon className="size-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">{formatShortDate(f.created_at)} · {f.size_bytes ? `${(f.size_bytes / 1024).toFixed(0)} KB` : "—"}{f.folder && ` · ${f.folder}`}</div>
              </div>
              <button onClick={() => download(f)} className="p-2 rounded-md hover:bg-secondary text-muted-foreground"><Download className="size-4" /></button>
              <button onClick={() => del(f)} className="p-2 rounded-md hover:bg-destructive/15 hover:text-destructive text-muted-foreground"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
