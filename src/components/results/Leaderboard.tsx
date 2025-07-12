import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { LeaderboardWithProfile } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardProps {
  paperName: string;
}

export const Leaderboard = ({ paperName }: LeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [paperName]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select(`
          *,
          profiles:user_id (
            name
          )
        `)
        .eq('paper_name', paperName)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const leaderboardWithProfiles: LeaderboardWithProfile[] = data?.map(entry => ({
        ...entry,
        profile: Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles
      })) || [];

      // Filter to keep only the latest attempt per user
      const userLatestScores = new Map<string, LeaderboardWithProfile>();
      
      leaderboardWithProfiles.forEach(entry => {
        const existingEntry = userLatestScores.get(entry.user_id);
        if (!existingEntry || new Date(entry.completed_at) > new Date(existingEntry.completed_at)) {
          userLatestScores.set(entry.user_id, entry);
        }
      });

      // Convert back to array and sort by score percentage (descending), then by completion time (ascending for ties)
      const filteredLeaderboard = Array.from(userLatestScores.values())
        .sort((a, b) => {
          if (b.score_percentage !== a.score_percentage) {
            return b.score_percentage - a.score_percentage;
          }
          return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
        })
        .slice(0, 20);

      setLeaderboard(filteredLeaderboard);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching leaderboard",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-50 border-yellow-200";
    if (rank === 2) return "bg-gray-50 border-gray-200";
    if (rank === 3) return "bg-amber-50 border-amber-200";
    return "";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading leaderboard...</div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No scores recorded yet for this paper.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Leaderboard - Top 20
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              return (
                <TableRow 
                  key={entry.id} 
                  className={getRankColor(rank)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getRankIcon(rank)}
                      #{rank}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.profile?.name || 'Unknown User'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={entry.score_percentage >= 80 ? "default" : entry.score_percentage >= 60 ? "secondary" : "destructive"}
                    >
                      {entry.score_percentage.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};