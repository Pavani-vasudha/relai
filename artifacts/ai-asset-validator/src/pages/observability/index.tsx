import { useState } from "react";
import { useGetObservability, useListProjects, getGetObservabilityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DollarSign, Zap, Clock, ListChecks, Eye, Check, AlertTriangle } from "lucide-react";

function ValidationDetailDialog({ record, open, onOpenChange }: { record: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!record) return null;
  const preCheck = record.preCheckResults as any || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Validation Detail — {record.assetName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge
              variant={record.validationResult === "PASS" ? "default" : "destructive"}
              className={record.validationResult === "PASS" ? "bg-emerald-500" : ""}
            >
              {record.validationResult}
            </Badge>
            <span className="text-muted-foreground">Project: <strong>{record.projectName}</strong></span>
            <span className="text-muted-foreground">Confidence: {(record.confidence * 100).toFixed(1)}%</span>
            <span className="text-muted-foreground">{record.tokensUsed.toLocaleString()} tokens</span>
            <span className="text-muted-foreground">{record.latency}ms latency</span>
            <span className="text-muted-foreground">${Number(record.cost).toFixed(4)}</span>
          </div>

          {record.reasons && record.reasons.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reasons</p>
              <ul className="space-y-1.5">
                {(record.reasons as string[]).map((r: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2 bg-muted/40 p-2.5 rounded-md">
                    {record.validationResult === "PASS"
                      ? <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      : <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pre-checks</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="border rounded-md p-2.5 flex justify-between">
                <span>Duplicate</span>
                <Badge variant={preCheck.isDuplicate ? "destructive" : "secondary"} className="text-xs">
                  {preCheck.isDuplicate ? "Found" : "Clear"}
                </Badge>
              </div>
              <div className="border rounded-md p-2.5 flex justify-between">
                <span>PII</span>
                <Badge variant={preCheck.piiDetected ? "destructive" : "secondary"} className="text-xs">
                  {preCheck.piiDetected ? "Found" : "Clear"}
                </Badge>
              </div>
              {preCheck.blurScore != null && (
                <div className="border rounded-md p-2.5 flex justify-between col-span-2">
                  <span>Blur Score</span>
                  <span className="font-mono">{Number(preCheck.blurScore).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {record.rawResponse && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Raw AI Response</p>
              <div className="bg-black text-gray-300 p-3 rounded-md overflow-auto max-h-[200px] text-xs font-mono">
                <pre>{record.rawResponse}</pre>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Validated {format(new Date(record.createdAt), "MMM d, yyyy HH:mm:ss")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Observability() {
  const [projectId, setProjectId] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [viewRecord, setViewRecord] = useState<any>(null);

  const { data: projects } = useListProjects();

  const queryParams: any = {};
  if (projectId !== "all") queryParams.projectId = parseInt(projectId, 10);
  if (resultFilter !== "all") queryParams.result = resultFilter;

  const { data, isLoading } = useGetObservability({
    query: { queryKey: getGetObservabilityQueryKey(queryParams) }
  });

  const metrics = data?.metrics;
  const records = data?.records || [];

  return (
    <div className="flex-1 p-8 overflow-auto">
      <ValidationDetailDialog
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(v) => { if (!v) setViewRecord(null); }}
      />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Observability</h1>
          <p className="text-muted-foreground mt-1">Global metrics and logs across all validations.</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Results" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="PASS">PASS Only</SelectItem>
              <SelectItem value="FAIL">FAIL Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Validations</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalRecords || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <Zap className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics?.totalTokens || 0).toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.avgLatency || 0}ms</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(metrics?.totalCost || 0).toFixed(4)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Validation Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[60px] text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No records found</TableCell>
                    </TableRow>
                  ) : (
                    records.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.projectName}</TableCell>
                        <TableCell className="truncate max-w-[200px]" title={row.assetName}>{row.assetName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={row.validationResult === "PASS" ? "default" : "destructive"}
                            className={row.validationResult === "PASS" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                          >
                            {row.validationResult}
                          </Badge>
                        </TableCell>
                        <TableCell>{(row.confidence * 100).toFixed(1)}%</TableCell>
                        <TableCell className="font-mono text-xs">{row.tokensUsed.toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs">{row.latency}ms</TableCell>
                        <TableCell className="font-mono text-xs">${row.cost.toFixed(4)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(row.createdAt), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewRecord(row)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
