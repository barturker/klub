'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Copy, Trash2, Clock, Users, Link } from 'lucide-react';

interface InvitationSectionProps {
  communityId: string;
  isAdmin: boolean;
  isModerator: boolean;
}

interface Invitation {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
  uses_count: number;
  max_uses: number;
  created_by_role: string;
  creator: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  invitation_uses: Array<{
    id: string;
    user_id: string;
    accepted_at: string;
    user: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
}

export function InvitationSection({ communityId, isAdmin, isModerator }: InvitationSectionProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    used: 0,
    expired: 0
  });

  // Fetch invitations
  const fetchInvitations = async () => {
    try {
      const response = await fetch(`/api/communities/${communityId}/invitations`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
        setStats(data.stats || { total: 0, active: 0, used: 0, expired: 0 });
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin || isModerator) {
      fetchInvitations();
    } else {
      setLoading(false);
    }
  }, [communityId, isAdmin, isModerator]);

  // Create invitation
  const createInvitation = async () => {
    setCreating(true);
    try {
      const response = await fetch(`/api/communities/${communityId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expires_in_days: parseInt(expiresInDays),
          max_uses: 1 // Single use only as per requirements
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Invitation created successfully');
        setOpenDialog(false);
        fetchInvitations(); // Refresh list

        // Copy to clipboard
        navigator.clipboard.writeText(data.invite_url);
        toast.success('Invitation link copied to clipboard');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create invitation');
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error('Failed to create invitation');
    } finally {
      setCreating(false);
    }
  };

  // Delete invitation
  const deleteInvitation = async (invitationId: string) => {
    try {
      const response = await fetch('/api/invitations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      });

      if (response.ok) {
        toast.success('Invitation deleted');
        fetchInvitations(); // Refresh list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete invitation');
      }
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Failed to delete invitation');
    }
  };

  // Copy invitation link
  const copyInvitationLink = (token: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Invitation link copied to clipboard');
  };

  // Check if invitation is expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) <= new Date();
  };

  // Check if invitation is used
  const isUsed = (invitation: Invitation) => {
    return invitation.uses_count >= invitation.max_uses;
  };

  // Get invitation status
  const getInvitationStatus = (invitation: Invitation) => {
    if (isUsed(invitation)) {
      return { label: 'Used', variant: 'secondary' as const };
    }
    if (isExpired(invitation.expires_at)) {
      return { label: 'Expired', variant: 'destructive' as const };
    }
    return { label: 'Active', variant: 'default' as const };
  };

  if (!isAdmin && !isModerator) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invitation Links
            </CardTitle>
            <CardDescription>
              Create and manage invitation links for your community
            </CardDescription>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Generate Invitation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Invitation Link</DialogTitle>
                <DialogDescription>
                  Create a unique invitation link for new members to join your community
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="expires">Expires in</Label>
                  <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                    <SelectTrigger id="expires">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Note: Each invitation link can only be used once
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={createInvitation}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Generate Link'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.used}</div>
            <div className="text-sm text-muted-foreground">Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.expired}</div>
            <div className="text-sm text-muted-foreground">Expired</div>
          </div>
        </div>

        {/* Invitations table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No invitations created yet
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const status = getInvitationStatus(invitation);
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-mono">{invitation.token}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm">
                              {invitation.created_by || 'Unknown'}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {invitation.created_by_role}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">-</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {status.label === 'Active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyInvitationLink(invitation.token)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteInvitation(invitation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}