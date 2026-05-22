import { redirect } from 'next/navigation';

/** Eski havola — yangi analitika sahifasiga */
export default function ReportsRedirect() {
  redirect('/dashboard/analytics');
}
