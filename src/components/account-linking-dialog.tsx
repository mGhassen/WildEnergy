"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useSearchAccounts, useLinkAccountToMember } from "@/hooks/useAccountLinking";
import { Account } from "@/lib/api/accounts";
import { Search, User, Mail, Calendar, Loader2, Check } from "lucide-react";
import { formatDate } from "@/lib/date";

interface AccountLinkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onSuccess?: () => void;
}

export function AccountLinkingDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  onSuccess,
}: AccountLinkingDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResults, isLoading: isSearching } = useSearchAccounts(debouncedQuery);
  const linkAccountMutation = useLinkAccountToMember();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedAccount(null);
    }
  }, [open]);

  const handleLinkAccount = async () => {
    if (!selectedAccount) return;

    try {
      await linkAccountMutation.mutateAsync({
        memberId,
        accountId: selectedAccount.account_id
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to link account:', error);
    }
  };

  const handleSelectAccount = (account: Account) => {
    setSelectedAccount(account);
  };

  const accounts = searchResults?.accounts || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Account to Member</DialogTitle>
          <DialogDescription>
            Search for an account to link to <strong>{memberName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="account-search">Search Accounts</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="account-search"
                placeholder="Search by email, first name, or last name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-2">
            <Label>Available Accounts</Label>
            <div className="border rounded-md max-h-60 overflow-auto">
              {isSearching ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex items-center justify-center p-4">
                  <span className="text-sm text-muted-foreground">
                    {searchQuery ? 'No accounts found matching your search.' : 'Enter a search term to find accounts.'}
                  </span>
                </div>
              ) : (
                <div className="p-2">
                  {accounts.map((account: Account) => (
                    <div
                      key={account.account_id}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                        selectedAccount?.account_id === account.account_id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSelectAccount(account)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{`${account.first_name || ''} ${account.last_name || ''}`.trim() || 'No name'}</p>
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {account.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {account.user_type}
                        </Badge>
                        {selectedAccount?.account_id === account.account_id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Account Summary */}
          {selectedAccount && (
            <div className="p-4 bg-muted/50 rounded-md">
              <h4 className="font-medium mb-2">Selected Account</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {`${selectedAccount.first_name || ''} ${selectedAccount.last_name || ''}`.trim() || 'No name'}</p>
                <p><strong>Email:</strong> {selectedAccount.email}</p>
                <p><strong>Type:</strong> {selectedAccount.user_type}</p>
                <p className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  <strong>Created:</strong> {formatDate(selectedAccount.created_at)}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={linkAccountMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLinkAccount}
            disabled={!selectedAccount || linkAccountMutation.isPending}
          >
            {linkAccountMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              'Link Account'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
