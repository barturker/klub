'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, Lock, AlertCircle } from 'lucide-react';

interface PrivacySettingsProps {
  communityId: string;
  currentLevel: string;
  onLevelChange: (level: string) => void;
}

const PRIVACY_LEVELS = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can view and join your community',
    icon: Users,
    warning: null,
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only members can view content. Others can request to join',
    icon: Shield,
    warning: 'Members will need approval to join',
  },
  {
    value: 'invite_only',
    label: 'Invite Only',
    description: 'Hidden from search. New members must be invited',
    icon: Lock,
    warning: 'Community will not appear in public listings',
  },
];

export function PrivacySettings({ currentLevel, onLevelChange }: PrivacySettingsProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
        <CardDescription>
          Control who can see and join your community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={currentLevel} onValueChange={onLevelChange}>
          {PRIVACY_LEVELS.map((level) => {
            const Icon = level.icon;
            return (
              <div key={level.value} className="space-y-3">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                  <Label htmlFor={level.value} className="flex-1 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="font-medium">{level.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {level.description}
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
                {level.warning && currentLevel === level.value && (
                  <Alert className="ml-8">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{level.warning}</AlertDescription>
                  </Alert>
                )}
              </div>
            );
          })}
        </RadioGroup>

        <div className="border-t pt-6">
          <h4 className="font-medium mb-4">Privacy Level Features</h4>
          <div className="space-y-3 text-sm">
            {currentLevel === 'public' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Visible in community directory</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Anyone can view posts and members</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Instant join for new members</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Content indexed by search engines</span>
                </div>
              </>
            )}

            {currentLevel === 'private' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>Visible in directory (name and description only)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Content hidden from non-members</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>Join requests require approval</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Not indexed by search engines</span>
                </div>
              </>
            )}

            {currentLevel === 'invite_only' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Hidden from directory</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Content hidden from non-members</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Invitation required to join</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Not indexed by search engines</span>
                </div>
              </>
            )}
          </div>
        </div>

        {(currentLevel === 'private' || currentLevel === 'invite_only') && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Changing to {currentLevel === 'private' ? 'private' : 'invite-only'} will:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Immediately hide content from non-members</li>
                <li>Require approval for new join requests</li>
                {currentLevel === 'invite_only' && (
                  <li>Remove your community from public listings</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}