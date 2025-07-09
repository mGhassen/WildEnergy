import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign } from "lucide-react";
import { getInitials, formatDate } from "@/lib/auth";

export default function AdminPayments() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: subscriptions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/subscriptions"],
  });

  // Filter payments by member name, plan, or status
  const filteredPayments = subscriptions.filter((sub) => {
    const member = `${sub.member?.firstName || ''} ${sub.member?.lastName || ''}`.toLowerCase();
    const plan = sub.plan?.name?.toLowerCase() || '';
    const status = (sub.paymentStatus || '').toLowerCase();
    return (
      member.includes(searchTerm.toLowerCase()) ||
      plan.includes(searchTerm.toLowerCase()) ||
      status.includes(searchTerm.toLowerCase())
    );
  });

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(price));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Payments</h1>
          <p className="text-muted-foreground">Manage and review all subscription payments</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {sub.member ? getInitials(sub.member.firstName, sub.member.lastName) : "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {sub.member?.firstName} {sub.member?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{sub.member?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{sub.plan?.name}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{formatPrice(sub.amountPaid || sub.plan?.price || 0)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{sub.paymentType || '-'}</TableCell>
                    <TableCell>{sub.paymentDate ? formatDate(sub.paymentDate) : '-'}</TableCell>
                    <TableCell>
                      {(() => {
                        const status = sub.paymentStatus || 'pending';
                        const variant = status === 'paid' ? 'default' : status === 'pending' ? 'secondary' : 'destructive';
                        return (
                          <Badge variant={variant}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{sub.paymentNotes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 