'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { apiClient } from '@/lib/api';
import { roleDisplayNames } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function EmployeesPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getUsers({ limit: '100' })
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RoleGuard permission="users:manage">
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Foydalanuvchilar</h1>
          <p className="text-slate-600 mt-2">Tizim foydalanuvchilari</p>
        </div>

        <Card>
          <CardContent className="p-0 pt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ism</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Holat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={String(u.id)}>
                      <TableCell>{String(u.full_name)}</TableCell>
                      <TableCell>{String(u.username)}</TableCell>
                      <TableCell>
                        {roleDisplayNames[String(u.role_name) as keyof typeof roleDisplayNames] ||
                          String(u.role_name)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'default' : 'secondary'}>
                          {u.is_active ? 'Faol' : 'Nofaol'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
