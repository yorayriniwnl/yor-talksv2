import { Link } from 'wouter';
import { useAppStore } from '@/lib/store';
import { DeviceApprovalInbox } from '@/components/auth/DeviceApprovalInbox';

export function AccountAccessNav() {
  const logout = useAppStore((state) => state.logout);
  return <>
    <nav aria-label="Account access" className="mb-8 flex flex-wrap gap-4 text-sm text-primary">
      <Link href="/eligibility">Account access</Link>
      <Link href="/account">Security and account rights</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/grievance">Report a concern</Link>
      <button onClick={() => void logout()} type="button">Sign out</button>
    </nav>
    <DeviceApprovalInbox />
  </>;
}
