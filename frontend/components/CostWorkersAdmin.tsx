'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api';
import { Loader2, Pencil, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const DEPT_LABELS: Record<string, string> = {
  ishlab_chiqarish: 'Ishlab chiqarish',
  kesish: 'Kesish',
  qadoqlash: 'Qadoqlash',
};

type Dept = 'ishlab_chiqarish' | 'kesish' | 'qadoqlash';

function formatMoney(n: number) {
  return `${n.toLocaleString('uz-UZ')} so'm`;
}

type Props = {
  workers: Record<string, unknown>[];
  onReload: () => void;
};

export function CostWorkersAdmin({ workers, onReload }: Props) {
  const [workerForm, setWorkerForm] = useState({
    fullName: '',
    monthlySalary: '',
    department: 'ishlab_chiqarish' as Dept,
  });
  const [addingWorker, setAddingWorker] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    monthlySalary: '',
    department: 'ishlab_chiqarish' as Dept,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleAddWorker = async () => {
    const monthlySalary = parseFloat(workerForm.monthlySalary);
    if (!workerForm.fullName.trim() || !monthlySalary) {
      toast.error('Ism va oylik majburiy');
      return;
    }
    setAddingWorker(true);
    try {
      await apiClient.createCostWorker({
        fullName: workerForm.fullName.trim(),
        monthlySalary,
        department: workerForm.department,
      });
      toast.success('Ishchi qo\'shildi');
      setWorkerForm({ fullName: '', monthlySalary: '', department: 'ishlab_chiqarish' });
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setAddingWorker(false);
    }
  };

  const startEdit = (w: Record<string, unknown>) => {
    setEditId(String(w.id));
    setEditForm({
      fullName: String(w.full_name),
      monthlySalary: String(w.monthly_salary),
      department: String(w.department) as Dept,
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    const monthlySalary = parseFloat(editForm.monthlySalary);
    if (!editForm.fullName.trim() || !monthlySalary) {
      toast.error('Ism va oylik majburiy');
      return;
    }
    setSavingEdit(true);
    try {
      await apiClient.updateCostWorker(editId, {
        fullName: editForm.fullName.trim(),
        monthlySalary,
        department: editForm.department,
      });
      toast.success('Ishchi yangilandi');
      setEditId(null);
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setSavingEdit(false);
    }
  };

  const active = workers.filter((w) => w.is_active !== false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Label>F.I.Sh</Label>
          <Input
            value={workerForm.fullName}
            onChange={(e) => setWorkerForm({ ...workerForm, fullName: e.target.value })}
            placeholder="Aliyev Vali"
          />
        </div>
        <div>
          <Label>Oylik (so&apos;m)</Label>
          <Input
            type="number"
            value={workerForm.monthlySalary}
            onChange={(e) => setWorkerForm({ ...workerForm, monthlySalary: e.target.value })}
          />
        </div>
        <div>
          <Label>Bo&apos;lim (soha)</Label>
          <Select
            value={workerForm.department}
            onValueChange={(v) => setWorkerForm({ ...workerForm, department: v as Dept })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DEPT_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="button" onClick={handleAddWorker} disabled={addingWorker}>
        {addingWorker ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
        Ishchi qo&apos;shish
      </Button>

      {active.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ism</TableHead>
              <TableHead>Bo&apos;lim</TableHead>
              <TableHead>Oylik</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((w) => {
              const id = String(w.id);
              const editing = editId === id;
              return (
                <TableRow key={id}>
                  {editing ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.fullName}
                          onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editForm.department}
                          onValueChange={(v) => setEditForm({ ...editForm, department: v as Dept })}
                        >
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(DEPT_LABELS).map(([k, label]) => (
                              <SelectItem key={k} value={k}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.monthlySalary}
                          onChange={(e) => setEditForm({ ...editForm, monthlySalary: e.target.value })}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button type="button" size="icon" variant="ghost" onClick={saveEdit} disabled={savingEdit}>
                            {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                          </Button>
                          <Button type="button" size="icon" variant="ghost" onClick={() => setEditId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{String(w.full_name)}</TableCell>
                      <TableCell>{DEPT_LABELS[String(w.department)] || String(w.department)}</TableCell>
                      <TableCell>{formatMoney(Number(w.monthly_salary))}</TableCell>
                      <TableCell>
                        <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(w)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
