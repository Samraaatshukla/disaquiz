import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Paper } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { LogOut, Upload, FileText } from 'lucide-react';
import { QuestionUpload } from '@/components/admin/QuestionUpload';

interface PaperSelectionProps {
  onSelectPaper: (paperName: string) => void;
}

interface PaperWithStats extends Paper {
  questionCount: number;
}

export const PaperSelection = ({ onSelectPaper }: PaperSelectionProps) => {
  const [papers, setPapers] = useState<PaperWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { profile, signOut, isAdmin } = useAuth();

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const { data: papersData, error } = await supabase
        .from('papers')
        .select('*')
        .order('paper_name');

      if (error) throw error;

      // Fetch question counts for each paper
      const papersWithStats: PaperWithStats[] = [];
      
      for (const paper of papersData || []) {
        const { count, error: countError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('paper_name', paper.paper_name);

        if (countError) throw countError;

        papersWithStats.push({
          ...paper,
          questionCount: count || 0
        });
      }

      setPapers(papersWithStats);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching papers",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (showUpload) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Upload Questions</h1>
            <div className="flex gap-2">
              <Button onClick={() => {
                setShowUpload(false);
                fetchPapers(); // Refresh papers after closing upload
              }} variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Back to Papers
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
          <QuestionUpload />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg">Loading papers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {profile?.name}</h1>
            <p className="text-muted-foreground">Select a paper to start practicing</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Questions
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {papers.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Papers Available</h2>
            <p className="text-muted-foreground mb-4">
              {isAdmin ? "Upload questions to create new papers automatically" : "Contact an administrator to add questions"}
            </p>
            {isAdmin && (
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Questions
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map((paper) => (
              <Card key={paper.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{paper.paper_name}</CardTitle>
                  <CardDescription>
                    {paper.questionCount} question{paper.questionCount !== 1 ? 's' : ''} available
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => onSelectPaper(paper.paper_name)}
                    disabled={paper.questionCount === 0}
                  >
                    {paper.questionCount === 0 ? 'No Questions' : 'Start Quiz'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};