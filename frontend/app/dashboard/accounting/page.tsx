import { redirect } from 'next/navigation';

export default function AccountingRedirect() {
  redirect('/dashboard/reports');
}
