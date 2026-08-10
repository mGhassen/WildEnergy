"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDeferredValue } from "react";
import { RouteDialog } from "@/components/route-dialog";
import { useCreateTrainer } from "@/hooks/useTrainers";
import { trainerApi, type ProfileSearchResult } from "@/lib/api/trainers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, X } from "lucide-react";
import {
  TrainerForm,
  trainerFormDefaultValues,
  trainerFormSchema,
  toCreateTrainerPayload,
  type TrainerFormData,
} from "../trainer-form";

const CLOSE_HREF = "/admin/trainers";

export default function AdminNewTrainerPage() {
  const router = useRouter();
  const createTrainerMutation = useCreateTrainer();
  const form = useForm<TrainerFormData>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues: trainerFormDefaultValues,
  });

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<ProfileSearchResult | null>(null);

  useEffect(() => {
    if (mode !== "existing" || deferredSearch.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    trainerApi
      .searchProfiles(deferredSearch.trim(), { excludeRole: "trainer" })
      .then((profiles) => {
        if (!cancelled) setResults(profiles);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, mode]);

  const selectProfile = (profile: ProfileSearchResult) => {
    setSelectedProfile(profile);
    form.reset({
      ...trainerFormDefaultValues,
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      phone: profile.phone || "",
      profileEmail: profile.profile_email || "",
    });
  };

  const clearSelectedProfile = () => {
    setSelectedProfile(null);
    form.reset(trainerFormDefaultValues);
  };

  const handleSubmit = (data: TrainerFormData) => {
    createTrainerMutation.mutate(
      toCreateTrainerPayload(data, selectedProfile?.id),
      {
        onSuccess: (trainer: any) => {
          router.replace(
            trainer?.id ? `/admin/trainers/${trainer.id}` : CLOSE_HREF,
          );
        },
      },
    );
  };

  return (
    <RouteDialog
      title="Add New Trainer"
      description="Create a trainer role. Login account is optional — attach later if needed."
      closeHref={CLOSE_HREF}
      className="sm:max-w-[560px]"
    >
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "new" ? "default" : "outline"}
          onClick={() => {
            setMode("new");
            clearSelectedProfile();
          }}
        >
          <UserPlus className="mr-1 h-4 w-4" />
          New person
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "existing" ? "default" : "outline"}
          onClick={() => setMode("existing")}
        >
          <Search className="mr-1 h-4 w-4" />
          Existing profile
        </Button>
      </div>

      {mode === "existing" && !selectedProfile && (
        <div className="mb-4 space-y-2">
          <Label htmlFor="profile-search">Search existing people</Label>
          <Input
            id="profile-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, or contact email…"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
            {searching && (
              <p className="px-2 py-1 text-xs text-muted-foreground">Searching…</p>
            )}
            {!searching && deferredSearch.trim().length >= 2 && results.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                No matching profiles without a trainer role.
              </p>
            )}
            {results.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => selectProfile(profile)}
              >
                <span>
                  {profile.first_name} {profile.last_name}
                  {profile.phone ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {profile.phone}
                    </span>
                  ) : null}
                </span>
                <span className="flex gap-1">
                  {profile.has_member && (
                    <Badge variant="outline" className="text-[10px]">
                      Member
                    </Badge>
                  )}
                  {profile.has_account && (
                    <Badge variant="secondary" className="text-[10px]">
                      Account
                    </Badge>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedProfile && (
        <div className="mb-4 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <div>
            <p className="font-medium">
              Using {selectedProfile.first_name} {selectedProfile.last_name}
            </p>
            <p className="text-xs text-muted-foreground">
              Same profile — member/trainer stay one person
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={clearSelectedProfile}
            aria-label="Clear selected profile"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {(mode === "new" || selectedProfile) && (
        <TrainerForm
          form={form}
          onSubmit={handleSubmit}
          submitLabel="Create Trainer"
          isSubmitting={createTrainerMutation.isPending}
          personFieldsLocked={!!selectedProfile}
        />
      )}
    </RouteDialog>
  );
}
