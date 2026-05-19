import { redirect } from 'next/navigation';

export default function WarehouseRedirect() {
  redirect('/dashboard/inventory');
}
