'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconUsers,
  IconCalendarEvent,
  IconSearch,
  IconPlus,
  IconFilter,
  IconMapPin,
  IconCategory,
  IconTrendingUp,
  IconClock,
  IconStar,
} from '@tabler/icons-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  location: string;
  logo_url: string | null;
  cover_image_url: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
  event_count?: number;
  rating?: number;
  is_member?: boolean;
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [activeTab, setActiveTab] = useState('all');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchCommunities();
    checkUser();
  }, []);

  useEffect(() => {
    filterAndSortCommunities();
  }, [communities, searchQuery, selectedCategory, selectedSort, activeTab]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      
      // Fetch all communities (both public and private)
      const { data: communitiesData, error } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching communities:', error);
        throw error;
      }
      
      console.log('Fetched communities:', communitiesData);

      // Get member counts for each community
      const communitiesWithStats = await Promise.all(
        (communitiesData || []).map(async (community) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', community.id);

          // Get event count
          const { count: eventCount } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', community.id);

          // Check if current user is a member
          let isMember = false;
          if (user) {
            const { data: membership } = await supabase
              .from('community_members')
              .select('id')
              .eq('community_id', community.id)
              .eq('user_id', user.id)
              .single();
            
            isMember = !!membership;
          }

          return {
            ...community,
            member_count: memberCount || 0,
            event_count: eventCount || 0,
            rating: 4.5 + Math.random() * 0.5, // Mock rating for now
            is_member: isMember
          };
        })
      );

      setCommunities(communitiesWithStats);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCommunities = () => {
    let filtered = [...communities];

    // Filter by tab
    if (activeTab === 'my' && user) {
      filtered = filtered.filter(c => c.is_member);
    } else if (activeTab === 'trending') {
      // For now, show communities with most members as trending
      filtered = filtered.filter(c => (c.member_count || 0) > 10);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    // Sort
    switch (selectedSort) {
      case 'popular':
        filtered.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'active':
        filtered.sort((a, b) => (b.event_count || 0) - (a.event_count || 0));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredCommunities(filtered);
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) {
      router.push('/auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member',
          joined_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update local state
      setCommunities(prev => prev.map(c => 
        c.id === communityId 
          ? { ...c, is_member: true, member_count: (c.member_count || 0) + 1 }
          : c
      ));
    } catch (error) {
      console.error('Error joining community:', error);
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setCommunities(prev => prev.map(c => 
        c.id === communityId 
          ? { ...c, is_member: false, member_count: Math.max((c.member_count || 0) - 1, 0) }
          : c
      ));
    } catch (error) {
      console.error('Error leaving community:', error);
    }
  };

  const categories = [
    'all',
    'Technology',
    'Sports',
    'Music',
    'Art',
    'Education',
    'Gaming',
    'Business',
    'Health',
    'Food',
    'Travel',
    'Other'
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <IconUsers className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading communities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discover Communities</h1>
          <p className="text-muted-foreground mt-2">
            Find and join communities that match your interests
          </p>
        </div>
        {user && (
          <Link href="/communities/new">
            <Button className="mt-4 md:mt-0">
              <IconPlus className="h-4 w-4 mr-2" />
              Create Community
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[180px]">
            <IconCategory className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSort} onValueChange={setSelectedSort}>
          <SelectTrigger className="w-full md:w-[180px]">
            <IconFilter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="active">Most Active</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Communities</TabsTrigger>
          {user && <TabsTrigger value="my">My Communities</TabsTrigger>}
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Communities Grid */}
      {filteredCommunities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <IconUsers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No communities found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your filters or search query'
                : 'Be the first to create a community!'}
            </p>
            {user && !searchQuery && selectedCategory === 'all' && (
              <Link href="/communities/new">
                <Button>
                  <IconPlus className="h-4 w-4 mr-2" />
                  Create Community
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCommunities.map((community) => (
            <Card key={community.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Cover Image */}
              <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                {community.cover_image_url && (
                  <img 
                    src={community.cover_image_url} 
                    alt={community.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              <CardHeader className="relative">
                {/* Logo */}
                <div className="absolute -top-8 left-6">
                  <Avatar className="h-16 w-16 border-4 border-background">
                    <AvatarImage src={community.logo_url || ''} />
                    <AvatarFallback className="text-lg">
                      {community.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="pt-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{community.name}</CardTitle>
                      {community.location && (
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <IconMapPin className="h-3 w-3 mr-1" />
                          {community.location}
                        </div>
                      )}
                    </div>
                    {community.rating && (
                      <div className="flex items-center text-sm">
                        <IconStar className="h-4 w-4 text-yellow-500 mr-1" />
                        {community.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                
                <CardDescription className="line-clamp-2 mt-2">
                  {community.description || 'No description available'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center">
                    <IconUsers className="h-4 w-4 mr-1" />
                    {community.member_count || 0} members
                  </div>
                  <div className="flex items-center">
                    <IconCalendarEvent className="h-4 w-4 mr-1" />
                    {community.event_count || 0} events
                  </div>
                </div>

                {/* Category Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary">{community.category || 'General'}</Badge>
                  {community.is_private && (
                    <Badge variant="outline">Private</Badge>
                  )}
                  {(community.member_count || 0) > 100 && (
                    <Badge variant="default">
                      <IconTrendingUp className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/communities/${community.slug}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Community
                    </Button>
                  </Link>
                  {user && (
                    community.is_member ? (
                      <Button 
                        variant="secondary"
                        onClick={() => handleLeaveCommunity(community.id)}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleJoinCommunity(community.id)}
                      >
                        Join
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-12 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Communities</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communities.length}</div>
            <p className="text-xs text-muted-foreground">Active communities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {communities.reduce((sum, c) => sum + (c.member_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all communities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <IconCalendarEvent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {communities.reduce((sum, c) => sum + (c.event_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Upcoming events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
            <IconClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {communities.filter(c => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(c.created_at) > weekAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Recently created</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}