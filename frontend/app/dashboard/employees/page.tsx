'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { roleDisplayNames } from '@/lib/constants';
import type { UserRole } from '@/lib/types';
import { useAuthStore } from '@/lib/store';
import { Loader2, Plus, Pencil, Key, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ROLE_OPTIONS: UserRole[] = [
  'omborchi',
  'mashina_operatori',
  'kesuvchi_ishchi',
  'direktor',
  'super_admin',
];

type UserRow = Record<string, unknown>;

export default function EmployeesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<{ name: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [pwdUser, setPwdUser] = useState<UserRow | null>(null);

  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    password: '',
    roleName: 'omborchi' as UserRole,
    phone: '',
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    roleName: 'omborchi' as UserRole,
    isActive: true,
  });

  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiClient.getUsers({ limit: '100' }), apiClient.getUserRoles()])
      .then(([res, rolesRes]) => {
        setUsers(res.data);
        setRoles(rolesRes.roles.map((r) => ({ name: r.name, display_name: r.display_name })));
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditForm({
      fullName: String(u.full_name),
      phone: String(u.phone || ''),
      roleName: (u.role_name as UserRole) || 'omborchi',
      isActive: Boolean(u.is_active),
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createUser({
        fullName: createForm.fullName.trim(),
        username: createForm.username.trim(),
        password: createForm.password,
        roleName: createForm.roleName,
        phone: createForm.phone.trim() || undefined,
      });
      toast.success('Foydalanuvchi yaratildi');
      setCreateOpen(false);
      setCreateForm({ fullName: '', username: '', password: '', roleName: 'omborchi', phone: '' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      await apiClient.updateUser(String(editUser.id), {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim() || undefined,
        roleName: editForm.roleName,
        isActive: editForm.isActive,
      });
      toast.success('Saqlandi');
      setEditUser(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdUser) return;
    try {
      await apiClient.changeUserPassword(String(pwdUser.id), newPassword);
      toast.success('Parol yangilandi');
      setPwdUser(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleDeactivate = async (u: UserRow) => {
    if (String(u.id) === currentUser?.id) {
      toast.error('O\'zingizni o\'chirib bo\'lmaydi');
      return;
    }
    if (!confirm(`${u.full_name} — nofaol qilinsinmi?`)) return;
    try {
      await apiClient.deleteUser(String(u.id));
      toast.success('Nofaol qilindi');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleActivate = async (u: UserRow) => {
    try {
      await apiClient.updateUser(String(u.id), { isActive: true });
      toast.success('Faollashtirildi');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const RoleSelect = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: UserRole) => void;
  }) => (
    <Select value={value} onValueChange={(v) => onChange(v as UserRole)}>
      <SelectTrigger className="min-h-[44px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(roles.length ? roles : ROLE_OPTIONS.map((name) => ({ name, display_name: roleDisplayNames[name] }))).map(
          (r) => (
            <SelectItem key={r.name} value={r.name}>
              {r.display_name || roleDisplayNames[r.name as UserRole] || r.name}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );

  const UserCard = (u: UserRow) => (
    <Card key={String(u.id)} className="md:hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{String(u.full_name)}</p>
            <p className="text-sm text-slate-500">@{String(u.username)}</p>
          </div>
          <Badge variant={u.is_active ? 'default' : 'secondary'}>
            {u.is_active ? 'Faol' : 'Nofaol'}
          </Badge>
        </div>
        <p className="text-sm">
          {roleDisplayNames[String(u.role_name) as UserRole] || String(u.role_name)}
          {u.phone ? ` · ${String(u.phone)}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="min-h-[40px]" onClick={() => openEdit(u)}>
            <Pencil className="h-4 w-4 mr-1" />
            Tahrir
          </Button>
          <Button type="button" size="sm" variant="outline" className="min-h-[40px]" onClick={() => setPwdUser(u)}>
            <Key className="h-4 w-4 mr-1" />
            Parol
          </Button>
          {u.is_active ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="min-h-[40px]"
              disabled={String(u.id) === currentUser?.id}
              onClick={() => handleDeactivate(u)}
            >
              <UserX className="h-4 w-4 mr-1" />
              O&apos;chirish
            </Button>
          ) : (
            <Button type="button" size="sm" variant="secondary" className="min-h-[40px]" onClick={() => handleActivate(u)}>
              <UserCheck className="h-4 w-4 mr-1" />
              Faollashtirish
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <RoleGuard permission="users:manage">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Foydalanuvchilar</h1>
            <p className="text-slate-600 mt-1 text-sm">Rol va ruxsatlar boshqaruvi</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto min-h-[48px]">
                <Plus className="h-5 w-5 mr-2" />
                Yangi foydalanuvchi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Foydalanuvchi qo&apos;shish</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>To&apos;liq ism</Label>
                  <Input
                    required
                    className="min-h-[44px]"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Login</Label>
                  <Input
                    required
                    minLength={3}
                    autoCapitalize="none"
                    className="min-h-[44px]"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Parol (min 6)</Label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    className="min-h-[44px]"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Rol</Label>
                  <RoleSelect
                    value={createForm.roleName}
                    onChange={(roleName) => setCreateForm({ ...createForm, roleName })}
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    className="min-h-[44px]"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full min-h-[48px]">
                  Yaratish
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">{users.map(UserCard)}</div>
            <Card className="hidden md:block">
              <CardContent className="p-0 pt-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ism</TableHead>
                      <TableHead>Login</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={String(u.id)}>
                        <TableCell>{String(u.full_name)}</TableCell>
                        <TableCell>{String(u.username)}</TableCell>
                        <TableCell>
                          {roleDisplayNames[String(u.role_name) as UserRole] || String(u.role_name)}
                        </TableCell>
                        <TableCell>{String(u.phone || '—')}</TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? 'default' : 'secondary'}>
                            {u.is_active ? 'Faol' : 'Nofaol'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setPwdUser(u)}>
                            <Key className="h-4 w-4" />
                          </Button>
                          {u.is_active ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              disabled={String(u.id) === currentUser?.id}
                              onClick={() => handleDeactivate(u)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleActivate(u)}>
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tahrirlash</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label>Ism</Label>
                <Input
                  required
                  className="min-h-[44px]"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  className="min-h-[44px]"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Rol</Label>
                <RoleSelect value={editForm.roleName} onChange={(roleName) => setEditForm({ ...editForm, roleName })} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="h-5 w-5"
                />
                <Label htmlFor="isActive">Faol</Label>
              </div>
              <Button type="submit" className="w-full min-h-[48px]">
                Saqlash
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!pwdUser} onOpenChange={(o) => !o && setPwdUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Parol — {pwdUser ? String(pwdUser.username) : ''}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePassword} className="space-y-4">
              <div>
                <Label>Yangi parol</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  className="min-h-[44px]"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full min-h-[48px]">
                Yangilash
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
