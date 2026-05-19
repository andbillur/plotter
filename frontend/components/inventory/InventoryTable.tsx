'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/types';
import { Edit2, Trash2, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { t } from '@/lib/constants';

interface InventoryTableProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  isLoading?: boolean;
}

export function InventoryTable({ products, onEdit, onDelete, isLoading }: InventoryTableProps) {
  const language = useUIStore((state) => state.language);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-slate-500">{t('common.noData', language)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead>{t('inventory.sku', language)}</TableHead>
            <TableHead>{t('inventory.name', language)}</TableHead>
            <TableHead>{t('inventory.category', language)}</TableHead>
            <TableHead className="text-right">{t('inventory.stock', language)}</TableHead>
            <TableHead className="text-right">{t('inventory.price', language)}</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const stockPercentage = (product.currentStock / product.maxStock) * 100;
            const status =
              product.currentStock <= product.minStock ? 'critical' :
              product.currentStock <= (product.maxStock * 0.3) ? 'warning' : 'optimal';

            return (
              <TableRow key={product.id} className="border-slate-200">
                <TableCell className="font-mono text-sm font-semibold text-slate-600">
                  {product.sku}
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-slate-600">{product.category}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold">{product.currentStock}</span>
                    <span className="text-xs text-slate-500">{product.unit}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${product.unitPrice.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      status === 'critical' ? 'destructive' :
                      status === 'warning' ? 'secondary' : 'default'
                    }
                    className={
                      status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'critical' ? 'bg-red-100 text-red-800' : ''
                    }
                  >
                    {status === 'critical' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {status === 'critical' ? 'Low Stock' :
                     status === 'warning' ? 'Warning' : 'Optimal'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(product)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
