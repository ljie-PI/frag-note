export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    queued_upload: 'bg-yellow-100 text-yellow-800',
    uploading: 'bg-blue-100 text-blue-800',
    processing: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  const labelMap: Record<string, string> = {
    queued_upload: '等待上传',
    uploading: '上传中',
    processing: '处理中',
    complete: '已完成',
    failed: '失败',
  };
  const colors = colorMap[status] ?? 'bg-slate-100 text-slate-800';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>{labelMap[status] ?? status}</span>;
}
