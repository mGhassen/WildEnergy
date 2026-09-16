import AcceptPlanInviteClient from './AcceptPlanInviteClient';
import { Card } from '@/components/ui/card';

export default function Page(props: any) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <AcceptPlanInviteClient searchParams={props.searchParams} />
      </Card>
    </div>
  );
}
