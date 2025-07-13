import { redirect } from 'next/navigation';

export default function MemberIndex() {
  redirect('/member/home');
  return null;
} 